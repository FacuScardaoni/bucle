// Validaciones genéricas de datos de entrada (RN-01 y reglas de formato de cada entidad).
import { errorValidacion } from './errores.js';

// RN-01: recorta espacios; un texto vacío se considera no informado (null).
export function limpiarTexto(valor, campo, regla = 'RN-01') {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') {
    throw errorValidacion(`El campo "${campo}" debe ser texto`, campo, regla);
  }
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

export function textoObligatorio(valor, campo, { min, max, regla }) {
  const texto = limpiarTexto(valor, campo, regla);
  if (texto === null) {
    throw errorValidacion(`El campo "${campo}" es obligatorio`, campo, regla);
  }
  if (texto.length < min || texto.length > max) {
    throw errorValidacion(`El campo "${campo}" debe tener entre ${min} y ${max} caracteres`, campo, regla);
  }
  return texto;
}

export function textoOpcional(valor, campo, { max, regla = 'RN-01' }) {
  const texto = limpiarTexto(valor, campo, regla);
  if (texto !== null && texto.length > max) {
    throw errorValidacion(`El campo "${campo}" puede tener como máximo ${max} caracteres`, campo, regla);
  }
  return texto;
}

// Forma comparable de un nombre: sin mayúsculas, sin acentos y con espacios simples.
// "  Llegar  TARDE " y "llegar tarde" son el mismo nombre (RN-02, RN-04, RN-11).
export function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Acepta enteros como número o como texto ("3"). Rechaza "abc", 2.5, etc.
export function enteroEnRango(valor, campo, { min, max, regla }) {
  if (valor === undefined || valor === null || valor === '') {
    throw errorValidacion(`El campo "${campo}" es obligatorio`, campo, regla);
  }
  const numero = typeof valor === 'string' && /^-?\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw errorValidacion(`El campo "${campo}" debe ser un número entero entre ${min} y ${max}`, campo, regla);
  }
  return numero;
}

// Identificador positivo (de la URL o del cuerpo).
export function idValido(valor, campo = 'id', regla) {
  const numero = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  if (!Number.isInteger(numero) || numero <= 0) {
    throw errorValidacion(`El campo "${campo}" debe ser un identificador válido`, campo, regla);
  }
  return numero;
}

// Fecha y hora en formato ISO 8601 (ej. 2026-11-20T09:30:00-03:00).
export function fechaHoraValida(valor, campo, regla) {
  if (valor === undefined || valor === null || valor === '') {
    throw errorValidacion(`El campo "${campo}" es obligatorio`, campo, regla);
  }
  const fecha = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor) ? new Date(valor) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    throw errorValidacion(`El campo "${campo}" debe ser una fecha y hora válida`, campo, regla);
  }
  return fecha;
}

// Fecha de calendario 'YYYY-MM-DD'.
export function fechaCalendarioValida(valor, campo, regla) {
  if (valor === undefined || valor === null || valor === '') {
    throw errorValidacion(`El campo "${campo}" es obligatorio`, campo, regla);
  }
  const ok = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const fecha = ok ? new Date(`${valor}T00:00:00Z`) : null;
  if (!fecha || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    throw errorValidacion(`El campo "${campo}" debe ser una fecha con formato AAAA-MM-DD`, campo, regla);
  }
  return valor;
}
