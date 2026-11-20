import { validarProblema, valoresIniciales } from '../dominio/problema.js';
import { asegurarNombreUnico, idValido } from '../dominio/validaciones.js';
import { errorNoEncontrado } from '../dominio/errores.js';

export function crearServicioProblemas({ repos, reloj, categorias }) {
  async function obtenerOFallar(id) {
    const problema = await repos.problemas.obtener(idValido(id));
    if (!problema) throw errorNoEncontrado(`No existe el problema ${id}`);
    return problema;
  }

  // Lo que devuelve la API: datos guardados + nombre de categoría.
  function aVista(problema, categoria) {
    const { nombreNormalizado, ...vista } = problema;
    return { ...vista, categoriaNombre: categoria?.nombre ?? null };
  }

  async function vistaDe(problema) {
    return aVista(problema, await repos.categorias.obtener(problema.categoriaId));
  }

  async function validarYVerificar(datos, idExcluido) {
    const valido = validarProblema(datos);
    await categorias.obtenerOFallar(valido.categoriaId, 'RN-05');
    asegurarNombreUnico(await repos.problemas.listar(), valido.nombreNormalizado, idExcluido,
      `Ya existe un problema llamado "${valido.nombre}"`, 'RN-04');
    return valido;
  }

  return {
    obtenerOFallar,

    async listar() {
      const [problemas, cats] = await Promise.all([repos.problemas.listar(), repos.categorias.listar()]);
      const porId = new Map(cats.map((c) => [c.id, c]));
      return problemas.map((p) => aVista(p, porId.get(p.categoriaId)));
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
  };
}
