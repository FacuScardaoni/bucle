import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto } from '../ayudas.js';

test('F-01 crea, lista, edita y elimina una categoría', async () => {
  const { api } = crearContexto();
  const creada = await api.post('/api/categorias').send({ nombre: ' Finanzas ', descripcion: 'Gastos' });
  assert.equal(creada.status, 201);
  assert.equal(creada.body.nombre, 'Finanzas');
  assert.equal(creada.body.nombreNormalizado, undefined);

  const lista = await api.get('/api/categorias');
  assert.deepEqual(lista.body.map((c) => c.nombre), ['Finanzas']);
  assert.equal(lista.body[0].cantidadProblemas, 0);

  const editada = await api.put(`/api/categorias/${creada.body.id}`).send({ nombre: 'Dinero' });
  assert.equal(editada.status, 200);
  assert.equal(editada.body.nombre, 'Dinero');
  assert.equal(editada.body.descripcion, null);

  const borrada = await api.delete(`/api/categorias/${creada.body.id}`);
  assert.equal(borrada.status, 204);
  assert.equal((await api.get('/api/categorias')).body.length, 0);
});

test('RN-02 el nombre de la categoría es obligatorio y tiene entre 2 y 40 caracteres', async () => {
  const { api } = crearContexto();
  for (const nombre of [undefined, '   ', 'a', 'x'.repeat(41)]) {
    const res = await api.post('/api/categorias').send({ nombre });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.regla, 'RN-02');
    assert.equal(res.body.error.campo, 'nombre');
  }
});

test('RN-02 no se repite el nombre aunque cambien mayúsculas o acentos', async () => {
  const { api } = crearContexto();
  await api.post('/api/categorias').send({ nombre: 'Educación' });
  const res = await api.post('/api/categorias').send({ nombre: 'EDUCACION' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.codigo, 'CONFLICTO');
  assert.equal(res.body.error.regla, 'RN-02');
});

test('RN-02 al editar se puede conservar el propio nombre pero no tomar uno ajeno', async () => {
  const { api } = crearContexto();
  const a = (await api.post('/api/categorias').send({ nombre: 'Salud' })).body;
  await api.post('/api/categorias').send({ nombre: 'Trabajo' });
  assert.equal((await api.put(`/api/categorias/${a.id}`).send({ nombre: 'SALUD' })).status, 200);
  assert.equal((await api.put(`/api/categorias/${a.id}`).send({ nombre: 'trabajo' })).status, 409);
});

test('RN-03 no se puede eliminar una categoría con problemas asociados', async () => {
  const { api, repos } = crearContexto();
  const categoria = (await api.post('/api/categorias').send({ nombre: 'Puntualidad' })).body;
  await repos.problemas.crear({ nombre: 'Llegar tarde', categoriaId: categoria.id });

  const res = await api.delete(`/api/categorias/${categoria.id}`);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.regla, 'RN-03');
  assert.equal(res.body.error.detalles.problemas, 1);
  assert.equal((await api.get('/api/categorias')).body.length, 1);
});

test('una categoría inexistente responde 404 y un id inválido 400', async () => {
  const { api } = crearContexto();
  assert.equal((await api.get('/api/categorias/999')).status, 404);
  assert.equal((await api.put('/api/categorias/999').send({ nombre: 'Algo' })).status, 404);
  assert.equal((await api.delete('/api/categorias/abc')).status, 400);
});
