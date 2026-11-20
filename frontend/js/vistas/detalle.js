// Detalle de un problema: datos, estado, registro rápido y pestañas (F-03 a F-07, F-09, F-10).
import { api, ErrorApi } from '../api.js';
import {
  h, vaciar, anillo, chipEstado, chipPrioridad, haceCuanto, fechaHora, fechaCalendario, numero,
  ESTADOS, RESULTADOS, GRAVEDADES, avisar, avisarError, confirmar, informar, valorFecha,
} from '../ui.js';
import {
  formularioProblema, formularioOcurrencia, formularioSolucion, formularioEvaluacion,
} from '../formularios.js';

const PESTANAS = [
  { id: 'historial', titulo: 'Historial', mostrar: mostrarHistorial },
  { id: 'ocurrencias', titulo: 'Ocurrencias', mostrar: mostrarOcurrencias },
  { id: 'soluciones', titulo: 'Soluciones', mostrar: mostrarSoluciones },
  { id: 'estadisticas', titulo: 'Estadísticas', mostrar: mostrarEstadisticas },
];

export async function mostrarDetalle(contenedor, id, pestanaPedida) {
  const pestana = PESTANAS.find((p) => p.id === pestanaPedida) ?? PESTANAS[0];
  const problema = await api.get(`/problemas/${id}`);
  const recargar = () => mostrarDetalle(contenedor, id, pestana.id);
  const panel = h('section', { class: 'panel', id: 'panel', role: 'tabpanel', 'aria-labelledby': `pestana-${pestana.id}` });

  vaciar(contenedor,
    h('a', { class: 'volver', href: '#/' }, 'Volver a problemas'),
    cabecera(problema, recargar),
    h('nav', { class: 'pestanas', role: 'tablist', 'aria-label': 'Secciones del problema' },
      PESTANAS.map((p) => h('a', {
        id: `pestana-${p.id}`, role: 'tab', href: `#/problemas/${id}/${p.id}`,
        'aria-selected': String(p.id === pestana.id), 'aria-controls': 'panel',
      }, p.titulo))),
    panel);

  // En pantallas chicas, la fila de pestañas se desplaza para que se vea la elegida.
  const elegida = document.getElementById(`pestana-${pestana.id}`);
  elegida.parentElement.scrollLeft = elegida.offsetLeft - 16;
  await pestana.mostrar(panel, problema, recargar);
}

// ---------- Cabecera ----------

function cabecera(problema, recargar) {
  const resumen = problema.cantidadOcurrencias === 0
    ? 'Todavía no registraste ocurrencias.'
    : `${problema.cantidadOcurrencias} ${problema.cantidadOcurrencias === 1 ? 'vez' : 'veces'} en total, la última ${haceCuanto(problema.fechaUltimaOcurrencia)}.`;

  return h('header', { class: 'ficha' },
    h('div', { class: 'ficha__anillo' },
      anillo(problema.actividad30Dias, { prioridad: problema.prioridad, tamano: 132 }),
      h('p', { class: 'ficha__leyenda' }, 'últimos 30 días')),
    h('div', { class: 'ficha__datos' },
      h('h1', {}, problema.nombre),
      h('p', { class: 'problema__meta' },
        chipEstado(problema.estado), chipPrioridad(problema.prioridad),
        h('span', { class: 'problema__categoria' }, problema.categoriaNombre)),
      problema.descripcion ? h('p', { class: 'ficha__descripcion' }, problema.descripcion) : null,
      h('p', { class: 'ficha__resumen' }, resumen),
      h('div', { class: 'ficha__acciones' },
        h('button', {
          type: 'button', class: 'boton',
          onclick: async () => { if (await formularioOcurrencia(problema).catch(avisarError)) recargar(); },
        }, h('span', { 'aria-hidden': 'true' }, '+'), 'Me volvió a pasar'),
        h('button', {
          type: 'button', class: 'boton--texto',
          onclick: async () => { if (await formularioProblema(problema).catch(avisarError)) recargar(); },
        }, 'Editar'),
        h('button', { type: 'button', class: 'boton--texto peligro', onclick: () => eliminarProblema(problema) }, 'Eliminar'))),
    selectorEstado(problema, recargar));
}

// RN-14 a RN-16: el estado se elige con un control de tres opciones.
function selectorEstado(problema, recargar) {
  return h('fieldset', { class: 'estados' },
    h('legend', {}, 'Estado del problema'),
    h('div', { class: 'estados__opciones' },
      Object.entries(ESTADOS).map(([estado, texto]) => h('button', {
        type: 'button',
        class: `estados__opcion estados__opcion--${estado.toLowerCase()}`,
        'aria-pressed': String(problema.estado === estado),
        onclick: () => problema.estado !== estado && cambiarEstado(problema, estado, recargar),
      }, texto))),
    h('p', { class: 'ayuda' },
      'Controlado: con una solución que funcionó, aunque sea en parte. Solucionado: con una solución que funcionó y 14 días sin que pase.'));
}

async function cambiarEstado(problema, estado, recargar) {
  try {
    await api.patch(`/problemas/${problema.id}/estado`, { estado });
    avisar(`El problema pasó a ${ESTADOS[estado].toLowerCase()}.`);
    recargar();
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 409) {
      informar({
        titulo: `Todavía no puede pasar a ${ESTADOS[estado].toLowerCase()}`,
        mensaje: 'Le falta:',
        detalle: error.detalles?.faltan ?? [error.message],
      });
    } else {
      avisarError(error);
    }
  }
}

// RN-18: si tiene registros asociados, la API pide una segunda confirmación con el detalle.
async function eliminarProblema(problema) {
  const seguro = await confirmar({
    titulo: 'Eliminar problema',
    mensaje: `¿Eliminar "${problema.nombre}"? No se puede deshacer.`,
    textoBoton: 'Eliminar', peligro: true,
  });
  if (!seguro) return;
  try {
    await api.eliminar(`/problemas/${problema.id}`);
  } catch (error) {
    if (!(error instanceof ErrorApi) || error.regla !== 'RN-18') return avisarError(error);
    const d = error.detalles;
    const confirmado = await confirmar({
      titulo: 'También se borra su historia',
      mensaje: `Se van a borrar ${cantidad(d.ocurrencias, 'ocurrencia', 'ocurrencias')}, `
        + `${cantidad(d.soluciones, 'solución', 'soluciones')} y ${cantidad(d.cambiosEstado, 'cambio de estado', 'cambios de estado')}.`,
      textoBoton: 'Eliminar todo', peligro: true,
    });
    if (!confirmado) return;
    try {
      await api.eliminar(`/problemas/${problema.id}?confirmar=true`);
    } catch (e) {
      return avisarError(e);
    }
  }
  avisar('Problema eliminado.');
  location.hash = '#/';
}

const cantidad = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

// ---------- Pestaña: ocurrencias ----------

async function mostrarOcurrencias(panel, problema, recargar) {
  const ocurrencias = await api.get(`/problemas/${problema.id}/ocurrencias`);
  if (ocurrencias.length === 0) {
    return vaciar(panel, h('div', { class: 'vacio' },
      h('p', {}, 'Todavía no hay ocurrencias. Usá "Me volvió a pasar" cada vez que te pase: con los datos vas a ver patrones.')));
  }
  vaciar(panel, h('ul', { class: 'registros' }, ocurrencias.map((o) => h('li', { class: 'registro' },
    h('div', { class: 'registro__cabeza' },
      h('time', { datetime: o.fecha, class: 'registro__fecha' }, fechaHora(o.fecha)),
      h('span', { class: `gravedad-chip gravedad-chip--${o.gravedad}` }, `${GRAVEDADES[o.gravedad]} (${o.gravedad})`)),
    h('p', { class: 'registro__texto' }, o.descripcion),
    o.contexto ? h('p', { class: 'registro__detalle' }, h('strong', {}, 'Contexto: '), o.contexto) : null,
    o.posibleCausa ? h('p', { class: 'registro__detalle' }, h('strong', {}, 'Posible causa: '), o.posibleCausa) : null,
    h('div', { class: 'registro__acciones' },
      h('button', {
        type: 'button', class: 'boton--texto',
        onclick: async () => { if (await formularioOcurrencia(problema, o).catch(avisarError)) recargar(); },
      }, 'Editar'),
      h('button', {
        type: 'button', class: 'boton--texto peligro',
        onclick: async () => {
          const ok = await confirmar({ titulo: 'Eliminar ocurrencia', mensaje: `¿Eliminar la ocurrencia del ${fechaHora(o.fecha)}?`, textoBoton: 'Eliminar', peligro: true });
          if (!ok) return;
          try { await api.eliminar(`/ocurrencias/${o.id}`); avisar('Ocurrencia eliminada.'); recargar(); } catch (e) { avisarError(e); }
        },
      }, 'Eliminar'))))));
}

// ---------- Pestaña: soluciones ----------

async function mostrarSoluciones(panel, problema, recargar) {
  const soluciones = await api.get(`/problemas/${problema.id}/soluciones`);
  const agregar = h('button', {
    type: 'button', class: 'boton boton--secundario',
    onclick: async () => { if (await formularioSolucion(problema).catch(avisarError)) recargar(); },
  }, 'Agregar solución');

  if (soluciones.length === 0) {
    return vaciar(panel, h('div', { class: 'vacio' },
      h('p', {}, 'Anotá lo que vas a probar para resolverlo. Bucle compara cuántas veces pasaba antes y después de cada solución.'),
      agregar));
  }
  vaciar(panel,
    h('div', { class: 'panel__barra' }, agregar),
    h('ul', { class: 'registros' }, soluciones.map((s) => tarjetaSolucion(s, problema, recargar))));
}

function tarjetaSolucion(s, problema, recargar) {
  const empezo = s.fechaAplicacion <= valorFecha();
  return h('li', { class: 'registro solucion' },
    h('div', { class: 'registro__cabeza' },
      h('h3', { class: 'solucion__nombre' }, s.nombre),
      h('span', { class: `resultado resultado--${s.resultado.toLowerCase()}` }, RESULTADOS[s.resultado])),
    h('p', { class: 'registro__fecha' },
      empezo ? `Aplicada desde el ${fechaCalendario(s.fechaAplicacion)}` : `Planificada para el ${fechaCalendario(s.fechaAplicacion)}`),
    s.descripcion ? h('p', { class: 'registro__texto' }, s.descripcion) : null,
    s.observaciones ? h('p', { class: 'registro__detalle' }, h('strong', {}, 'Observaciones: '), s.observaciones) : null,
    bloqueEfectividad(s.efectividad),
    h('div', { class: 'registro__acciones' },
      empezo ? h('button', {
        type: 'button', class: 'boton--texto',
        onclick: async () => { if (await formularioEvaluacion(s).catch(avisarError)) recargar(); },
      }, s.resultado === 'PENDIENTE' ? 'Evaluar' : 'Cambiar evaluación') : null,
      h('button', {
        type: 'button', class: 'boton--texto',
        onclick: async () => { if (await formularioSolucion(problema, s).catch(avisarError)) recargar(); },
      }, 'Editar'),
      h('button', {
        type: 'button', class: 'boton--texto peligro',
        onclick: async () => {
          const ok = await confirmar({ titulo: 'Eliminar solución', mensaje: `¿Eliminar "${s.nombre}"?`, textoBoton: 'Eliminar', peligro: true });
          if (!ok) return;
          try {
            await api.eliminar(`/soluciones/${s.id}`);
            avisar('Solución eliminada.');
            recargar();
          } catch (e) {
            if (e instanceof ErrorApi && e.regla === 'RN-17') informar({ titulo: 'No se puede eliminar', mensaje: e.message });
            else avisarError(e);
          }
        },
      }, 'Eliminar')));
}

// RN-20: lo que dicen los datos, al lado de la evaluación del usuario.
export function bloqueEfectividad(e) {
  if (e.estado === 'PLANIFICADA') return null;
  if (e.estado === 'EN_OBSERVACION') {
    const faltan = 7 - e.diasObservados;
    return h('p', { class: 'efectividad efectividad--espera' },
      `En observación: en ${faltan} ${faltan === 1 ? 'día' : 'días'} vas a poder comparar con los datos.`);
  }
  if (e.estado === 'SIN_DATOS_PREVIOS') {
    return h('p', { class: 'efectividad efectividad--espera' },
      'No hay ocurrencias en las 4 semanas anteriores a la solución, así que no se puede comparar.');
  }
  const m = e.mejoraPorcentaje;
  const veredicto = m > 0 ? `${m} % menos seguido` : m < 0 ? `${Math.abs(m)} % más seguido` : 'Sin cambios';
  const tono = m > 0 ? 'mejor' : m < 0 ? 'peor' : 'igual';
  return h('div', { class: `efectividad efectividad--${tono}` },
    h('p', { class: 'efectividad__veredicto' }, veredicto),
    h('p', { class: 'efectividad__detalle' },
      `Según tus datos: antes pasaba ${numero(e.tasaSemanalAntes)} ${e.tasaSemanalAntes === 1 ? 'vez' : 'veces'} por semana; `
      + `después, ${numero(e.tasaSemanalDespues)} (${e.diasObservados} días observados).`));
}

// ---------- Pestaña: historial (RN-22) ----------

function textoEvento(e) {
  switch (e.tipo) {
    case 'OCURRENCIA':
      return { titulo: 'Volvió a pasar', texto: e.descripcion, nota: `Gravedad: ${GRAVEDADES[e.gravedad].toLowerCase()}` };
    case 'SOLUCION_APLICADA':
      return { titulo: `Empezaste a probar "${e.nombre}"` };
    case 'SOLUCION_EVALUADA':
      return { titulo: `"${e.nombre}": ${RESULTADOS[e.resultado].toLowerCase()}`, texto: e.observaciones };
    case 'CAMBIO_ESTADO':
      return e.motivo === 'RECAIDA'
        ? { titulo: 'Recaída: volvió a activo', texto: 'Pasó otra vez después de haberlo marcado como solucionado.' }
        : { titulo: `Pasó a ${ESTADOS[e.estadoNuevo].toLowerCase()}` };
    default:
      return { titulo: e.tipo };
  }
}

async function mostrarHistorial(panel, problema) {
  const eventos = await api.get(`/problemas/${problema.id}/historial`);
  if (eventos.length === 0) {
    return vaciar(panel, h('div', { class: 'vacio' },
      h('p', {}, 'Acá vas a ver, en orden, cada vez que pasó, las soluciones que probaste y los cambios de estado.')));
  }
  vaciar(panel, h('ol', { class: 'linea-tiempo' }, eventos.map((e) => {
    const { titulo, texto, nota } = textoEvento(e);
    const fecha = e.tipo === 'SOLUCION_APLICADA' ? fechaCalendario(e.fechaAplicacion) : fechaHora(e.fecha);
    const tono = e.tipo === 'CAMBIO_ESTADO' ? (e.motivo === 'RECAIDA' ? 'recaida' : 'estado') : e.tipo.toLowerCase();
    return h('li', { class: `evento evento--${tono}` },
      h('time', { class: 'evento__fecha', datetime: e.fecha }, fecha),
      h('p', { class: 'evento__titulo' }, titulo),
      texto ? h('p', { class: 'evento__texto' }, texto) : null,
      nota ? h('p', { class: 'evento__nota' }, nota) : null);
  })));
}

// ---------- Pestaña: estadísticas (RN-21) ----------

async function mostrarEstadisticas(panel, problema) {
  const e = await api.get(`/problemas/${problema.id}/estadisticas`);
  if (e.totalOcurrencias === 0) {
    return vaciar(panel, h('div', { class: 'vacio' },
      h('p', {}, 'Las estadísticas aparecen cuando registrás ocurrencias.')));
  }
  const dato = (valor, etiqueta) => h('div', { class: 'dato' },
    h('dt', { class: 'dato__etiqueta' }, etiqueta), h('dd', { class: 'dato__valor' }, valor));
  const veces = (n) => `${n} ${n === 1 ? 'vez' : 'veces'}`;
  const sr = e.solucionesPorResultado;
  const totalSoluciones = Object.values(sr).reduce((a, b) => a + b, 0);

  vaciar(panel,
    h('dl', { class: 'datos' },
      dato(e.totalOcurrencias, 'veces en total'),
      dato(e.ocurrenciasUltimos30Dias, 'en los últimos 30 días'),
      dato(numero(e.promedioSemanal), 'por semana, en promedio'),
      dato(numero(e.gravedadPromedio), 'de gravedad promedio (1 a 5)')),
    h('div', { class: 'patrones' },
      h('h2', {}, 'Cuándo pasa más'),
      h('p', {}, 'Más seguido los ', h('strong', {}, e.diaMasFrecuente.dia), ` (${veces(e.diaMasFrecuente.cantidad)}) `,
        'y a la ', h('strong', {}, e.franjaMasFrecuente.franja), ` (${veces(e.franjaMasFrecuente.cantidad)}).`),
      h('h2', {}, 'Soluciones'),
      totalSoluciones === 0
        ? h('p', {}, 'Todavía no registraste soluciones.')
        : h('ul', { class: 'lista-simple' },
          Object.entries(sr).filter(([, n]) => n > 0).map(([r, n]) => h('li', {}, `${RESULTADOS[r]}: ${n}`))),
      e.mejorSolucion
        ? h('p', { class: 'mejor-solucion' }, 'La que mejor resultado dio según tus datos: ',
          h('strong', {}, e.mejorSolucion.nombre), ` (${e.mejorSolucion.mejoraPorcentaje} % menos seguido).`)
        : null));
}
