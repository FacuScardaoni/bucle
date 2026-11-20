import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto, crearCategoria, crearProblema, AHORA } from '../ayudas.js';

test('F-02 crea un problema y lo consulta con el nombre de su categoría', async () => {
  const { api } = crearContexto();
  const cat = await crearCategoria(api, 'Puntualidad');
  const res = await api.post('/api/problemas')
    .send({ nombre: '  Llegar tarde al trabajo ', descripcion: 'Casi todos los lunes', categoriaId: cat.id });
  assert.equal(res.status, 201);
  assert.equal(res.body.nombre, 'Llegar tarde al trabajo');
  assert.equal(res.body.categoriaNombre, 'Puntualidad');

  const detalle = await api.get(`/api/problemas/${res.body.id}`);
  assert.equal(detalle.status, 200);
  assert.equal(detalle.body.descripcion, 'Casi todos los lunes');
});

test('RN-04 el nombre es obligatorio y tiene entre 3 y 80 caracteres', async () => {
  const { api } = crearContexto();
  const cat = await crearCategoria(api);
  for (const nombre of [undefined, '  ', 'ab', 'x'.repeat(81)]) {
    const res = await api.post('/api/problemas').send({ nombre, categoriaId: cat.id });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.regla, 'RN-04');
  }
});

test('RN-04 no puede haber dos problemas con el mismo nombre (sin importar mayúsculas ni acentos)', async () => {
  const { api } = crearContexto();
  const cat = await crearCategoria(api);
  await api.post('/api/problemas').send({ nombre: 'Olvidar las llaves', categoriaId: cat.id });
  const res = await api.post('/api/problemas').send({ nombre: 'OLVIDAR  las LLÁVES', categoriaId: cat.id });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-04');
});

test('RN-05 la categoría es obligatoria y debe existir', async () => {
  const { api } = crearContexto();
  const sinCategoria = await api.post('/api/problemas').send({ nombre: 'Gastar de más' });
  assert.equal(sinCategoria.status, 400);
  assert.equal(sinCategoria.body.error.regla, 'RN-05');

  const inexistente = await api.post('/api/problemas').send({ nombre: 'Gastar de más', categoriaId: 999 });
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.body.error.regla, 'RN-05');
});

test('RN-06 un problema nuevo empieza ACTIVO, con fechas del servidor, e ignora campos calculados', async () => {
  const { api } = crearContexto();
  const cat = await crearCategoria(api);
  const res = await api.post('/api/problemas').send({
    nombre: 'Perder tiempo en el celular', categoriaId: cat.id,
    estado: 'SOLUCIONADO', fechaCreacion: '2020-01-01T00:00:00Z', cantidadOcurrencias: 50, prioridad: 'ALTA',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.estado, 'ACTIVO');
  assert.equal(res.body.fechaCreacion, AHORA);
  assert.equal(res.body.fechaEstado, AHORA);
  assert.notEqual(res.body.cantidadOcurrencias, 50);
});

test('F-03 edita nombre, descripción y categoría pero no el estado', async () => {
  const { api } = crearContexto();
  const problema = await crearProblema(api);
  const otraCat = await crearCategoria(api, 'Trabajo');
  const res = await api.put(`/api/problemas/${problema.id}`)
    .send({ nombre: 'Llegar tarde a reuniones', categoriaId: otraCat.id, estado: 'SOLUCIONADO' });
  assert.equal(res.status, 200);
  assert.equal(res.body.nombre, 'Llegar tarde a reuniones');
  assert.equal(res.body.categoriaNombre, 'Trabajo');
  assert.equal(res.body.estado, 'ACTIVO');
});

test('consultar o editar un problema inexistente responde 404', async () => {
  const { api } = crearContexto();
  assert.equal((await api.get('/api/problemas/99999')).status, 404);
  assert.equal((await api.put('/api/problemas/99999').send({ nombre: 'Algo', categoriaId: 1 })).status, 404);
});
