import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPrioridad } from '../../src/dominio/problema.js';

const ahora = new Date('2026-11-20T15:00:00Z');
const hace = (dias) => new Date(ahora.getTime() - dias * 86400000);
const ocurrencias = (cantidad, gravedad = 3, dias = 1) =>
  Array.from({ length: cantidad }, () => ({ fecha: hace(dias), gravedad }));

test('RN-08 0 o 1 ocurrencias en 30 días → BAJA', () => {
  assert.equal(calcularPrioridad([], ahora), 'BAJA');
  assert.equal(calcularPrioridad(ocurrencias(1), ahora), 'BAJA');
});

test('RN-08 de 2 a 4 ocurrencias en 30 días → MEDIA', () => {
  assert.equal(calcularPrioridad(ocurrencias(2), ahora), 'MEDIA');
  assert.equal(calcularPrioridad(ocurrencias(4), ahora), 'MEDIA');
});

test('RN-08 5 o más ocurrencias en 30 días → ALTA', () => {
  assert.equal(calcularPrioridad(ocurrencias(5), ahora), 'ALTA');
});

test('RN-08 las ocurrencias de hace más de 30 días no cuentan', () => {
  assert.equal(calcularPrioridad(ocurrencias(5, 3, 31), ahora), 'BAJA');
  assert.equal(calcularPrioridad([...ocurrencias(5, 3, 31), ...ocurrencias(2, 3, 29)], ahora), 'MEDIA');
});

test('RN-08 sube un nivel con gravedad ≥ 4', () => {
  assert.equal(calcularPrioridad(ocurrencias(1, 4), ahora), 'MEDIA');
  assert.equal(calcularPrioridad([...ocurrencias(1, 3), ...ocurrencias(1, 5)], ahora), 'ALTA');
});

test('RN-08 con gravedad 3 no sube de nivel', () => {
  assert.equal(calcularPrioridad(ocurrencias(1, 3), ahora), 'BAJA');
});

test('RN-08 nunca supera ALTA', () => {
  assert.equal(calcularPrioridad(ocurrencias(6, 5), ahora), 'ALTA');
});

test('RN-08 una ocurrencia grave de hace más de 30 días no sube el nivel', () => {
  assert.equal(calcularPrioridad([...ocurrencias(1, 3), ...ocurrencias(1, 5, 40)], ahora), 'BAJA');
});
