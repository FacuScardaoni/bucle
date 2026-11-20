// Reglas del ciclo de estados de un problema (RN-14 a RN-17).
import { ESTADOS, RESULTADOS, esValorDe } from './enums.js';
import { errorValidacion, errorConflicto } from './errores.js';
import { ocurrenciasRecientes } from './problema.js';

export const DIAS_SIN_OCURRENCIAS_PARA_SOLUCIONAR = 14;

// Condición sobre las soluciones que exige cada estado (null si no exige nada o se cumple).
const REQUISITOS = {
  [ESTADOS.CONTROLADO]: {
    regla: 'RN-14',
    cumple: (soluciones) => soluciones.some((s) => [RESULTADOS.FUNCIONO, RESULTADOS.PARCIAL].includes(s.resultado)),
    falta: 'al menos una solución evaluada como FUNCIONO o PARCIAL',
  },
  [ESTADOS.SOLUCIONADO]: {
    regla: 'RN-15',
    cumple: (soluciones) => soluciones.some((s) => s.resultado === RESULTADOS.FUNCIONO),
    falta: 'al menos una solución evaluada como FUNCIONO',
  },
};

// RN-14 a RN-16: verifica si un problema puede pasar al estado pedido.
export function validarCambioEstado(problema, nuevoEstado, soluciones, ocurrencias, ahora) {
  if (!esValorDe(ESTADOS, nuevoEstado)) {
    throw errorValidacion(`El estado debe ser uno de: ${Object.values(ESTADOS).join(', ')}`, 'estado', 'RN-16');
  }
  if (problema.estado === nuevoEstado) {
    throw errorValidacion(`El problema ya está en estado ${nuevoEstado}`, 'estado', 'RN-16');
  }
  const requisito = REQUISITOS[nuevoEstado];
  if (!requisito) return; // ACTIVO siempre está permitido (RN-16)

  const faltan = [];
  if (!requisito.cumple(soluciones)) faltan.push(requisito.falta);
  if (nuevoEstado === ESTADOS.SOLUCIONADO) {
    const recientes = ocurrenciasRecientes(ocurrencias, ahora, DIAS_SIN_OCURRENCIAS_PARA_SOLUCIONAR);
    if (recientes.length > 0) {
      faltan.push(`no tener ocurrencias en los últimos ${DIAS_SIN_OCURRENCIAS_PARA_SOLUCIONAR} días (hay ${recientes.length})`);
    }
  }
  if (faltan.length > 0) {
    throw errorConflicto(`Para pasar a ${nuevoEstado} el problema necesita: ${faltan.join('; ')}`,
      requisito.regla, { faltan });
  }
}

// RN-17: un cambio en las soluciones no puede dejar al problema en un estado que ya no se sostiene.
export function verificarConsistencia(estadoActual, solucionesResultantes) {
  const requisito = REQUISITOS[estadoActual];
  if (requisito && !requisito.cumple(solucionesResultantes)) {
    throw errorConflicto(
      `El problema está ${estadoActual} y necesita ${requisito.falta}. Cambiá primero el estado del problema.`,
      'RN-17');
  }
}
