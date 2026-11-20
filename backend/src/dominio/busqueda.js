// RN-19: búsqueda por texto, filtros combinables y orden del listado de problemas.
import { limpiarTexto, normalizar, idValido } from './validaciones.js';
import { errorValidacion } from './errores.js';
import { ESTADOS, PRIORIDADES } from './enums.js';

const MIN_BUSQUEDA = 2;

function valorEnLista(valor, campo, permitidos) {
  const texto = limpiarTexto(valor, campo, 'RN-19');
  if (texto !== null && !permitidos.includes(texto)) {
    throw errorValidacion(`El filtro "${campo}" debe ser uno de: ${permitidos.join(', ')}`, campo, 'RN-19');
  }
  return texto;
}

// Valida los parámetros de la URL. idsCategorias: ids de las categorías existentes.
export function validarFiltros(query = {}, idsCategorias = []) {
  const q = limpiarTexto(query.q, 'q', 'RN-19');
  if (q !== null && q.length < MIN_BUSQUEDA) {
    throw errorValidacion(`La búsqueda debe tener al menos ${MIN_BUSQUEDA} caracteres`, 'q', 'RN-19');
  }

  let categoriaId = null;
  const categoria = limpiarTexto(query.categoria, 'categoria', 'RN-19');
  if (categoria !== null) {
    categoriaId = idValido(categoria, 'categoria', 'RN-19');
    if (!idsCategorias.includes(categoriaId)) {
      throw errorValidacion(`No existe la categoría ${categoriaId}`, 'categoria', 'RN-19');
    }
  }

  return {
    texto: q === null ? null : normalizar(q),
    categoriaId,
    estado: valorEnLista(query.estado, 'estado', Object.values(ESTADOS)),
    prioridad: valorEnLista(query.prioridad, 'prioridad', PRIORIDADES),
  };
}

function cumple(problema, filtros) {
  if (filtros.categoriaId !== null && problema.categoriaId !== filtros.categoriaId) return false;
  if (filtros.estado !== null && problema.estado !== filtros.estado) return false;
  if (filtros.prioridad !== null && problema.prioridad !== filtros.prioridad) return false;
  if (filtros.texto !== null) {
    const contenido = normalizar(`${problema.nombre} ${problema.descripcion ?? ''}`);
    if (!contenido.includes(filtros.texto)) return false;
  }
  return true;
}

// Orden: prioridad (ALTA primero), luego la ocurrencia más reciente, luego el nombre.
function comparar(a, b) {
  const porPrioridad = PRIORIDADES.indexOf(b.prioridad) - PRIORIDADES.indexOf(a.prioridad);
  if (porPrioridad !== 0) return porPrioridad;
  const fa = a.fechaUltimaOcurrencia ? new Date(a.fechaUltimaOcurrencia).getTime() : -Infinity;
  const fb = b.fechaUltimaOcurrencia ? new Date(b.fechaUltimaOcurrencia).getTime() : -Infinity;
  if (fa !== fb) return fb - fa;
  return a.nombre.localeCompare(b.nombre, 'es');
}

export function filtrarYOrdenar(problemas, filtros) {
  return problemas.filter((p) => cumple(p, filtros)).sort(comparar);
}
