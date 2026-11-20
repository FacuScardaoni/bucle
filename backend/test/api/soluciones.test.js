import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearProblema, crearSolucion, diaRelativo, AHORA } from '../ayudas.js';

const nueva = (extra = {}) => ({ nombre: 'Poner la alarma 20 minutos antes', fechaAplicacion: diaRelativo(-10), ...extra });

test('F-05 registra, lista, edita y elimina soluciones', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const creada = await api.post(`/api/problemas/${problema.id}/soluciones`).send(nueva({ descripcion: 'Alarma 6:40' }));
  assert.equal(creada.status, 201);
  assert.equal(creada.body.nombreNormalizado, undefined);

  const editada = await api.put(`/api/soluciones/${creada.body.id}`).send(nueva({ nombre: 'Alarma 30 minutos antes' }));
  assert.equal(editada.status, 200);
  assert.equal(editada.body.nombre, 'Alarma 30 minutos antes');

  const lista = await api.get(`/api/problemas/${problema.id}/soluciones`);
  assert.equal(lista.body.length, 1);

  assert.equal((await api.delete(`/api/soluciones/${creada.body.id}`)).status, 204);
  assert.equal((await api.get(`/api/problemas/${problema.id}/soluciones`)).body.length, 0);
});

test('RN-11 el nombre es obligatorio (3 a 80) y la fecha de aplicación es obligatoria y válida', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const casos = [
    [{ nombre: 'ab' }, 'nombre'],
    [{ nombre: undefined }, 'nombre'],
    [{ fechaAplicacion: undefined }, 'fechaAplicacion'],
    [{ fechaAplicacion: '2026-13-01' }, 'fechaAplicacion'],
  ];
  for (const [extra, campo] of casos) {
    const res = await api.post(`/api/problemas/${problema.id}/soluciones`).send(nueva(extra));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.campo, campo);
    assert.equal(res.body.error.regla, 'RN-11');
  }
});

test('RN-11 el nombre no se repite dentro del mismo problema, pero sí en otro', async () => {
  const { api } = crearContexto();
  const p1 = await crearProblema(api, { nombre: 'Llegar tarde' });
  const p2 = await crearProblema(api, { nombre: 'Olvidar las llaves' });
  await api.post(`/api/problemas/${p1.id}/soluciones`).send(nueva({ nombre: 'Usar agenda' }));
  const repetida = await api.post(`/api/problemas/${p1.id}/soluciones`).send(nueva({ nombre: 'USAR AGENDA' }));
  assert.equal(repetida.status, 409);
  assert.equal(repetida.body.error.regla, 'RN-11');
  const enOtro = await api.post(`/api/problemas/${p2.id}/soluciones`).send(nueva({ nombre: 'Usar agenda' }));
  assert.equal(enOtro.status, 201);
});

test('RN-11 la fecha de aplicación puede ser futura (solución planificada)', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const res = await api.post(`/api/problemas/${problema.id}/soluciones`).send(nueva({ fechaAplicacion: diaRelativo(7) }));
  assert.equal(res.status, 201);
});

test('RN-12 toda solución se crea PENDIENTE aunque el cliente envíe otro resultado', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const res = await api.post(`/api/problemas/${problema.id}/soluciones`).send(nueva({ resultado: 'FUNCIONO' }));
  assert.equal(res.body.resultado, 'PENDIENTE');
  assert.equal(res.body.fechaEvaluacion, null);
});

test('RN-13 evaluar como FUNCIONO guarda el resultado y la fecha de evaluación', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const solucion = await crearSolucion(api, problema.id);
  const res = await api.patch(`/api/soluciones/${solucion.id}/evaluacion`).send({ resultado: 'FUNCIONO' });
  assert.equal(res.status, 200);
  assert.equal(res.body.resultado, 'FUNCIONO');
  assert.equal(res.body.fechaEvaluacion, AHORA);
});

test('RN-13 el resultado debe ser FUNCIONO, PARCIAL o NO_FUNCIONO (no PENDIENTE)', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const solucion = await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  for (const resultado of ['PENDIENTE', 'BIEN', undefined]) {
    const res = await api.patch(`/api/soluciones/${solucion.id}/evaluacion`).send({ resultado });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.regla, 'RN-13');
    assert.equal(res.body.error.campo, 'resultado');
  }
});

test('RN-13 no se puede evaluar una solución cuya fecha de aplicación no llegó', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const planificada = await crearSolucion(api, problema.id, { dias: -3 });
  const res = await api.patch(`/api/soluciones/${planificada.id}/evaluacion`).send({ resultado: 'FUNCIONO' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.regla, 'RN-13');
});

test('RN-13 una solución aplicada hoy ya se puede evaluar', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const deHoy = await crearSolucion(api, problema.id, { dias: 0 });
  const res = await api.patch(`/api/soluciones/${deHoy.id}/evaluacion`).send({ resultado: 'FUNCIONO' });
  assert.equal(res.status, 200);
});

test('RN-13 PARCIAL o NO_FUNCIONO requieren observaciones de al menos 10 caracteres', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const solucion = await crearSolucion(api, problema.id);
  for (const resultado of ['PARCIAL', 'NO_FUNCIONO']) {
    for (const observaciones of [undefined, '   ', 'corto']) {
      const res = await api.patch(`/api/soluciones/${solucion.id}/evaluacion`).send({ resultado, observaciones });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.campo, 'observaciones');
    }
  }
  const ok = await api.patch(`/api/soluciones/${solucion.id}/evaluacion`)
    .send({ resultado: 'NO_FUNCIONO', observaciones: 'Apagaba la alarma y seguía durmiendo' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.observaciones, 'Apagaba la alarma y seguía durmiendo');
});

test('RN-13 una solución evaluada no puede pasar a tener fecha de aplicación futura', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const solucion = await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  const res = await api.put(`/api/soluciones/${solucion.id}`).send(nueva({ fechaAplicacion: diaRelativo(5) }));
  assert.equal(res.status, 400);
  assert.equal(res.body.error.regla, 'RN-13');
});

test('editar, evaluar o eliminar una solución inexistente responde 404', async () => {
  const { api } = crearContexto();
  assert.equal((await api.put('/api/soluciones/999').send(nueva())).status, 404);
  assert.equal((await api.patch('/api/soluciones/999/evaluacion').send({ resultado: 'FUNCIONO' })).status, 404);
  assert.equal((await api.delete('/api/soluciones/999')).status, 404);
  assert.equal((await api.post('/api/problemas/999/soluciones').send(nueva())).status, 404);
});
