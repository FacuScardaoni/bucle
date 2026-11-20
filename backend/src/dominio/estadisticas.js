// Estadísticas basadas exclusivamente en los datos registrados (RN-20 y RN-21).
import { RESULTADOS, ESTADOS } from './enums.js';
import { inicioDelDia, restarDias, sumarDias, diasEntre, diaSemanaLocal, horaLocal } from './fechas.js';
import { ocurrenciasRecientes } from './problema.js';

export const DIAS_VENTANA_EFECTIVIDAD = 28;
export const DIAS_MINIMOS_OBSERVACION = 7;
const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const FRANJAS = ['mañana', 'tarde', 'noche'];

const redondear1 = (n) => Math.round(n * 10) / 10;

const contarEntre = (ocurrencias, desde, hasta) =>
  ocurrencias.filter((o) => new Date(o.fecha) >= desde && new Date(o.fecha) < hasta).length;

// RN-20: compara la frecuencia semanal 28 días antes y después de aplicar la solución.
export function efectividadSolucion(solucion, ocurrencias, ahora) {
  const aplicacion = inicioDelDia(solucion.fechaAplicacion);
  const transcurridos = diasEntre(aplicacion, ahora);
  if (transcurridos < 0) return { estado: 'PLANIFICADA' };
  if (transcurridos < DIAS_MINIMOS_OBSERVACION) {
    return { estado: 'EN_OBSERVACION', diasObservados: Math.floor(transcurridos) };
  }

  const antes = contarEntre(ocurrencias, restarDias(aplicacion, DIAS_VENTANA_EFECTIVIDAD), aplicacion);
  if (antes === 0) return { estado: 'SIN_DATOS_PREVIOS', ocurrenciasAntes: 0 };

  const diasObservados = Math.min(DIAS_VENTANA_EFECTIVIDAD, transcurridos);
  const despues = contarEntre(ocurrencias, aplicacion, sumarDias(aplicacion, diasObservados));
  const tasaAntes = antes / (DIAS_VENTANA_EFECTIVIDAD / 7);
  const tasaDespues = despues / (diasObservados / 7);
  return {
    estado: 'CALCULADA',
    ocurrenciasAntes: antes,
    ocurrenciasDespues: despues,
    diasObservados: Math.floor(diasObservados),
    tasaSemanalAntes: redondear1(tasaAntes),
    tasaSemanalDespues: redondear1(tasaDespues),
    mejoraPorcentaje: Math.round(((tasaAntes - tasaDespues) / tasaAntes) * 100),
  };
}

// Franja horaria (hora de Argentina): mañana 6–12, tarde 12–19, noche 19–6.
export function franjaHoraria(fecha) {
  const hora = horaLocal(new Date(fecha));
  if (hora >= 6 && hora < 12) return 'mañana';
  if (hora >= 12 && hora < 19) return 'tarde';
  return 'noche';
}

// Devuelve el valor más repetido; ante empate, el primero en el orden dado.
function masFrecuente(valores, orden) {
  if (valores.length === 0) return null;
  const conteo = orden.map((v) => valores.filter((x) => x === v).length);
  const max = Math.max(...conteo);
  return { valor: orden[conteo.indexOf(max)], cantidad: max };
}

function promedioSemanal(ocurrencias, ahora) {
  if (ocurrencias.length === 0) return 0;
  const primera = new Date(Math.min(...ocurrencias.map((o) => new Date(o.fecha).getTime())));
  const semanas = Math.max(1, diasEntre(primera, ahora) / 7);
  return redondear1(ocurrencias.length / semanas);
}

function contarPorResultado(soluciones) {
  return Object.fromEntries(Object.values(RESULTADOS)
    .map((r) => [r, soluciones.filter((s) => s.resultado === r).length]));
}

// La de mayor mejora entre las que tienen datos suficientes y mejoraron (ver D-14).
function mejorSolucion(soluciones, efectividades) {
  let mejor = null;
  soluciones.forEach((s, i) => {
    const e = efectividades[i];
    if (e.estado === 'CALCULADA' && e.mejoraPorcentaje > 0 && (!mejor || e.mejoraPorcentaje > mejor.mejoraPorcentaje)) {
      mejor = { solucionId: s.id, nombre: s.nombre, mejoraPorcentaje: e.mejoraPorcentaje };
    }
  });
  return mejor;
}

// RN-21: estadísticas de un problema.
export function estadisticasProblema({ ocurrencias, soluciones }, ahora) {
  const dia = masFrecuente(ocurrencias.map((o) => diaSemanaLocal(new Date(o.fecha))), [0, 1, 2, 3, 4, 5, 6]);
  const franja = masFrecuente(ocurrencias.map((o) => franjaHoraria(o.fecha)), FRANJAS);
  const efectividades = soluciones.map((s) => efectividadSolucion(s, ocurrencias, ahora));
  const gravedades = ocurrencias.map((o) => o.gravedad);

  return {
    totalOcurrencias: ocurrencias.length,
    ocurrenciasUltimos30Dias: ocurrenciasRecientes(ocurrencias, ahora, 30).length,
    promedioSemanal: promedioSemanal(ocurrencias, ahora),
    gravedadPromedio: gravedades.length ? redondear1(gravedades.reduce((a, b) => a + b, 0) / gravedades.length) : null,
    diaMasFrecuente: dia && { dia: DIAS_SEMANA[dia.valor], cantidad: dia.cantidad },
    franjaMasFrecuente: franja && { franja: franja.valor, cantidad: franja.cantidad },
    solucionesPorResultado: contarPorResultado(soluciones),
    mejorSolucion: mejorSolucion(soluciones, efectividades),
  };
}

// RN-21: resumen general de todos los problemas.
export function resumenGeneral({ problemas, categorias, ocurrencias }, ahora) {
  const porEstado = Object.fromEntries(Object.values(ESTADOS)
    .map((e) => [e, problemas.filter((p) => p.estado === e).length]));

  const porCategoria = categorias
    .map((c) => ({ categoriaId: c.id, nombre: c.nombre, cantidad: problemas.filter((p) => p.categoriaId === c.id).length }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));

  const recientes = ocurrenciasRecientes(ocurrencias, ahora, 30);
  const masFrecuentes = problemas
    .map((p) => ({ id: p.id, nombre: p.nombre, ocurrenciasUltimos30Dias: recientes.filter((o) => o.problemaId === p.id).length }))
    .filter((p) => p.ocurrenciasUltimos30Dias > 0)
    .sort((a, b) => b.ocurrenciasUltimos30Dias - a.ocurrenciasUltimos30Dias || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 5);

  return {
    totalProblemas: problemas.length,
    ocurrenciasUltimos30Dias: recientes.length,
    porEstado,
    porCategoria,
    masFrecuentes,
  };
}
