import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesDeConexion } from '../../src/repositorios/postgres/index.js';

test('una base en la nube usa conexión cifrada aunque la dirección no traiga sslmode', () => {
  const opciones = opcionesDeConexion('postgresql://u:p@ep-algo-pooler.sa-east-1.aws.neon.tech/neondb');
  assert.equal(opciones.ssl, true);
});

test('una base en la propia computadora no fuerza SSL', () => {
  assert.equal(opcionesDeConexion('postgres://u@localhost:5432/bucle').ssl, undefined);
  assert.equal(opcionesDeConexion('postgres://u@127.0.0.1/bucle').ssl, undefined);
});
