import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearProblema, crearOcurrencia, crearSolucion, haceDias } from '../ayudas.js';

test('RN-22 el historial une ocurrencias, soluciones, evaluaciones y cambios de estado, del más reciente al más antiguo', async () => {
  const ctx = crearContexto();
  const { api } = ctx;
  const problema = await crearProblema(api);
  await crearOcurrencia(api, problema.id, 20, { descripcion: 'Primera vez' });
  await crearOcurrencia(api, problema.id, 15, { descripcion: 'Segunda vez' });
  await crearSolucion(api, problema.id, { dias: 10, nombre: 'Alarma antes', resultado: 'FUNCIONO' });
  ctx.reloj.fijar(haceDias(-1));
  await api.patch(`/api/problemas/${problema.id}/estado`).send({ estado: 'SOLUCIONADO' });

  const res = await api.get(`/api/problemas/${problema.id}/historial`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((e) => e.tipo), [
    'CAMBIO_ESTADO', 'SOLUCION_EVALUADA', 'SOLUCION_APLICADA', 'OCURRENCIA', 'OCURRENCIA',
  ]);
  assert.equal(res.body[0].estadoNuevo, 'SOLUCIONADO');
  assert.equal(res.body[1].resultado, 'FUNCIONO');
  assert.equal(res.body[2].nombre, 'Alarma antes');
  assert.equal(res.body[3].descripcion, 'Segunda vez');
  assert.equal(res.body[4].fecha, haceDias(20));
});

test('RN-22 una recaída aparece en el historial con su motivo', async () => {
  const ctx = crearContexto();
  const { api } = ctx;
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await api.patch(`/api/problemas/${problema.id}/estado`).send({ estado: 'SOLUCIONADO' });
  ctx.reloj.fijar(haceDias(-2));
  await api.post(`/api/problemas/${problema.id}/ocurrencias`)
    .send({ fecha: haceDias(-1), descripcion: 'Volvió a pasar', gravedad: 2 });

  const historial = (await api.get(`/api/problemas/${problema.id}/historial`)).body;
  assert.equal(historial[0].tipo, 'CAMBIO_ESTADO');
  assert.equal(historial[0].motivo, 'RECAIDA');
  assert.equal(historial[1].tipo, 'OCURRENCIA');
});

test('RN-22 un problema sin registros tiene historial vacío y uno inexistente da 404', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  assert.deepEqual((await api.get(`/api/problemas/${problema.id}/historial`)).body, []);
  assert.equal((await api.get('/api/problemas/999/historial')).status, 404);
});
