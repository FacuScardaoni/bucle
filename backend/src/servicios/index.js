import { crearServicioCategorias } from './categorias.js';
import { crearServicioProblemas } from './problemas.js';

// Arma todos los servicios con sus dependencias (repositorios y reloj).
export function crearServicios({ repos, reloj }) {
  const categorias = crearServicioCategorias({ repos, reloj });
  const problemas = crearServicioProblemas({ repos, reloj, categorias });
  return { categorias, problemas };
}
