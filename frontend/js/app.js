// Punto de entrada: navegación por "#" sin recargar la página.
import { api, ErrorApi } from './api.js';
import { h, vaciar } from './ui.js';
import { mostrarListado } from './vistas/listado.js';

const contenido = document.getElementById('contenido');

// Cada ruta: expresión, sección del menú que se marca y función que dibuja la pantalla.
const rutas = [
  { patron: /^#?\/?$/, seccion: 'problemas', mostrar: () => mostrarListado(contenido) },
];

async function navegar() {
  const hash = location.hash || '#/';
  const ruta = rutas.find((r) => r.patron.test(hash));
  marcarMenu(ruta?.seccion);
  if (!ruta) return mostrarNoEncontrado();
  try {
    await ruta.mostrar(...hash.match(ruta.patron).slice(1));
  } catch (error) {
    mostrarError(error);
  }
  contenido.focus({ preventScroll: true });
}

function marcarMenu(seccion) {
  document.querySelectorAll('.menu a').forEach((a) => {
    if (a.dataset.seccion === seccion) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function mostrarNoEncontrado() {
  vaciar(contenido, h('div', { class: 'vacio' },
    h('h1', {}, 'Esta página no existe'),
    h('a', { class: 'boton', href: '#/' }, 'Ir a mis problemas')));
}

function mostrarError(error) {
  if (!(error instanceof ErrorApi)) console.error(error);
  const noEncontrado = error instanceof ErrorApi && error.status === 404;
  vaciar(contenido, h('div', { class: 'vacio' },
    h('h1', {}, noEncontrado ? 'No encontramos lo que buscabas' : 'No se pudo cargar la página'),
    h('p', {}, error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.'),
    noEncontrado
      ? h('a', { class: 'boton', href: '#/' }, 'Ir a mis problemas')
      : h('button', { type: 'button', class: 'boton', onclick: navegar }, 'Reintentar')));
}

window.addEventListener('hashchange', navegar);
navegar();

// Despierta el servidor de Render apenas se abre la aplicación.
api.get('/salud').catch(() => {});
