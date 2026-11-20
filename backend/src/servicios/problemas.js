import { validarProblema, valoresIniciales, datosDerivados, calcularPrioridad } from '../dominio/problema.js';
import { asegurarNombreUnico, idValido } from '../dominio/validaciones.js';
import { errorNoEncontrado } from '../dominio/errores.js';
import { validarCambioEstado } from '../dominio/estados.js';
import { MOTIVOS_CAMBIO } from '../dominio/enums.js';

function agruparPorProblema(registros) {
  const grupos = new Map();
  for (const r of registros) {
    if (!grupos.has(r.problemaId)) grupos.set(r.problemaId, []);
    grupos.get(r.problemaId).push(r);
  }
  return grupos;
}

export function crearServicioProblemas({ repos, reloj, categorias }) {
  async function obtenerOFallar(id) {
    const problema = await repos.problemas.obtener(idValido(id));
    if (!problema) throw errorNoEncontrado(`No existe el problema ${id}`);
    return problema;
  }

  // Lo que devuelve la API: datos guardados + nombre de categoría + valores calculados.
  function aVista(problema, categoria, ocurrencias) {
    const { nombreNormalizado, ...vista } = problema;
    return {
      ...vista,
      categoriaNombre: categoria?.nombre ?? null,
      ...datosDerivados(ocurrencias),
      prioridad: calcularPrioridad(ocurrencias, reloj.ahora()),
    };
  }

  async function vistaDe(problema) {
    const [categoria, ocurrencias] = await Promise.all([
      repos.categorias.obtener(problema.categoriaId),
      repos.ocurrencias.listar({ problemaId: problema.id }),
    ]);
    return aVista(problema, categoria, ocurrencias);
  }

  async function validarYVerificar(datos, idExcluido) {
    const valido = validarProblema(datos);
    await categorias.obtenerOFallar(valido.categoriaId, 'RN-05');
    asegurarNombreUnico(await repos.problemas.listar(), valido.nombreNormalizado, idExcluido,
      `Ya existe un problema llamado "${valido.nombre}"`, 'RN-04');
    return valido;
  }

  // Cambia el estado y deja el registro para el historial (RN-16).
  // Recibe los repositorios de la transacción en curso.
  async function aplicarCambioEstado(r, problema, estadoNuevo, motivo) {
    const ahora = reloj.ahora();
    await r.cambiosEstado.crear({
      problemaId: problema.id, estadoAnterior: problema.estado, estadoNuevo, motivo, fecha: ahora,
    });
    return r.problemas.actualizar(problema.id, { estado: estadoNuevo, fechaEstado: ahora });
  }

  return {
    obtenerOFallar,
    aplicarCambioEstado,

    async listar() {
      const [problemas, cats, ocurrencias] = await Promise.all([
        repos.problemas.listar(), repos.categorias.listar(), repos.ocurrencias.listar(),
      ]);
      const categoriasPorId = new Map(cats.map((c) => [c.id, c]));
      const ocurrenciasPorProblema = agruparPorProblema(ocurrencias);
      return problemas.map((p) =>
        aVista(p, categoriasPorId.get(p.categoriaId), ocurrenciasPorProblema.get(p.id) ?? []));
    },

    async obtener(id) {
      return vistaDe(await obtenerOFallar(id));
    },

    async crear(datos) {
      const valido = await validarYVerificar(datos, null);
      const creado = await repos.problemas.crear({ ...valido, ...valoresIniciales(reloj.ahora()) });
      return vistaDe(creado);
    },

    async actualizar(id, datos) {
      const actual = await obtenerOFallar(id);
      const valido = await validarYVerificar(datos, actual.id);
      return vistaDe(await repos.problemas.actualizar(actual.id, valido));
    },

    // RN-14 a RN-16: cambio manual de estado.
    async cambiarEstado(id, datos = {}) {
      const problema = await obtenerOFallar(id);
      const [soluciones, ocurrencias] = await Promise.all([
        repos.soluciones.listar({ problemaId: problema.id }),
        repos.ocurrencias.listar({ problemaId: problema.id }),
      ]);
      validarCambioEstado(problema, datos.estado, soluciones, ocurrencias, reloj.ahora());
      const actualizado = await repos.transaccion((r) =>
        aplicarCambioEstado(r, problema, datos.estado, MOTIVOS_CAMBIO.MANUAL));
      return vistaDe(actualizado);
    },
  };
}
