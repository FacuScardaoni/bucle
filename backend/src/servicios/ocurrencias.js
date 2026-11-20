import { validarOcurrencia, porFechaDescendente } from '../dominio/ocurrencia.js';
import { idValido } from '../dominio/validaciones.js';
import { errorNoEncontrado } from '../dominio/errores.js';

export function crearServicioOcurrencias({ repos, reloj, problemas }) {
  async function obtenerOFallar(id) {
    const ocurrencia = await repos.ocurrencias.obtener(idValido(id));
    if (!ocurrencia) throw errorNoEncontrado(`No existe la ocurrencia ${id}`);
    return ocurrencia;
  }

  return {
    async listarPorProblema(problemaId) {
      const problema = await problemas.obtenerOFallar(problemaId);
      const ocurrencias = await repos.ocurrencias.listar({ problemaId: problema.id });
      return ocurrencias.sort(porFechaDescendente);
    },

    // RN-09: la ocurrencia pertenece a un problema existente y sus datos son válidos.
    async crear(problemaId, datos) {
      const problema = await problemas.obtenerOFallar(problemaId);
      const valida = validarOcurrencia(datos, reloj.ahora());
      return repos.ocurrencias.crear({ problemaId: problema.id, ...valida });
    },

    async actualizar(id, datos) {
      const actual = await obtenerOFallar(id);
      const valida = validarOcurrencia(datos, reloj.ahora());
      return repos.ocurrencias.actualizar(actual.id, valida);
    },

    async eliminar(id) {
      const actual = await obtenerOFallar(id);
      await repos.ocurrencias.eliminar(actual.id);
    },
  };
}
