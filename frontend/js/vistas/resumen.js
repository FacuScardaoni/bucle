// Resumen general (RN-21): cómo están todos los problemas juntos.
import { api } from '../api.js';
import { h, vaciar, ESTADOS } from '../ui.js';

export async function mostrarResumen(contenedor) {
  const r = await api.get('/estadisticas');
  if (r.totalProblemas === 0) {
    return vaciar(contenedor,
      h('div', { class: 'encabezado' }, h('h1', {}, 'Resumen')),
      h('div', { class: 'vacio' },
        h('p', {}, 'Cuando registres problemas, acá vas a ver cuáles se repiten más y cómo van.'),
        h('a', { class: 'boton', href: '#/' }, 'Ir a mis problemas')));
  }

  vaciar(contenedor,
    h('div', { class: 'encabezado' }, h('h1', {}, 'Resumen')),
    h('p', { class: 'resumen__frase' },
      `${r.totalProblemas} ${r.totalProblemas === 1 ? 'problema registrado' : 'problemas registrados'}, `,
      `${r.ocurrenciasUltimos30Dias} ${r.ocurrenciasUltimos30Dias === 1 ? 'ocurrencia' : 'ocurrencias'} en los últimos 30 días.`),
    barraEstados(r),
    h('div', { class: 'resumen__columnas' },
      h('section', {},
        h('h2', {}, 'Los que más se repiten'),
        h('p', { class: 'ayuda' }, 'Últimos 30 días'),
        r.masFrecuentes.length === 0
          ? h('p', {}, 'Nada se repitió en los últimos 30 días.')
          : h('ol', { class: 'ranking' }, r.masFrecuentes.map((p) => fila(
            h('a', { href: `#/problemas/${p.id}` }, p.nombre), p.ocurrenciasUltimos30Dias, r.masFrecuentes[0].ocurrenciasUltimos30Dias)))),
      h('section', {},
        h('h2', {}, 'Por categoría'),
        h('p', { class: 'ayuda' }, 'Cantidad de problemas'),
        h('ul', { class: 'ranking ranking--sin-numeros' },
          r.porCategoria.map((c) => fila(c.nombre, c.cantidad, Math.max(1, r.porCategoria[0].cantidad)))))));
}

// Una barra dividida en los tres estados, proporcional a la cantidad de problemas.
function barraEstados(r) {
  const partes = Object.entries(r.porEstado).filter(([, n]) => n > 0);
  return h('figure', { class: 'estados-barra' },
    h('div', { class: 'estados-barra__barra', role: 'img',
      'aria-label': partes.map(([e, n]) => `${ESTADOS[e]}: ${n}`).join(', ') },
    partes.map(([estado, n]) => h('span', {
      class: `estados-barra__parte estados-barra__parte--${estado.toLowerCase()}`,
      style: `flex-grow: ${n}`,
    }))),
    h('figcaption', { class: 'estados-barra__leyenda' },
      Object.entries(r.porEstado).map(([estado, n]) => h('span', { class: `leyenda leyenda--${estado.toLowerCase()}` },
        h('strong', {}, n), ` ${ESTADOS[estado].toLowerCase()}${n === 1 ? '' : 's'}`))));
}

function fila(nombre, valor, maximo) {
  return h('li', { class: 'ranking__fila' },
    h('span', { class: 'ranking__nombre' }, nombre),
    h('span', { class: 'ranking__valor' }, valor),
    h('span', { class: 'ranking__barra', 'aria-hidden': 'true' },
      h('span', { style: `width: ${(valor / maximo) * 100}%` })));
}
