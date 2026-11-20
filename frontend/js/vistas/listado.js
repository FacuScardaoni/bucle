// Pantalla principal: problemas con búsqueda, filtros y registro rápido (F-08).
import { api, ErrorApi } from '../api.js';
import {
  h, vaciar, anillo, chipEstado, chipPrioridad, haceCuanto, ESTADOS, PRIORIDADES, avisarError,
} from '../ui.js';
import { formularioProblema, formularioOcurrencia } from '../formularios.js';

// Los filtros se conservan mientras se navega por la aplicación.
const filtros = { q: '', categoria: '', estado: '', prioridad: '' };

export async function mostrarListado(contenedor) {
  const categorias = await api.get('/categorias');
  const resultados = h('div', { class: 'resultados', 'aria-live': 'polite' });

  vaciar(contenedor,
    h('div', { class: 'encabezado' },
      h('h1', {}, 'Problemas'),
      h('button', { type: 'button', class: 'boton', onclick: nuevoProblema }, 'Nuevo problema')),
    barraDeFiltros(categorias, () => cargar(resultados)),
    resultados);

  await cargar(resultados);

  async function nuevoProblema() {
    const creado = await formularioProblema().catch(avisarError);
    if (creado) location.hash = `#/problemas/${creado.id}`;
  }
}

function barraDeFiltros(categorias, alCambiar) {
  let espera;
  const ayudaBusqueda = h('p', { class: 'ayuda', id: 'ayuda-busqueda' });
  const busqueda = h('input', {
    type: 'search', id: 'buscar', value: filtros.q, placeholder: 'Buscar por nombre o descripción',
    'aria-describedby': 'ayuda-busqueda',
    oninput: () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        const texto = busqueda.value.trim();
        ayudaBusqueda.textContent = texto.length === 1 ? 'Escribí al menos 2 letras.' : '';
        if (texto.length === 1) return;
        filtros.q = texto;
        alCambiar();
      }, 300);
    },
  });

  const selector = (clave, etiqueta, opciones) => h('label', { class: 'filtro' },
    h('span', {}, etiqueta),
    h('select', {
      onchange: (e) => { filtros[clave] = e.target.value; alCambiar(); },
    }, h('option', { value: '' }, 'Todas'),
    opciones.map(([valor, texto]) => h('option', { value: valor, selected: String(filtros[clave]) === String(valor) }, texto))));

  return h('section', { class: 'filtros', 'aria-label': 'Buscar y filtrar' },
    h('div', { class: 'filtros__busqueda' },
      h('label', { for: 'buscar', class: 'visualmente-oculto' }, 'Buscar'),
      busqueda, ayudaBusqueda),
    h('div', { class: 'filtros__selectores' },
      selector('categoria', 'Categoría', categorias.map((c) => [c.id, c.nombre])),
      selector('estado', 'Estado', Object.entries(ESTADOS)),
      selector('prioridad', 'Prioridad', Object.entries(PRIORIDADES))));
}

const hayFiltros = () => Object.values(filtros).some(Boolean);

async function cargar(resultados) {
  const parametros = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
  let problemas;
  try {
    problemas = await api.get(`/problemas?${parametros}`);
  } catch (error) {
    if (error instanceof ErrorApi) return vaciar(resultados, h('p', { class: 'vacio' }, error.message));
    throw error;
  }

  if (problemas.length === 0) return vaciar(resultados, estadoVacio(resultados));
  vaciar(resultados,
    h('p', { class: 'resultados__cuenta' }, problemas.length === 1 ? '1 problema' : `${problemas.length} problemas`),
    h('ul', { class: 'problemas' }, problemas.map((p) => filaProblema(p, () => cargar(resultados)))));
}

function estadoVacio(resultados) {
  if (hayFiltros()) {
    return h('div', { class: 'vacio' },
      h('p', {}, 'No se encontraron problemas con esa búsqueda.'),
      h('button', {
        type: 'button', class: 'boton boton--secundario',
        onclick: () => {
          Object.keys(filtros).forEach((k) => { filtros[k] = ''; });
          document.getElementById('buscar').value = '';
          document.querySelectorAll('.filtros select').forEach((s) => { s.value = ''; });
          cargar(resultados);
        },
      }, 'Limpiar filtros'));
  }
  return h('div', { class: 'vacio vacio--inicio' },
    h('p', { class: 'vacio__titulo' }, 'Todavía no registraste ningún problema.'),
    h('p', {}, 'Empezá por algo que te pase seguido: llegar tarde, olvidarte algo, gastar de más.'));
}

function filaProblema(p, recargar) {
  const ultima = p.fechaUltimaOcurrencia
    ? `Última vez ${haceCuanto(p.fechaUltimaOcurrencia)}`
    : 'Sin ocurrencias todavía';

  return h('li', { class: 'problema' },
    h('a', { class: 'problema__anillo', href: `#/problemas/${p.id}`, tabindex: '-1', 'aria-hidden': 'true' },
      anillo(p.actividad30Dias, { prioridad: p.prioridad })),
    h('div', { class: 'problema__datos' },
      h('a', { class: 'problema__nombre', href: `#/problemas/${p.id}` }, p.nombre),
      h('p', { class: 'problema__meta' },
        chipEstado(p.estado), chipPrioridad(p.prioridad), h('span', { class: 'problema__categoria' }, p.categoriaNombre)),
      h('p', { class: 'problema__ultima' },
        h('span', {}, ultima), h('span', {}, `${p.cantidadOcurrencias} en total`))),
    h('button', {
      type: 'button', class: 'boton boton--secundario boton--pasar',
      'aria-label': `Me volvió a pasar: ${p.nombre}`,
      onclick: async () => {
        const registrada = await formularioOcurrencia(p).catch(avisarError);
        if (registrada) recargar();
      },
    }, h('span', { 'aria-hidden': 'true' }, '+'), h('span', { class: 'boton__texto' }, 'Me volvió a pasar')));
}
