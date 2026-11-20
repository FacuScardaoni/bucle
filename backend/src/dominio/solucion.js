import { textoObligatorio, textoOpcional, normalizar, fechaCalendarioValida } from './validaciones.js';
import { errorValidacion } from './errores.js';
import { RESULTADOS } from './enums.js';

// RN-11: nombre de 3 a 80 (único dentro del problema, lo controla el servicio),
// fecha de aplicación obligatoria (puede ser futura: solución planificada).
export function validarSolucion(datos = {}) {
  const nombre = textoObligatorio(datos.nombre, 'nombre', { min: 3, max: 80, regla: 'RN-11' });
  return {
    nombre,
    nombreNormalizado: normalizar(nombre),
    descripcion: textoOpcional(datos.descripcion, 'descripcion', { max: 500 }),
    fechaAplicacion: fechaCalendarioValida(datos.fechaAplicacion, 'fechaAplicacion', 'RN-11'),
  };
}

// RN-12: toda solución nace PENDIENTE (si el cliente manda otro resultado, se ignora).
export function valoresInicialesSolucion() {
  return { resultado: RESULTADOS.PENDIENTE, observaciones: null, fechaEvaluacion: null };
}

export const estaEvaluada = (solucion) => solucion.resultado !== RESULTADOS.PENDIENTE;

function asegurarFechaAlcanzada(fechaAplicacion, hoy, mensaje) {
  if (fechaAplicacion > hoy) throw errorValidacion(mensaje, 'fechaAplicacion', 'RN-13');
}

// Una solución ya evaluada no puede pasar a tener fecha de aplicación futura (ver D-08).
export function validarCambioDeFecha(solucion, nuevaFecha, hoy) {
  if (estaEvaluada(solucion)) {
    asegurarFechaAlcanzada(nuevaFecha, hoy,
      'Una solución ya evaluada no puede tener fecha de aplicación futura');
  }
}

const RESULTADOS_EVALUACION = [RESULTADOS.FUNCIONO, RESULTADOS.PARCIAL, RESULTADOS.NO_FUNCIONO];
const MIN_OBSERVACIONES = 10;

// RN-13: reglas para evaluar una solución. "hoy" es la fecha de calendario actual (AAAA-MM-DD).
export function validarEvaluacion(datos = {}, solucion, hoy) {
  if (!RESULTADOS_EVALUACION.includes(datos.resultado)) {
    throw errorValidacion(`El resultado debe ser uno de: ${RESULTADOS_EVALUACION.join(', ')}`, 'resultado', 'RN-13');
  }
  asegurarFechaAlcanzada(solucion.fechaAplicacion, hoy,
    `No se puede evaluar una solución cuya fecha de aplicación (${solucion.fechaAplicacion}) todavía no llegó`);

  const observaciones = textoOpcional(datos.observaciones, 'observaciones', { max: 500, regla: 'RN-13' });
  const requiereObservaciones = datos.resultado !== RESULTADOS.FUNCIONO;
  if (requiereObservaciones && (observaciones === null || observaciones.length < MIN_OBSERVACIONES)) {
    throw errorValidacion(
      `Si la solución no funcionó o funcionó parcialmente, contá qué falló (al menos ${MIN_OBSERVACIONES} caracteres)`,
      'observaciones', 'RN-13');
  }
  return { resultado: datos.resultado, observaciones };
}
