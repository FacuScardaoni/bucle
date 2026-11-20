// Gestión de categorías (F-01, RN-02 y RN-03).
import { api, ErrorApi } from '../api.js';
import { h, vaciar, avisar, avisarError, confirmar, informar } from '../ui.js';
import { formularioCategoria } from '../formularios.js';

export async function mostrarCategorias(contenedor) {
  const categorias = await api.get('/categorias');
  const recargar = () => mostrarCategorias(contenedor);

  const nueva = h('button', {
    type: 'button', class: 'boton',
    onclick: async () => { if (await formularioCategoria().catch(avisarError)) recargar(); },
  }, 'Nueva categoría');

  vaciar(contenedor,
    h('div', { class: 'encabezado' }, h('h1', {}, 'Categorías'), nueva),
    categorias.length === 0
      ? h('div', { class: 'vacio' }, h('p', {}, 'Las categorías agrupan tus problemas: "Puntualidad", "Finanzas", "Olvidos"…'))
      : h('ul', { class: 'registros' }, categorias.map((c) => filaCategoria(c, recargar))));
}

function filaCategoria(c, recargar) {
  return h('li', { class: 'registro categoria' },
    h('div', { class: 'registro__cabeza' },
      h('h2', { class: 'categoria__nombre' }, c.nombre),
      h('span', { class: 'registro__fecha' },
        c.cantidadProblemas === 1 ? '1 problema' : `${c.cantidadProblemas} problemas`)),
    c.descripcion ? h('p', { class: 'registro__texto' }, c.descripcion) : null,
    h('div', { class: 'registro__acciones' },
      h('button', {
        type: 'button', class: 'boton--texto',
        onclick: async () => { if (await formularioCategoria(c).catch(avisarError)) recargar(); },
      }, 'Editar'),
      h('button', { type: 'button', class: 'boton--texto peligro', onclick: () => eliminar(c, recargar) }, 'Eliminar')));
}

async function eliminar(c, recargar) {
  const ok = await confirmar({
    titulo: 'Eliminar categoría', mensaje: `¿Eliminar "${c.nombre}"?`, textoBoton: 'Eliminar', peligro: true,
  });
  if (!ok) return;
  try {
    await api.eliminar(`/categorias/${c.id}`);
    avisar('Categoría eliminada.');
    recargar();
  } catch (error) {
    // RN-03: una categoría con problemas no se puede borrar.
    if (error instanceof ErrorApi && error.regla === 'RN-03') {
      informar({
        titulo: 'Esta categoría está en uso',
        mensaje: `${error.message}. Pasá esos problemas a otra categoría o eliminalos primero.`,
      });
    } else {
      avisarError(error);
    }
  }
}
