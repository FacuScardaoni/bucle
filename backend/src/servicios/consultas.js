// Consultas de solo lectura: historial (RN-22) y estadísticas (RN-20, RN-21).
import { construirHistorial } from '../dominio/historial.js';

export function crearServicioConsultas({ repos, problemas }) {
  async function datosDelProblema(problemaId) {
    const problema = await problemas.obtenerOFallar(problemaId);
    const filtro = { problemaId: problema.id };
    const [ocurrencias, soluciones, cambios] = await Promise.all([
      repos.ocurrencias.listar(filtro), repos.soluciones.listar(filtro), repos.cambiosEstado.listar(filtro),
    ]);
    return { problema, ocurrencias, soluciones, cambios };
  }

  return {
    datosDelProblema,

    async historial(problemaId) {
      return construirHistorial(await datosDelProblema(problemaId));
    },
  };
}
