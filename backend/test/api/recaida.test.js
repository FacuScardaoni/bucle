import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearProblema, crearOcurrencia, crearSolucion, haceDias } from '../ayudas.js';

// Problema SOLUCIONADO "ahora" (con una ocurrencia de hace 20 días y una solución que funcionó).
async function problemaSolucionado(ctx) {
  const problema = await crearProblema(ctx.api);
  const vieja = await crearOcurrencia(ctx.api, problema.id, 20);
  await crearSolucion(ctx.api, problema.id, { resultado: 'FUNCIONO' });
  await ctx.api.patch(`/api/problemas/${problema.id}/estado`).send({ estado: 'SOLUCIONADO' });
  return { problema, vieja };
}

test('RN-10 una ocurrencia posterior al cambio a SOLUCIONADO reactiva el problema', async () => {
  const ctx = crearContexto();
  const { problema } = await problemaSolucionado(ctx);
  ctx.reloj.fijar(haceDias(-3)); // pasan 3 días
  const res = await ctx.api.post(`/api/problemas/${problema.id}/ocurrencias`)
    .send({ fecha: haceDias(-2), descripcion: 'Volví a llegar tarde', gravedad: 3 });
  assert.equal(res.status, 201);
  assert.equal(res.body.recaida, true);

  const detalle = (await ctx.api.get(`/api/problemas/${problema.id}`)).body;
  assert.equal(detalle.estado, 'ACTIVO');
  const cambios = await ctx.repos.cambiosEstado.listar({ problemaId: problema.id });
  assert.deepEqual(cambios.at(-1).motivo, 'RECAIDA');
  assert.deepEqual([cambios.at(-1).estadoAnterior, cambios.at(-1).estadoNuevo], ['SOLUCIONADO', 'ACTIVO']);
});

test('RN-10 una carga retroactiva (fecha anterior al cambio) no cambia el estado', async () => {
  const ctx = crearContexto();
  const { problema } = await problemaSolucionado(ctx);
  ctx.reloj.fijar(haceDias(-3));
  const res = await crearOcurrencia(ctx.api, problema.id, 2); // 2 días antes del AHORA original
  assert.equal(res.recaida, false);
  assert.equal((await ctx.api.get(`/api/problemas/${problema.id}`)).body.estado, 'SOLUCIONADO');
});

test('RN-10 editar la fecha de una ocurrencia a después del cambio también es recaída', async () => {
  const ctx = crearContexto();
  const { problema, vieja } = await problemaSolucionado(ctx);
  ctx.reloj.fijar(haceDias(-3));
  const res = await ctx.api.put(`/api/ocurrencias/${vieja.id}`)
    .send({ fecha: haceDias(-1), descripcion: 'En realidad fue ayer', gravedad: 2 });
  assert.equal(res.status, 200);
  assert.equal(res.body.recaida, true);
  assert.equal((await ctx.api.get(`/api/problemas/${problema.id}`)).body.estado, 'ACTIVO');
});

test('RN-10 en un problema CONTROLADO una ocurrencia no cambia el estado', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearSolucion(api, problema.id, { resultado: 'PARCIAL' });
  await api.patch(`/api/problemas/${problema.id}/estado`).send({ estado: 'CONTROLADO' });
  const res = await crearOcurrencia(api, problema.id, 0);
  assert.equal(res.recaida, false);
  assert.equal((await api.get(`/api/problemas/${problema.id}`)).body.estado, 'CONTROLADO');
});
