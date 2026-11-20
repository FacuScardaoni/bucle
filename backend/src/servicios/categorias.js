import { validarCategoria } from '../dominio/categoria.js';
import { asegurarNombreUnico, idValido } from '../dominio/validaciones.js';
import { errorNoEncontrado, errorConflicto } from '../dominio/errores.js';

// Lo que devuelve la API (sin campos internos).
function aVista(categoria, cantidadProblemas) {
  const { nombreNormalizado, ...vista } = categoria;
  return { ...vista, cantidadProblemas };
}

export function crearServicioCategorias({ repos }) {
  async function obtenerOFallar(id, regla) {
    const categoria = await repos.categorias.obtener(idValido(id, 'categoriaId', regla));
    if (!categoria) throw errorNoEncontrado(`No existe la categoría ${id}`, regla);
    return categoria;
  }

  async function contarProblemas(categoriaId) {
    return (await repos.problemas.listar({ categoriaId })).length;
  }

  return {
    obtenerOFallar,

    async listar() {
      const [categorias, problemas] = await Promise.all([repos.categorias.listar(), repos.problemas.listar()]);
      return categorias
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map((c) => aVista(c, problemas.filter((p) => p.categoriaId === c.id).length));
    },

    async obtener(id) {
      const categoria = await obtenerOFallar(id);
      return aVista(categoria, await contarProblemas(categoria.id));
    },

    async crear(datos) {
      const valida = validarCategoria(datos);
      asegurarNombreUnico(await repos.categorias.listar(), valida.nombreNormalizado, null,
        `Ya existe una categoría llamada "${valida.nombre}"`, 'RN-02');
      return aVista(await repos.categorias.crear(valida), 0);
    },

    async actualizar(id, datos) {
      const actual = await obtenerOFallar(id);
      const valida = validarCategoria(datos);
      asegurarNombreUnico(await repos.categorias.listar(), valida.nombreNormalizado, actual.id,
        `Ya existe una categoría llamada "${valida.nombre}"`, 'RN-02');
      const actualizada = await repos.categorias.actualizar(actual.id, valida);
      return aVista(actualizada, await contarProblemas(actual.id));
    },

    // RN-03: no se puede eliminar una categoría con problemas asociados.
    async eliminar(id) {
      const categoria = await obtenerOFallar(id);
      const cantidad = await contarProblemas(categoria.id);
      if (cantidad > 0) {
        throw errorConflicto(
          `No se puede eliminar la categoría "${categoria.nombre}" porque tiene ${cantidad} problema(s) asociado(s)`,
          'RN-03', { problemas: cantidad });
      }
      await repos.categorias.eliminar(categoria.id);
    },
  };
}
