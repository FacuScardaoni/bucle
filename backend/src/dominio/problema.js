import { textoObligatorio, textoOpcional, normalizar, idValido } from './validaciones.js';
import { errorValidacion } from './errores.js';
import { ESTADOS } from './enums.js';

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
