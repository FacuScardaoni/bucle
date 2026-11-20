import { crearServicioCategorias } from './categorias.js';
import { crearServicioProblemas } from './problemas.js';
import { crearServicioOcurrencias } from './ocurrencias.js';

// Arma todos los servicios con sus dependencias (repositorios y reloj).
export function crearServicios({ repos, reloj }) {
  const categorias = crearServicioCategorias({ repos, reloj });
  const problemas = crearServicioProblemas({ repos, reloj, categorias });
  const ocurrencias = crearServicioOcurrencias({ repos, reloj, problemas });
  return { categorias, problemas, ocurrencias };
}
