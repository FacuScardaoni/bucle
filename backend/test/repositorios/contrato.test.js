// Contrato de repositorios: las implementaciones de memoria y PostgreSQL deben comportarse igual.
// La parte de PostgreSQL se ejecuta solo si está definida DATABASE_URL_TEST (ver README).
// ATENCIÓN: esa base se vacía en cada ejecución. Nunca usar la base de producción.
import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { crearRepositoriosMemoria } from '../../src/repositorios/memoria/index.js';
import { crearRepositoriosPostgres, crearPool, inicializarEsquema } from '../../src/repositorios/postgres/index.js';
import { crearServicios } from '../../src/servicios/index.js';
import { crearApp } from '../../src/app.js';
import { crearRelojFijo, crearRelojSistema } from '../../src/dominio/reloj.js';
import { verificarConsistencia } from '../../src/dominio/estados.js';

const URL_PRUEBA = process.env.DATABASE_URL_TEST;

function definirContrato(nombre, { crearRepos, limpiar, conRollback }) {
  describe(`Contrato de repositorios: ${nombre}`, () => {
    let repos;
    beforeEach(async () => {
      await limpiar?.();
      repos = await crearRepos();
    });

    async function problemaDePrueba() {
      const cat = await repos.categorias.crear({ nombre: 'Olvidos', nombreNormalizado: 'olvidos', descripcion: null });
      return repos.problemas.crear({
        nombre: 'Olvidar llaves', nombreNormalizado: 'olvidar llaves', descripcion: null, categoriaId: cat.id,
        estado: 'ACTIVO', fechaCreacion: new Date('2026-11-01T10:00:00Z'), fechaEstado: new Date('2026-11-01T10:00:00Z'),
      });
    }

    test('crear, obtener, listar con filtro, actualizar y eliminar', async () => {
      const a = await repos.categorias.crear({ nombre: 'Uno', nombreNormalizado: 'uno', descripcion: null });
      const b = await repos.categorias.crear({ nombre: 'Dos', nombreNormalizado: 'dos', descripcion: 'x' });
      assert.ok(Number.isInteger(a.id) && b.id > a.id);
      assert.deepEqual(await repos.categorias.obtener(b.id), { id: b.id, nombre: 'Dos', nombreNormalizado: 'dos', descripcion: 'x' });
      assert.deepEqual((await repos.categorias.listar({ nombreNormalizado: 'uno' })).map((c) => c.id), [a.id]);
      const actualizada = await repos.categorias.actualizar(a.id, { descripcion: 'nueva' });
      assert.equal(actualizada.nombre, 'Uno');
      assert.equal(actualizada.descripcion, 'nueva');
      assert.equal(await repos.categorias.eliminar(a.id), true);
      assert.deepEqual((await repos.categorias.listar()).map((c) => c.id), [b.id]);
    });

    test('registros inexistentes: obtener → null, actualizar → null, eliminar → false', async () => {
      assert.equal(await repos.categorias.obtener(9999), null);
      assert.equal(await repos.categorias.actualizar(9999, { descripcion: 'x' }), null);
      assert.equal(await repos.categorias.eliminar(9999), false);
    });

    test('tipos: fecha y hora como Date, fecha de calendario como texto, gravedad como número', async () => {
      const p = await problemaDePrueba();
      const o = await repos.ocurrencias.crear({
        problemaId: p.id, fecha: new Date('2026-11-10T12:30:00Z'), descripcion: 'Pasó', contexto: null, posibleCausa: null, gravedad: 4,
      });
      const s = await repos.soluciones.crear({
        problemaId: p.id, nombre: 'Gancho', nombreNormalizado: 'gancho', descripcion: null, fechaAplicacion: '2026-11-05',
        resultado: 'PENDIENTE', observaciones: null, fechaEvaluacion: null,
      });
      const leida = await repos.ocurrencias.obtener(o.id);
      assert.ok(leida.fecha instanceof Date);
      assert.equal(leida.fecha.toISOString(), '2026-11-10T12:30:00.000Z');
      assert.equal(leida.gravedad, 4);
      assert.equal((await repos.soluciones.obtener(s.id)).fechaAplicacion, '2026-11-05');
      assert.ok((await repos.problemas.obtener(p.id)).fechaEstado instanceof Date);
    });

    test('eliminar un problema borra sus ocurrencias, soluciones y cambios de estado', async () => {
      const p = await problemaDePrueba();
      await repos.ocurrencias.crear({ problemaId: p.id, fecha: new Date(), descripcion: 'x', contexto: null, posibleCausa: null, gravedad: 1 });
      await repos.cambiosEstado.crear({ problemaId: p.id, estadoAnterior: 'ACTIVO', estadoNuevo: 'CONTROLADO', motivo: 'MANUAL', fecha: new Date() });
      await repos.problemas.eliminar(p.id);
      assert.equal((await repos.ocurrencias.listar({ problemaId: p.id })).length, 0);
      assert.equal((await repos.cambiosEstado.listar({ problemaId: p.id })).length, 0);
    });

    test('la transacción devuelve el resultado de la operación', async () => {
      const resultado = await repos.transaccion(async (r) =>
        r.categorias.crear({ nombre: 'Tx', nombreNormalizado: 'tx', descripcion: null }));
      assert.equal((await repos.categorias.obtener(resultado.id)).nombre, 'Tx');
    });

    if (conRollback) {
      test('si la operación falla, la transacción no guarda nada', async () => {
        await assert.rejects(repos.transaccion(async (r) => {
          await r.categorias.crear({ nombre: 'Temporal', nombreNormalizado: 'temporal', descripcion: null });
          throw new Error('falla a propósito');
        }));
        assert.equal((await repos.categorias.listar({ nombreNormalizado: 'temporal' })).length, 0);
      });
    }
  });
}

definirContrato('memoria', { crearRepos: () => crearRepositoriosMemoria(), conRollback: false });

describe('PostgreSQL', { skip: !URL_PRUEBA && 'definí DATABASE_URL_TEST para probar contra PostgreSQL' }, () => {
  let pool;
  const vaciar = async () => {
    await pool.query('DROP TABLE IF EXISTS cambios_estado, soluciones, ocurrencias, problemas, categorias CASCADE');
    await inicializarEsquema(pool);
  };
  before(() => { pool = crearPool(URL_PRUEBA); });
  after(() => pool.end());

  definirContrato('PostgreSQL', { crearRepos: () => crearRepositoriosPostgres(pool), limpiar: vaciar, conRollback: true });

  test('PostgreSQL: un nombre duplicado que llega a la base se convierte en error 409', async () => {
    await vaciar();
    const repos = crearRepositoriosPostgres(pool);
    await repos.categorias.crear({ nombre: 'A', nombreNormalizado: 'a', descripcion: null });
    await assert.rejects(repos.categorias.crear({ nombre: 'A', nombreNormalizado: 'a', descripcion: null }),
      (err) => err.codigo === 'CONFLICTO' && err.status === 409);
  });

  test('PostgreSQL: recorrido completo de la API (categoría → problema → ocurrencias → solución → estados → historial → borrado)', async () => {
    await vaciar();
    const reloj = crearRelojFijo('2026-11-20T15:00:00Z');
    const api = request(crearApp({ servicios: crearServicios({ repos: crearRepositoriosPostgres(pool), reloj }) }));

    const cat = (await api.post('/api/categorias').send({ nombre: 'Puntualidad' })).body;
    const prob = (await api.post('/api/problemas').send({ nombre: 'Llegar tarde', categoriaId: cat.id })).body;
    assert.equal((await api.post('/api/problemas').send({ nombre: 'LLEGAR TARDE', categoriaId: cat.id })).status, 409);
    for (const dia of ['2026-10-20', '2026-10-25', '2026-10-30']) {
      const r = await api.post(`/api/problemas/${prob.id}/ocurrencias`).send({ fecha: `${dia}T09:30:00-03:00`, descripcion: 'Tarde', gravedad: 3 });
      assert.equal(r.status, 201);
    }
    const sol = (await api.post(`/api/problemas/${prob.id}/soluciones`).send({ nombre: 'Alarma antes', fechaAplicacion: '2026-11-01' })).body;
    assert.equal((await api.patch(`/api/soluciones/${sol.id}/evaluacion`).send({ resultado: 'FUNCIONO' })).status, 200);
    assert.equal((await api.patch(`/api/problemas/${prob.id}/estado`).send({ estado: 'SOLUCIONADO' })).status, 200);

    reloj.fijar('2026-11-22T15:00:00Z');
    const recaida = await api.post(`/api/problemas/${prob.id}/ocurrencias`).send({ fecha: '2026-11-22T09:00:00-03:00', descripcion: 'Otra vez', gravedad: 4 });
    assert.equal(recaida.body.recaida, true);
    const detalle = (await api.get(`/api/problemas/${prob.id}`)).body;
    assert.equal(detalle.estado, 'ACTIVO');
    assert.equal(detalle.cantidadOcurrencias, 4);

    const historial = (await api.get(`/api/problemas/${prob.id}/historial`)).body;
    assert.equal(historial[0].motivo, 'RECAIDA');
    const soluciones = (await api.get(`/api/problemas/${prob.id}/soluciones`)).body;
    assert.equal(soluciones[0].efectividad.estado, 'CALCULADA');
    assert.equal((await api.get(`/api/problemas?q=tarde&estado=ACTIVO`)).body.length, 1);
    assert.equal((await api.delete(`/api/categorias/${cat.id}`)).status, 409);
    assert.equal((await api.delete(`/api/problemas/${prob.id}`)).status, 409);
    assert.equal((await api.delete(`/api/problemas/${prob.id}?confirmar=true`)).status, 204);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM ocurrencias')).rows[0].n, 0);
  });

  test('PostgreSQL: los datos de demostración (seed.sql) respetan las reglas de negocio', async () => {
    await vaciar();
    await pool.query(await readFile(new URL('../../db/seed.sql', import.meta.url), 'utf8'));
    const repos = crearRepositoriosPostgres(pool);
    const servicios = crearServicios({ repos, reloj: crearRelojSistema() });

    const problemas = await servicios.problemas.listar();
    assert.equal(problemas.length, 5);
    const porNombre = Object.fromEntries(problemas.map((p) => [p.nombre, p]));
    assert.equal(porNombre['Llegar tarde al trabajo'].prioridad, 'ALTA');
    assert.equal(porNombre['Olvidar la billetera'].estado, 'CONTROLADO');
    assert.equal(porNombre['Usar el celular antes de dormir'].estado, 'SOLUCIONADO');
    assert.equal(porNombre['Olvidar responder mensajes importantes'].prioridad, 'BAJA');

    for (const p of problemas) {
      const soluciones = await repos.soluciones.listar({ problemaId: p.id });
      assert.doesNotThrow(() => verificarConsistencia(p.estado, soluciones), p.nombre);
      assert.ok(!p.fechaUltimaOcurrencia || p.fechaUltimaOcurrencia <= new Date(), p.nombre);
    }
    const billetera = await servicios.soluciones.listarPorProblema(porNombre['Olvidar la billetera'].id);
    assert.equal(billetera[0].efectividad.estado, 'CALCULADA');
    assert.ok(billetera[0].efectividad.mejoraPorcentaje > 50);
  });
});
