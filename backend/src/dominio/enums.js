// Valores posibles de los campos enumerados (sección 4 de la spec).

export const ESTADOS = Object.freeze({
  ACTIVO: 'ACTIVO',
  CONTROLADO: 'CONTROLADO',
  SOLUCIONADO: 'SOLUCIONADO',
});

export const RESULTADOS = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  FUNCIONO: 'FUNCIONO',
  PARCIAL: 'PARCIAL',
  NO_FUNCIONO: 'NO_FUNCIONO',
});

// Ordenadas de menor a mayor: el índice sirve para comparar y subir de nivel.
export const PRIORIDADES = Object.freeze(['BAJA', 'MEDIA', 'ALTA']);

export const MOTIVOS_CAMBIO = Object.freeze({
  MANUAL: 'MANUAL',
  RECAIDA: 'RECAIDA',
});

export function esValorDe(enumeracion, valor) {
  return Object.values(enumeracion).includes(valor);
}
