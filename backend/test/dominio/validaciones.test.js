import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  limpiarTexto, textoObligatorio, textoOpcional, normalizar,
  enteroEnRango, idValido, fechaHoraValida, fechaCalendarioValida,
} from '../../src/dominio/validaciones.js';
import { fechaCalendario, diaSemanaLocal, horaLocal, inicioDelDia } from '../../src/dominio/fechas.js';
import { crearRelojFijo } from '../../src/dominio/reloj.js';

const esValidacion = (campo) => (err) => err.codigo === 'VALIDACION' && err.status === 400 && err.campo === campo;

test('RN-01 recorta espacios al inicio y al final', () => {
  assert.equal(limpiarTexto('  hola  ', 'x'), 'hola');
});

test('RN-01 un texto vacío o solo con espacios se considera no informado', () => {
  assert.equal(limpiarTexto('   ', 'x'), null);
  assert.equal(limpiarTexto(undefined, 'x'), null);
});

test('RN-01 un valor que no es texto da error 400', () => {
  assert.throws(() => limpiarTexto(123, 'nombre'), esValidacion('nombre'));
});

test('RN-01 texto obligatorio: rechaza vacío y respeta límites', () => {
  const reglas = { min: 3, max: 5, regla: 'RN-04' };
  assert.throws(() => textoObligatorio('  ', 'nombre', reglas), esValidacion('nombre'));
  assert.throws(() => textoObligatorio('ab', 'nombre', reglas), esValidacion('nombre'));
  assert.throws(() => textoObligatorio('abcdef', 'nombre', reglas), esValidacion('nombre'));
  assert.equal(textoObligatorio(' abc ', 'nombre', reglas), 'abc');
});

test('RN-01 texto opcional: acepta null y controla el máximo', () => {
  assert.equal(textoOpcional(undefined, 'descripcion', { max: 3 }), null);
  assert.throws(() => textoOpcional('abcd', 'descripcion', { max: 3 }), esValidacion('descripcion'));
});

test('normalizar ignora mayúsculas, acentos y espacios repetidos', () => {
  assert.equal(normalizar('  Llegar   TARDE  al Café '), 'llegar tarde al cafe');
  assert.equal(normalizar('Finanzas'), normalizar('FINANZAS'));
});

test('enteroEnRango acepta números y texto numérico, rechaza el resto', () => {
  const reglas = { min: 1, max: 5, regla: 'RN-09' };
  assert.equal(enteroEnRango(3, 'gravedad', reglas), 3);
  assert.equal(enteroEnRango('4', 'gravedad', reglas), 4);
  for (const malo of [0, 6, 2.5, 'abc', null, '']) {
    assert.throws(() => enteroEnRango(malo, 'gravedad', reglas), esValidacion('gravedad'));
  }
});

test('idValido rechaza ids no numéricos o no positivos', () => {
  assert.equal(idValido('12'), 12);
  for (const malo of ['abc', '0', -1, '1.5']) assert.throws(() => idValido(malo));
});

test('fechaHoraValida exige formato ISO', () => {
  assert.equal(fechaHoraValida('2026-11-20T09:00:00-03:00', 'fecha').toISOString(), '2026-11-20T12:00:00.000Z');
  for (const malo of ['ayer', '20/11/2026', '', 5]) {
    assert.throws(() => fechaHoraValida(malo, 'fecha'), esValidacion('fecha'));
  }
});

test('fechaCalendarioValida exige AAAA-MM-DD y una fecha real', () => {
  assert.equal(fechaCalendarioValida('2026-02-28', 'f'), '2026-02-28');
  for (const malo of ['2026-02-30', '2026-2-1', 'hoy']) {
    assert.throws(() => fechaCalendarioValida(malo, 'f'), esValidacion('f'));
  }
});

test('las fechas de calendario, días y horas se calculan en hora de Argentina', () => {
  const fecha = new Date('2026-11-21T01:30:00Z'); // viernes 20/11 22:30 en Argentina
  assert.equal(fechaCalendario(fecha), '2026-11-20');
  assert.equal(diaSemanaLocal(fecha), 4); // viernes (0 = lunes)
  assert.equal(horaLocal(fecha), 22);
  assert.equal(inicioDelDia('2026-11-20').toISOString(), '2026-11-20T03:00:00.000Z');
});

test('el reloj fijo devuelve siempre la hora configurada', () => {
  const reloj = crearRelojFijo('2026-11-20T12:00:00Z');
  assert.equal(reloj.ahora().toISOString(), '2026-11-20T12:00:00.000Z');
  reloj.fijar('2026-12-01T00:00:00Z');
  assert.equal(reloj.ahora().toISOString(), '2026-12-01T00:00:00.000Z');
});
