import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearProblema, crearOcurrencia, crearSolucion, AHORA } from '../ayudas.js';

const cambiar = (api, id, estado) => api.patch(`/api/problemas/${id}/estado`).send({ estado });

test('RN-14 no puede pasar a CONTROLADO sin una solución FUNCIONO o PARCIAL', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id); // PENDIENTE
  await crearSolucion(api, problema.id, { resultado: 'NO_FUNCIONO' });
  const res = await cambiar(api, problema.id, 'CONTROLADO');
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-14');
});

test('RN-14 pasa a CONTROLADO con una solución PARCIAL', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id, { resultado: 'PARCIAL' });
  const res = await cambiar(api, problema.id, 'CONTROLADO');
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, 'CONTROLADO');
  assert.equal(res.body.fechaEstado, AHORA);
});

test('RN-15 no puede pasar a SOLUCIONADO sin una solución FUNCIONO', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id, { resultado: 'PARCIAL' });
  const res = await cambiar(api, problema.id, 'SOLUCIONADO');
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-15');
  assert.equal(res.body.error.detalles.faltan.length, 1);
});

test('RN-15 no puede pasar a SOLUCIONADO con ocurrencias en los últimos 14 días', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await crearOcurrencia(api, problema.id, 13);
  const res = await cambiar(api, problema.id, 'SOLUCIONADO');
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-15');
  assert.match(res.body.error.mensaje, /14 días/);
});

test('RN-15 indica todas las condiciones que faltan', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearOcurrencia(api, problema.id, 3);
  const res = await cambiar(api, problema.id, 'SOLUCIONADO');
  assert.equal(res.status, 409);
  assert.equal(res.body.error.detalles.faltan.length, 2);
});

test('RN-15 pasa a SOLUCIONADO con una solución FUNCIONO y 14 días sin ocurrencias', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearOcurrencia(api, problema.id, 15);
  await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  const res = await cambiar(api, problema.id, 'SOLUCIONADO');
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, 'SOLUCIONADO');
});

test('RN-16 volver a ACTIVO siempre está permitido', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await cambiar(api, problema.id, 'CONTROLADO');
  const res = await cambiar(api, problema.id, 'ACTIVO');
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, 'ACTIVO');
});

test('RN-16 no se puede cambiar al estado actual ni a un estado inexistente', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  for (const estado of ['ACTIVO', 'TERMINADO', undefined]) {
    const res = await cambiar(api, problema.id, estado);
    assert.equal(res.status, 400);
    assert.equal(res.body.error.regla, 'RN-16');
  }
});

test('RN-16 cada cambio de estado queda registrado con motivo MANUAL', async () => {
  const { api, repos } = crearContexto();
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await cambiar(api, problema.id, 'CONTROLADO');
  await cambiar(api, problema.id, 'ACTIVO');
  const cambios = await repos.cambiosEstado.listar({ problemaId: problema.id });
  assert.deepEqual(cambios.map((c) => [c.estadoAnterior, c.estadoNuevo, c.motivo]), [
    ['ACTIVO', 'CONTROLADO', 'MANUAL'],
    ['CONTROLADO', 'ACTIVO', 'MANUAL'],
  ]);
});

test('RN-17 no se puede eliminar la solución que sostiene el estado CONTROLADO', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const solucion = await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await cambiar(api, problema.id, 'CONTROLADO');
  const res = await api.delete(`/api/soluciones/${solucion.id}`);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-17');
});

test('RN-17 no se puede reevaluar como NO_FUNCIONO la única solución de un problema SOLUCIONADO', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const solucion = await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await cambiar(api, problema.id, 'SOLUCIONADO');
  const res = await api.patch(`/api/soluciones/${solucion.id}/evaluacion`)
    .send({ resultado: 'NO_FUNCIONO', observaciones: 'Dejó de funcionar al mes' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-17');
});

test('RN-17 sí se puede eliminar o reevaluar si otra solución sigue sosteniendo el estado', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const a = await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  const b = await crearSolucion(api, problema.id, { resultado: 'FUNCIONO' });
  await cambiar(api, problema.id, 'SOLUCIONADO');
  const reevaluada = await api.patch(`/api/soluciones/${a.id}/evaluacion`)
    .send({ resultado: 'PARCIAL', observaciones: 'Funciona solo algunos días' });
  assert.equal(reevaluada.status, 200);
  const otra = await crearSolucion(api, problema.id); // PENDIENTE, no sostiene nada
  assert.equal((await api.delete(`/api/soluciones/${otra.id}`)).status, 204);
  assert.equal((await api.delete(`/api/soluciones/${b.id}`)).status, 409);
});
