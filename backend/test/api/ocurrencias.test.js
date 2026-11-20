import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearProblema, crearOcurrencia, haceDias } from '../ayudas.js';

const valida = (extra = {}) => ({ fecha: haceDias(1), descripcion: 'Llegué 15 minutos tarde', gravedad: 3, ...extra });

test('F-04 registra, lista, edita y elimina ocurrencias', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const creada = await api.post(`/api/problemas/${problema.id}/ocurrencias`)
    .send(valida({ contexto: 'Lluvia', posibleCausa: 'Salí tarde', gravedad: '2' }));
  assert.equal(creada.status, 201);
  assert.equal(creada.body.gravedad, 2);
  assert.equal(creada.body.problemaId, problema.id);

  const editada = await api.put(`/api/ocurrencias/${creada.body.id}`).send(valida({ descripcion: 'Llegué 30 min tarde' }));
  assert.equal(editada.status, 200);
  assert.equal(editada.body.descripcion, 'Llegué 30 min tarde');
  assert.equal(editada.body.contexto, null);

  assert.equal((await api.delete(`/api/ocurrencias/${creada.body.id}`)).status, 204);
  assert.equal((await api.get(`/api/problemas/${problema.id}/ocurrencias`)).body.length, 0);
});

test('F-04 las ocurrencias se listan de la más reciente a la más antigua', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  await crearOcurrencia(api, problema.id, 5);
  await crearOcurrencia(api, problema.id, 1);
  await crearOcurrencia(api, problema.id, 3);
  const lista = (await api.get(`/api/problemas/${problema.id}/ocurrencias`)).body;
  assert.deepEqual(lista.map((o) => o.fecha), [haceDias(1), haceDias(3), haceDias(5)]);
});

test('RN-09 la ocurrencia debe pertenecer a un problema existente', async () => {
  const { api } = crearContexto();
  const res = await api.post('/api/problemas/999/ocurrencias').send(valida());
  assert.equal(res.status, 404);
});

test('RN-09 la fecha es obligatoria, válida y no futura', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  for (const fecha of [undefined, 'ayer', haceDias(-1)]) {
    const res = await api.post(`/api/problemas/${problema.id}/ocurrencias`).send(valida({ fecha }));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.campo, 'fecha');
    assert.equal(res.body.error.regla, 'RN-09');
  }
});

test('RN-09 la descripción es obligatoria (3 a 300) y la gravedad es un entero de 1 a 5', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const casos = [
    [{ descripcion: '  ' }, 'descripcion'],
    [{ descripcion: 'x'.repeat(301) }, 'descripcion'],
    [{ gravedad: 0 }, 'gravedad'],
    [{ gravedad: 6 }, 'gravedad'],
    [{ gravedad: 'abc' }, 'gravedad'],
    [{ gravedad: undefined }, 'gravedad'],
  ];
  for (const [extra, campo] of casos) {
    const res = await api.post(`/api/problemas/${problema.id}/ocurrencias`).send(valida(extra));
    assert.equal(res.status, 400, JSON.stringify(extra));
    assert.equal(res.body.error.campo, campo);
  }
});

test('RN-07 la cantidad y la última ocurrencia se calculan y se actualizan al cambiar las ocurrencias', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  let detalle = (await api.get(`/api/problemas/${problema.id}`)).body;
  assert.equal(detalle.cantidadOcurrencias, 0);
  assert.equal(detalle.fechaUltimaOcurrencia, null);

  await crearOcurrencia(api, problema.id, 10);
  const reciente = await crearOcurrencia(api, problema.id, 2);
  detalle = (await api.get(`/api/problemas/${problema.id}`)).body;
  assert.equal(detalle.cantidadOcurrencias, 2);
  assert.equal(detalle.fechaUltimaOcurrencia, haceDias(2));

  await api.delete(`/api/ocurrencias/${reciente.id}`);
  const lista = (await api.get('/api/problemas')).body;
  assert.equal(lista[0].cantidadOcurrencias, 1);
  assert.equal(lista[0].fechaUltimaOcurrencia, haceDias(10));
});

test('editar o eliminar una ocurrencia inexistente responde 404', async () => {
  const { api } = crearContexto();
  assert.equal((await api.put('/api/ocurrencias/999').send(valida())).status, 404);
  assert.equal((await api.delete('/api/ocurrencias/999')).status, 404);
});

test('RN-08 la prioridad del problema se recalcula al registrar ocurrencias', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  assert.equal((await api.get(`/api/problemas/${problema.id}`)).body.prioridad, 'BAJA');
  for (let i = 1; i <= 4; i++) await crearOcurrencia(api, problema.id, i);
  assert.equal((await api.get(`/api/problemas/${problema.id}`)).body.prioridad, 'MEDIA');
  await crearOcurrencia(api, problema.id, 5, { gravedad: 4 });
  assert.equal((await api.get(`/api/problemas/${problema.id}`)).body.prioridad, 'ALTA');
});
