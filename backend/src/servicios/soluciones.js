import {
  validarSolucion, valoresInicialesSolucion, validarEvaluacion, validarCambioDeFecha,
} from '../dominio/solucion.js';
import { asegurarNombreUnico, idValido } from '../dominio/validaciones.js';
import { errorNoEncontrado } from '../dominio/errores.js';
import { fechaCalendario } from '../dominio/fechas.js';
import { verificarConsistencia } from '../dominio/estados.js';

function aVista(solucion) {
  const { nombreNormalizado, ...vista } = solucion;
  return vista;
}

export function crearServicioSoluciones({ repos, reloj, problemas }) {
  const hoy = () => fechaCalendario(reloj.ahora());

  async function obtenerOFallar(id) {
    const solucion = await repos.soluciones.obtener(idValido(id));
    if (!solucion) throw errorNoEncontrado(`No existe la solución ${id}`);
    return solucion;
  }

  // RN-11: el nombre no se repite dentro del mismo problema.
  async function asegurarUnica(problemaId, valida, idExcluido) {
    asegurarNombreUnico(await repos.soluciones.listar({ problemaId }), valida.nombreNormalizado, idExcluido,
      `Este problema ya tiene una solución llamada "${valida.nombre}"`, 'RN-11');
  }

  // RN-17: el estado del problema tiene que seguir sosteniéndose con las soluciones resultantes.
  async function asegurarConsistencia(solucion, reemplazo) {
    const problema = await problemas.obtenerOFallar(solucion.problemaId);
    const actuales = await repos.soluciones.listar({ problemaId: problema.id });
    const resultantes = actuales
      .filter((s) => s.id !== solucion.id)
      .concat(reemplazo ? [reemplazo] : []);
    verificarConsistencia(problema.estado, resultantes);
  }

  return {
    obtenerOFallar,

    async listarPorProblema(problemaId) {
      const problema = await problemas.obtenerOFallar(problemaId);
      const soluciones = await repos.soluciones.listar({ problemaId: problema.id });
      return soluciones
        .sort((a, b) => b.fechaAplicacion.localeCompare(a.fechaAplicacion))
        .map(aVista);
    },

    async crear(problemaId, datos) {
      const problema = await problemas.obtenerOFallar(problemaId);
      const valida = validarSolucion(datos);
      await asegurarUnica(problema.id, valida, null);
      return aVista(await repos.soluciones.crear({
        problemaId: problema.id, ...valida, ...valoresInicialesSolucion(),
      }));
    },

    async actualizar(id, datos) {
      const actual = await obtenerOFallar(id);
      const valida = validarSolucion(datos);
      validarCambioDeFecha(actual, valida.fechaAplicacion, hoy());
      await asegurarUnica(actual.problemaId, valida, actual.id);
      return aVista(await repos.soluciones.actualizar(actual.id, valida));
    },

    // RN-13: evaluar una solución.
    async evaluar(id, datos) {
      const actual = await obtenerOFallar(id);
      const evaluacion = validarEvaluacion(datos, actual, hoy());
      await asegurarConsistencia(actual, { ...actual, ...evaluacion });
      return aVista(await repos.soluciones.actualizar(actual.id, {
        ...evaluacion, fechaEvaluacion: reloj.ahora(),
      }));
    },

    async eliminar(id) {
      const actual = await obtenerOFallar(id);
      await asegurarConsistencia(actual, null);
      await repos.soluciones.eliminar(actual.id);
    },
  };
}
