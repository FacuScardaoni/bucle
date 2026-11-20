import { crearServicioCategorias } from './categorias.js';

// Arma todos los servicios con sus dependencias (repositorios y reloj).
export function crearServicios({ repos, reloj }) {
  const categorias = crearServicioCategorias({ repos, reloj });
  return { categorias };
}
