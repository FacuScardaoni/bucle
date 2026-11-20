import { textoObligatorio, textoOpcional, enteroEnRango, fechaHoraValida } from './validaciones.js';
import { errorValidacion } from './errores.js';
import { ESTADOS } from './enums.js';

// RN-09: fecha obligatoria y no futura, descripción de 3 a 300, gravedad entera de 1 a 5.
export function validarOcurrencia(datos = {}, ahora) {
  const fecha = fechaHoraValida(datos.fecha, 'fecha', 'RN-09');
  if (fecha > ahora) {
    throw errorValidacion('La fecha de la ocurrencia no puede ser futura', 'fecha', 'RN-09');
  }
  return {
    fecha,
    descripcion: textoObligatorio(datos.descripcion, 'descripcion', { min: 3, max: 300, regla: 'RN-09' }),
    contexto: textoOpcional(datos.contexto, 'contexto', { max: 200 }),
    posibleCausa: textoOpcional(datos.posibleCausa, 'posibleCausa', { max: 200 }),
    gravedad: enteroEnRango(datos.gravedad, 'gravedad', { min: 1, max: 5, regla: 'RN-09' }),
  };
}

export const porFechaDescendente = (a, b) => new Date(b.fecha) - new Date(a.fecha);

// RN-10: una ocurrencia posterior al momento en que el problema se marcó SOLUCIONADO es una recaída.
// Una carga retroactiva (fecha anterior) no cambia el estado.
export function esRecaida(problema, fechaOcurrencia) {
  return problema.estado === ESTADOS.SOLUCIONADO
    && new Date(fechaOcurrencia) > new Date(problema.fechaEstado);
}
