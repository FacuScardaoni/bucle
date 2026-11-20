import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearCategoria, crearOcurrencia, crearSolucion } from '../ayudas.js';

// Datos de ejemplo:
//  - "Llegar tarde al trabajo" (Puntualidad): 5 ocurrencias → ALTA
//  - "Olvidar la billetera" (Olvidos, descripción "...el café..."): 2 ocurrencias → MEDIA, CONTROLADO
//  - "Gastar de más en delivery" (Finanzas): 1 ocurrencia hace 3 días → BAJA
//  - "Olvidar cumpleaños" (Olvidos): 1 ocurrencia hace 1 día → BAJA
async function preparar() {
  const ctx = crearContexto();
  const { api } = ctx;
  const puntualidad = await crearCategoria(api, 'Puntualidad');
  const olvidos = await crearCategoria(api, 'Olvidos');
  const finanzas = await crearCategoria(api, 'Finanzas');
  const crear = async (nombre, categoriaId, descripcion) =>
    (await api.post('/api/problemas').send({ nombre, categoriaId, descripcion })).body;

  const tarde = await crear('Llegar tarde al trabajo', puntualidad.id);
  for (let i = 1; i <= 5; i++) await crearOcurrencia(api, tarde.id, i * 2);
  const billetera = await crear('Olvidar la billetera', olvidos.id, 'Siempre cuando voy al café');
  await crearOcurrencia(api, billetera.id, 4);
  await crearOcurrencia(api, billetera.id, 6);
  await crearSolucion(api, billetera.id, { resultado: 'FUNCIONO' });
  await api.patch(`/api/problemas/${billetera.id}/estado`).send({ estado: 'CONTROLADO' });
  const delivery = await crear('Gastar de más en delivery', finanzas.id);
  await crearOcurrencia(api, delivery.id, 3);
  const cumple = await crear('Olvidar cumpleaños', olvidos.id);
  await crearOcurrencia(api, cumple.id, 1);
  return { ...ctx, categorias: { puntualidad, olvidos, finanzas } };
}

const nombres = (res) => res.body.map((p) => p.nombre);

test('RN-19 sin filtros ordena por prioridad y luego por ocurrencia más reciente', async () => {
  const { api } = await preparar();
  const res = await api.get('/api/problemas');
  assert.equal(res.status, 200);
  assert.deepEqual(nombres(res), [
    'Llegar tarde al trabajo', 'Olvidar la billetera', 'Olvidar cumpleaños', 'Gastar de más en delivery',
  ]);
});

test('RN-19 busca en nombre y descripción sin distinguir mayúsculas ni acentos', async () => {
  const { api } = await preparar();
  assert.deepEqual(nombres(await api.get('/api/problemas?q=OLVIDAR')), ['Olvidar la billetera', 'Olvidar cumpleaños']);
  assert.deepEqual(nombres(await api.get('/api/problemas?q=cafe')), ['Olvidar la billetera']);
  assert.deepEqual(nombres(await api.get('/api/problemas?q=cumpleanos')), ['Olvidar cumpleaños']);
});

test('RN-19 filtra por categoría, estado y prioridad', async () => {
  const { api, categorias } = await preparar();
  assert.deepEqual(nombres(await api.get(`/api/problemas?categoria=${categorias.finanzas.id}`)), ['Gastar de más en delivery']);
  assert.deepEqual(nombres(await api.get('/api/problemas?estado=CONTROLADO')), ['Olvidar la billetera']);
  assert.deepEqual(nombres(await api.get('/api/problemas?prioridad=ALTA')), ['Llegar tarde al trabajo']);
});

test('RN-19 los filtros se combinan entre sí y con la búsqueda', async () => {
  const { api, categorias } = await preparar();
  const res = await api.get(`/api/problemas?q=olvidar&categoria=${categorias.olvidos.id}&prioridad=BAJA&estado=ACTIVO`);
  assert.deepEqual(nombres(res), ['Olvidar cumpleaños']);
});

test('RN-19 sin resultados devuelve una lista vacía con 200', async () => {
  const { api } = await preparar();
  const res = await api.get('/api/problemas?q=inexistente');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('RN-19 la búsqueda debe tener al menos 2 caracteres (vacía = sin búsqueda)', async () => {
  const { api } = await preparar();
  const corta = await api.get('/api/problemas?q=a');
  assert.equal(corta.status, 400);
  assert.equal(corta.body.error.regla, 'RN-19');
  assert.equal((await api.get('/api/problemas?q=')).body.length, 4);
});

test('RN-19 un valor de filtro inexistente da error 400', async () => {
  const { api } = await preparar();
  for (const query of ['estado=TERMINADO', 'prioridad=URGENTE', 'categoria=999', 'categoria=abc', 'estado=ACTIVO&estado=CONTROLADO']) {
    const res = await api.get(`/api/problemas?${query}`);
    assert.equal(res.status, 400, query);
    assert.equal(res.body.error.regla, 'RN-19');
  }
});
