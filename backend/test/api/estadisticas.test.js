import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearProblema, crearOcurrencia, crearSolucion } from '../ayudas.js';

test('F-10 las soluciones se listan con su efectividad calculada (RN-20)', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  for (const dias of [31, 35, 40, 45]) await crearOcurrencia(api, problema.id, dias);
  await crearOcurrencia(api, problema.id, 10);
  await crearSolucion(api, problema.id, { dias: 30, resultado: 'FUNCIONO' });
  await crearSolucion(api, problema.id, { dias: 2 });

  const lista = (await api.get(`/api/problemas/${problema.id}/soluciones`)).body;
  assert.equal(lista[0].efectividad.estado, 'EN_OBSERVACION');
  assert.equal(lista[1].efectividad.estado, 'CALCULADA');
  assert.equal(lista[1].efectividad.mejoraPorcentaje, 75);
});

test('RN-21 GET /problemas/:id/estadisticas devuelve las estadísticas del problema', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearOcurrencia(api, problema.id, 1, { gravedad: 2 });
  await crearOcurrencia(api, problema.id, 8, { gravedad: 4 });
  const res = await api.get(`/api/problemas/${problema.id}/estadisticas`);
  assert.equal(res.status, 200);
  assert.equal(res.body.totalOcurrencias, 2);
  assert.equal(res.body.gravedadPromedio, 3);
  assert.equal(res.body.diaMasFrecuente.dia, 'jueves');
  assert.equal((await api.get('/api/problemas/999/estadisticas')).status, 404);
});

test('RN-21 GET /estadisticas devuelve el resumen general', async () => {
  const { api } = crearContexto();
  const a = await crearProblema(api, { nombre: 'Llegar tarde' });
  await crearProblema(api, { nombre: 'Olvidar las llaves', categoriaId: a.categoriaId });
  await crearOcurrencia(api, a.id, 3);
  const res = await api.get('/api/estadisticas');
  assert.equal(res.status, 200);
  assert.equal(res.body.totalProblemas, 2);
  assert.equal(res.body.porEstado.ACTIVO, 2);
  assert.equal(res.body.porCategoria[0].cantidad, 2);
  assert.deepEqual(res.body.masFrecuentes.map((p) => p.nombre), ['Llegar tarde']);
});
