import { validarOcurrencia, porFechaDescendente, esRecaida } from '../dominio/ocurrencia.js';
import { idValido } from '../dominio/validaciones.js';
import { errorNoEncontrado } from '../dominio/errores.js';
import { ESTADOS, MOTIVOS_CAMBIO } from '../dominio/enums.js';

export function crearServicioOcurrencias({ repos, reloj, problemas }) {
  async function obtenerOFallar(id) {
    const ocurrencia = await repos.ocurrencias.obtener(idValido(id));
    if (!ocurrencia) throw errorNoEncontrado(`No existe la ocurrencia ${id}`);
    return ocurrencia;
  }

  // Guarda la ocurrencia y, si corresponde, reactiva el problema (RN-10), todo en una transacción.
  // La respuesta incluye "recaida: true" para que la interfaz pueda avisarlo.
  async function guardarConRecaida(problema, fecha, guardar) {
    const recaida = esRecaida(problema, fecha);
    const ocurrencia = await repos.transaccion(async (r) => {
      const guardada = await guardar(r);
      if (recaida) await problemas.aplicarCambioEstado(r, problema, ESTADOS.ACTIVO, MOTIVOS_CAMBIO.RECAIDA);
      return guardada;
    });
    return { ...ocurrencia, recaida };
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
      return guardarConRecaida(problema, valida.fecha,
        (r) => r.ocurrencias.crear({ problemaId: problema.id, ...valida }));
    },

    async actualizar(id, datos) {
      const actual = await obtenerOFallar(id);
      const problema = await problemas.obtenerOFallar(actual.problemaId);
      const valida = validarOcurrencia(datos, reloj.ahora());
      return guardarConRecaida(problema, valida.fecha,
        (r) => r.ocurrencias.actualizar(actual.id, valida));
    },

    async eliminar(id) {
      const actual = await obtenerOFallar(id);
      await repos.ocurrencias.eliminar(actual.id);
    },
  };
}
