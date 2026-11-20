import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearProblema, crearOcurrencia, crearSolucion } from '../ayudas.js';

test('RN-18 un problema sin registros asociados se elimina sin confirmación', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  assert.equal((await api.delete(`/api/problemas/${problema.id}`)).status, 204);
  assert.equal((await api.get(`/api/problemas/${problema.id}`)).status, 404);
});

test('RN-18 sin confirmación responde 409 indicando cuántos registros se borrarían', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearOcurrencia(api, problema.id, 1);
  await crearOcurrencia(api, problema.id, 2);
  await crearSolucion(api, problema.id);
  const res = await api.delete(`/api/problemas/${problema.id}`);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-18');
  assert.deepEqual(res.body.error.detalles, { ocurrencias: 2, soluciones: 1, cambiosEstado: 0 });
  assert.equal((await api.get(`/api/problemas/${problema.id}`)).status, 200);
});

test('RN-18 con confirmación borra el problema y todos sus registros asociados', async () => {
  const { api, repos } = crearContexto();
  const problema = await crearProblema(api);
  const otro = await crearProblema(api, { nombre: 'Otro problema' });
  await crearOcurrencia(api, problema.id, 1);
  await crearOcurrencia(api, otro.id, 1);
  await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await api.patch(`/api/problemas/${problema.id}/estado`).send({ estado: 'CONTROLADO' });

  const res = await api.delete(`/api/problemas/${problema.id}?confirmar=true`);
  assert.equal(res.status, 204);
  assert.equal((await repos.ocurrencias.listar({ problemaId: problema.id })).length, 0);
  assert.equal((await repos.soluciones.listar({ problemaId: problema.id })).length, 0);
  assert.equal((await repos.cambiosEstado.listar({ problemaId: problema.id })).length, 0);
  assert.equal((await repos.ocurrencias.listar({ problemaId: otro.id })).length, 1);
});

test('RN-18 eliminar un problema inexistente responde 404', async () => {
  const { api } = crearContexto();
  assert.equal((await api.delete('/api/problemas/999?confirmar=true')).status, 404);
});
