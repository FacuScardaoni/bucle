import { textoObligatorio, textoOpcional, normalizar } from './validaciones.js';

// RN-02: nombre obligatorio de 2 a 40 caracteres. Descripción opcional hasta 200.
export function validarCategoria(datos = {}) {
  const nombre = textoObligatorio(datos.nombre, 'nombre', { min: 2, max: 40, regla: 'RN-02' });
  return {
    nombre,
    nombreNormalizado: normalizar(nombre),
    descripcion: textoOpcional(datos.descripcion, 'descripcion', { max: 200 }),
  };
}
