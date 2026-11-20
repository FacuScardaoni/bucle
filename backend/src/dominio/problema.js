import { textoObligatorio, textoOpcional, normalizar, idValido } from './validaciones.js';
import { errorValidacion } from './errores.js';
import { ESTADOS, PRIORIDADES } from './enums.js';
import { restarDias, inicioDelDia, fechaCalendario, diasEntre } from './fechas.js';

// RN-04 y RN-05: datos editables de un problema.
// Estado, fechas, cantidad y prioridad NO se toman del cliente (RN-06).
export function validarProblema(datos = {}) {
  const nombre = textoObligatorio(datos.nombre, 'nombre', { min: 3, max: 80, regla: 'RN-04' });
  if (datos.categoriaId === undefined || datos.categoriaId === null || datos.categoriaId === '') {
    throw errorValidacion('La categoría es obligatoria', 'categoriaId', 'RN-05');
  }
  return {
    nombre,
    nombreNormalizado: normalizar(nombre),
    descripcion: textoOpcional(datos.descripcion, 'descripcion', { max: 500 }),
    categoriaId: idValido(datos.categoriaId, 'categoriaId', 'RN-05'),
  };
}

// RN-06: valores iniciales de un problema nuevo.
export function valoresIniciales(ahora) {
  return { estado: ESTADOS.ACTIVO, fechaCreacion: ahora, fechaEstado: ahora };
}

// RN-07: cantidad y fecha de la última ocurrencia se calculan siempre a partir de las ocurrencias.
export function datosDerivados(ocurrencias) {
  const ultima = ocurrencias.reduce((max, o) => (!max || o.fecha > max ? o.fecha : max), null);
  return { cantidadOcurrencias: ocurrencias.length, fechaUltimaOcurrencia: ultima };
}

export const DIAS_VENTANA_PRIORIDAD = 30;

// Ocurrencias dentro de los últimos N días (sin contar fechas futuras).
export function ocurrenciasRecientes(ocurrencias, ahora, dias) {
  const desde = restarDias(ahora, dias);
  return ocurrencias.filter((o) => o.fecha > desde && o.fecha <= ahora);
}

// RN-08: prioridad según las ocurrencias de los últimos 30 días.
// 0-1 → BAJA, 2-4 → MEDIA, 5+ → ALTA. Una ocurrencia con gravedad 4 o 5 sube un nivel (máximo ALTA).
export function calcularPrioridad(ocurrencias, ahora) {
  const recientes = ocurrenciasRecientes(ocurrencias, ahora, DIAS_VENTANA_PRIORIDAD);
  let nivel = recientes.length >= 5 ? 2 : recientes.length >= 2 ? 1 : 0;
  if (recientes.some((o) => o.gravedad >= 4)) nivel = Math.min(nivel + 1, 2);
  return PRIORIDADES[nivel];
}

// Cantidad de ocurrencias por día en los últimos N días (índice 0 = hoy), en hora de Argentina.
// La interfaz la usa para dibujar el "anillo" de actividad de cada problema.
export function actividadPorDia(ocurrencias, ahora, dias = DIAS_VENTANA_PRIORIDAD) {
  const actividad = new Array(dias).fill(0);
  const hoy = inicioDelDia(fechaCalendario(ahora));
  for (const o of ocurrencias) {
    const dia = inicioDelDia(fechaCalendario(new Date(o.fecha)));
    const indice = Math.round(diasEntre(dia, hoy));
    if (indice >= 0 && indice < dias) actividad[indice] += 1;
  }
  return actividad;
}
