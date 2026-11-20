import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  efectividadSolucion, estadisticasProblema, resumenGeneral, franjaHoraria,
} from '../../src/dominio/estadisticas.js';

const ahora = new Date('2026-11-20T15:00:00Z'); // viernes 20/11, 12:00 en Argentina
const hace = (dias) => new Date(ahora.getTime() - dias * 86400000);
const dia = (dias) => hace(dias).toISOString().slice(0, 10);
const ocurrenciasEn = (...dias) => dias.map((d) => ({ fecha: hace(d), gravedad: 3 }));

test('RN-20 calcula la mejora comparando 28 días antes y después', () => {
  // Aplicada hace 30 días: 8 ocurrencias en los 28 días previos (2/semana), 2 después (0,5/semana).
  const solucion = { fechaAplicacion: dia(30) };
  const ocurrencias = ocurrenciasEn(31, 33, 35, 38, 40, 45, 50, 55, 20, 10);
  const e = efectividadSolucion(solucion, ocurrencias, ahora);
  assert.equal(e.estado, 'CALCULADA');
  assert.equal(e.ocurrenciasAntes, 8);
  assert.equal(e.ocurrenciasDespues, 2);
  assert.equal(e.tasaSemanalAntes, 2);
  assert.equal(e.tasaSemanalDespues, 0.5);
  assert.equal(e.mejoraPorcentaje, 75);
  assert.equal(e.diasObservados, 28);
});

test('RN-20 las ocurrencias de hace más de 28 días antes de aplicar no cuentan', () => {
  const solucion = { fechaAplicacion: dia(30) };
  const e = efectividadSolucion(solucion, ocurrenciasEn(31, 60, 70), ahora);
  assert.equal(e.ocurrenciasAntes, 1);
});

test('RN-20 si pasaron menos de 28 días normaliza por los días transcurridos', () => {
  // Aplicada hace 14 días (14,5 días contando desde el inicio de ese día): 4 antes (1/semana), 1 después.
  const solucion = { fechaAplicacion: dia(14) };
  const e = efectividadSolucion(solucion, ocurrenciasEn(16, 20, 25, 30, 5), ahora);
  assert.equal(e.estado, 'CALCULADA');
  assert.equal(e.tasaSemanalAntes, 1);
  assert.equal(e.tasaSemanalDespues, 0.5);
  assert.equal(e.mejoraPorcentaje, 52);
});

test('RN-20 una mejora negativa indica que el problema empeoró', () => {
  const solucion = { fechaAplicacion: dia(30) };
  const e = efectividadSolucion(solucion, ocurrenciasEn(31, 25, 20, 15, 10), ahora);
  assert.equal(e.mejoraPorcentaje, -300);
});

test('RN-20 con menos de 7 días desde la aplicación queda EN_OBSERVACION', () => {
  assert.equal(efectividadSolucion({ fechaAplicacion: dia(6) }, ocurrenciasEn(10), ahora).estado, 'EN_OBSERVACION');
  assert.equal(efectividadSolucion({ fechaAplicacion: dia(7) }, ocurrenciasEn(10), ahora).estado, 'CALCULADA');
});

test('RN-20 sin ocurrencias previas queda SIN_DATOS_PREVIOS', () => {
  assert.equal(efectividadSolucion({ fechaAplicacion: dia(20) }, ocurrenciasEn(5), ahora).estado, 'SIN_DATOS_PREVIOS');
});

test('RN-20 una solución con fecha futura queda PLANIFICADA', () => {
  assert.equal(efectividadSolucion({ fechaAplicacion: dia(-3) }, [], ahora).estado, 'PLANIFICADA');
});

test('RN-21 franjas horarias en hora de Argentina', () => {
  assert.equal(franjaHoraria('2026-11-20T09:00:00Z'), 'mañana'); // 06:00
  assert.equal(franjaHoraria('2026-11-20T14:59:00Z'), 'mañana'); // 11:59
  assert.equal(franjaHoraria('2026-11-20T15:00:00Z'), 'tarde');  // 12:00
  assert.equal(franjaHoraria('2026-11-20T22:00:00Z'), 'noche');  // 19:00
  assert.equal(franjaHoraria('2026-11-20T08:59:00Z'), 'noche');  // 05:59
});

test('RN-21 estadísticas del problema: totales, promedio, gravedad, día y franja', () => {
  const ocurrencias = [
    { fecha: new Date('2026-11-16T11:00:00Z'), gravedad: 2 }, // lunes 08:00
    { fecha: new Date('2026-11-09T12:00:00Z'), gravedad: 4 }, // lunes 09:00
    { fecha: new Date('2026-11-18T23:00:00Z'), gravedad: 3 }, // miércoles 20:00
  ];
  const e = estadisticasProblema({ ocurrencias, soluciones: [] }, ahora);
  assert.equal(e.totalOcurrencias, 3);
  assert.equal(e.ocurrenciasUltimos30Dias, 3);
  assert.equal(e.promedioSemanal, 1.9);
  assert.equal(e.gravedadPromedio, 3);
  assert.deepEqual(e.diaMasFrecuente, { dia: 'lunes', cantidad: 2 });
  assert.deepEqual(e.franjaMasFrecuente, { franja: 'mañana', cantidad: 2 });
  assert.equal(e.mejorSolucion, null);
});

test('RN-21 sin ocurrencias las estadísticas quedan en cero o vacías', () => {
  const e = estadisticasProblema({ ocurrencias: [], soluciones: [] }, ahora);
  assert.equal(e.totalOcurrencias, 0);
  assert.equal(e.promedioSemanal, 0);
  assert.equal(e.gravedadPromedio, null);
  assert.equal(e.diaMasFrecuente, null);
  assert.equal(e.franjaMasFrecuente, null);
});

test('RN-21 cuenta soluciones por resultado y elige la de mayor mejora positiva', () => {
  const ocurrencias = ocurrenciasEn(31, 33, 35, 38, 40, 45, 50, 55, 20, 10);
  const soluciones = [
    { id: 1, nombre: 'A', fechaAplicacion: dia(30), resultado: 'FUNCIONO' },  // 75 %
    { id: 2, nombre: 'B', fechaAplicacion: dia(15), resultado: 'PARCIAL' },
    { id: 3, nombre: 'C', fechaAplicacion: dia(2), resultado: 'PENDIENTE' },  // en observación
  ];
  const e = estadisticasProblema({ ocurrencias, soluciones }, ahora);
  assert.deepEqual(e.solucionesPorResultado, { PENDIENTE: 1, FUNCIONO: 1, PARCIAL: 1, NO_FUNCIONO: 0 });
  assert.equal(e.mejorSolucion.nombre, 'A');
  assert.equal(e.mejorSolucion.mejoraPorcentaje, 75);
});

test('RN-21 resumen general: por estado, por categoría y los 5 más frecuentes', () => {
  const categorias = [{ id: 1, nombre: 'Olvidos' }, { id: 2, nombre: 'Finanzas' }, { id: 3, nombre: 'Salud' }];
  const problemas = [1, 2, 3, 4, 5, 6].map((id) => ({
    id, nombre: `P${id}`, categoriaId: id === 6 ? 2 : 1, estado: id === 1 ? 'SOLUCIONADO' : 'ACTIVO',
  }));
  const ocurrencias = [];
  problemas.forEach((p) => {
    for (let i = 0; i < p.id; i++) ocurrencias.push({ problemaId: p.id, fecha: hace(i + 1), gravedad: 3 });
  });
  ocurrencias.push({ problemaId: 1, fecha: hace(40), gravedad: 3 }); // fuera de la ventana

  const r = resumenGeneral({ problemas, categorias, ocurrencias }, ahora);
  assert.equal(r.totalProblemas, 6);
  assert.equal(r.ocurrenciasUltimos30Dias, 21);
  assert.deepEqual(r.porEstado, { ACTIVO: 5, CONTROLADO: 0, SOLUCIONADO: 1 });
  assert.deepEqual(r.porCategoria.map((c) => [c.nombre, c.cantidad]), [['Olvidos', 5], ['Finanzas', 1], ['Salud', 0]]);
  assert.deepEqual(r.masFrecuentes.map((p) => p.nombre), ['P6', 'P5', 'P4', 'P3', 'P2']);
});
