import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { crearApp } from '../../src/app.js';

const app = crearApp();

test('GET /api/salud responde ok', async () => {
  const res = await request(app).get('/api/salud');
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, 'ok');
});

test('una ruta inexistente responde 404 con el formato de error estándar', async () => {
  const res = await request(app).get('/api/no-existe');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.codigo, 'NO_ENCONTRADO');
  assert.ok(res.body.error.mensaje);
});

test('RN-01 un JSON mal formado responde 400 y no 500', async () => {
  const res = await request(app)
    .post('/api/salud')
    .set('Content-Type', 'application/json')
    .send('{"nombre": ');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.codigo, 'VALIDACION');
});
