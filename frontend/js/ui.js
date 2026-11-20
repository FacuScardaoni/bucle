// Utilidades de interfaz: creación de elementos, formatos, avisos, diálogos y el anillo de actividad.
import { ErrorApi } from './api.js';

// ---------- Creación de elementos (sin innerHTML: el texto del usuario nunca se interpreta como HTML) ----------

export function h(etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props ?? {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2), valor);
    else if (clave === 'class') el.className = valor;
    else if (clave in el && typeof valor !== 'string') el[clave] = valor;
    else el.setAttribute(clave, valor === true ? '' : valor);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

export function vaciar(el, ...hijos) {
  el.replaceChildren();
  agregar(el, hijos);
  return el;
}

// ---------- Textos ----------

export const ESTADOS = { ACTIVO: 'Activo', CONTROLADO: 'Controlado', SOLUCIONADO: 'Solucionado' };
export const PRIORIDADES = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };
export const RESULTADOS = {
  PENDIENTE: 'Sin evaluar', FUNCIONO: 'Funcionó', PARCIAL: 'Funcionó en parte', NO_FUNCIONO: 'No funcionó',
};
export const GRAVEDADES = { 1: 'Muy leve', 2: 'Leve', 3: 'Moderada', 4: 'Grave', 5: 'Muy grave' };

export function chipEstado(estado) {
  return h('span', { class: `chip chip--${estado.toLowerCase()}` }, ESTADOS[estado]);
}

export function chipPrioridad(prioridad) {
  return h('span', { class: `prioridad prioridad--${prioridad.toLowerCase()}`, title: 'Prioridad según los últimos 30 días' },
    `Prioridad ${PRIORIDADES[prioridad].toLowerCase()}`);
}

// ---------- Fechas (se muestran en la hora local del navegador) ----------

const formatoFechaHora = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const formatoFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

export const fechaHora = (iso) => formatoFechaHora.format(new Date(iso));
export const fechaCalendario = (texto) => formatoFecha.format(new Date(`${texto}T12:00:00`));

const inicioDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

export function haceCuanto(iso) {
  const dias = Math.round((inicioDia(new Date()) - inicioDia(new Date(iso))) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? 'hace un mes' : `hace ${meses} meses`;
}

// Valor para <input type="datetime-local"> y <input type="date"> en hora local.
const dosDigitos = (n) => String(n).padStart(2, '0');
export function valorFechaHoraLocal(fecha = new Date()) {
  return `${valorFecha(fecha)}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}
export function valorFecha(fecha = new Date()) {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

export const numero = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

// ---------- Avisos breves ----------

export function avisar(mensaje, tipo = 'ok') {
  const aviso = h('div', { class: `aviso aviso--${tipo}`, role: tipo === 'error' ? 'alert' : 'status' }, mensaje);
  document.getElementById('avisos').append(aviso);
  setTimeout(() => aviso.remove(), tipo === 'error' ? 7000 : 4500);
}

export function avisarError(error) {
  avisar(error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.', 'error');
}

// ---------- Diálogos ----------

function abrirDialogo(contenido, { ancho = 'normal' } = {}) {
  const dialogo = h('dialog', { class: `dialogo dialogo--${ancho}` }, contenido);
  dialogo.addEventListener('close', () => dialogo.remove());
  document.body.append(dialogo);
  dialogo.showModal();
  return dialogo;
}

// Pide confirmación. Devuelve una promesa con true o false.
export function confirmar({ titulo, mensaje, textoBoton, peligro = false }) {
  return new Promise((resolver) => {
    let aceptado = false;
    const dialogo = abrirDialogo(h('div', { class: 'dialogo__cuerpo' },
      h('h2', {}, titulo),
      h('p', {}, mensaje),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'boton boton--secundario', onclick: () => dialogo.close() }, 'Cancelar'),
        h('button', {
          type: 'button', class: peligro ? 'boton boton--peligro' : 'boton',
          onclick: () => { aceptado = true; dialogo.close(); },
        }, textoBoton),
      )));
    dialogo.addEventListener('close', () => resolver(aceptado));
  });
}

// Mensaje informativo con un solo botón.
export function informar({ titulo, mensaje, detalle = [] }) {
  const dialogo = abrirDialogo(h('div', { class: 'dialogo__cuerpo' },
    h('h2', {}, titulo),
    h('p', {}, mensaje),
    detalle.length ? h('ul', { class: 'lista-simple' }, detalle.map((d) => h('li', {}, d))) : null,
    h('div', { class: 'acciones' },
      h('button', { type: 'button', class: 'boton', onclick: () => dialogo.close() }, 'Entendido'))));
}

// Formulario en un diálogo.
// campos: [{ nombre, etiqueta, tipo, valor, requerido, min, max, largoMin, largoMax, opciones, ayuda }]
// alEnviar(valores) debe devolver una promesa; si la API devuelve un error de un campo, se muestra junto a ese campo.
export function abrirFormulario({ titulo, descripcion, campos, textoBoton, alEnviar }) {
  const errores = new Map();
  const general = h('p', { class: 'error-general', role: 'alert', hidden: true });
  const boton = h('button', { type: 'submit', class: 'boton' }, textoBoton);

  const filas = campos.map((campo) => {
    const id = `campo-${campo.nombre}`;
    const error = h('p', { class: 'error-campo', id: `${id}-error`, role: 'alert' });
    errores.set(campo.nombre, error);
    return h('div', { class: 'campo' },
      h('label', { for: id }, campo.etiqueta, campo.requerido ? null : h('span', { class: 'opcional' }, ' (opcional)')),
      crearControl(campo, id),
      campo.ayuda ? h('p', { class: 'ayuda' }, campo.ayuda) : null,
      error);
  });

  const formulario = h('form', { class: 'dialogo__cuerpo formulario', novalidate: true },
    h('h2', {}, titulo),
    descripcion ? h('p', { class: 'formulario__descripcion' }, descripcion) : null,
    filas,
    general,
    h('div', { class: 'acciones' },
      h('button', { type: 'button', class: 'boton boton--secundario', onclick: () => dialogo.close() }, 'Cancelar'),
      boton));

  const dialogo = abrirDialogo(formulario);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    errores.forEach((e) => { e.textContent = ''; });
    general.hidden = true;
    const valores = Object.fromEntries(campos.map((c) => [c.nombre, leerControl(formulario, c)]));
    const errorLocal = validarLocal(campos, valores);
    if (errorLocal) return mostrarError(errorLocal.campo, errorLocal.mensaje);

    boton.disabled = true;
    try {
      await alEnviar(valores);
      dialogo.close();
    } catch (error) {
      if (!(error instanceof ErrorApi)) throw error;
      mostrarError(error.campo, error.message);
    } finally {
      boton.disabled = false;
    }
  });

  function mostrarError(campo, mensaje) {
    const lugar = campo && errores.get(campo);
    if (lugar) {
      lugar.textContent = mensaje;
      formulario.elements[campo]?.focus();
    } else {
      general.textContent = mensaje;
      general.hidden = false;
    }
  }

  formulario.querySelector('input, textarea, select')?.focus();
  return dialogo;
}

function crearControl(campo, id) {
  const comunes = { id, name: campo.nombre, 'aria-describedby': `${id}-error` };
  if (campo.tipo === 'textarea') {
    return h('textarea', { ...comunes, rows: 3, maxlength: campo.largoMax }, campo.valor ?? '');
  }
  if (campo.tipo === 'select') {
    return h('select', comunes, campo.opciones.map(([valor, texto]) =>
      h('option', { value: valor, selected: String(valor) === String(campo.valor ?? '') }, texto)));
  }
  if (campo.tipo === 'gravedad') {
    return h('div', { class: 'gravedad', role: 'radiogroup', 'aria-label': campo.etiqueta },
      [1, 2, 3, 4, 5].map((n) => h('label', { class: 'gravedad__opcion' },
        h('input', { type: 'radio', name: campo.nombre, value: n, checked: Number(campo.valor ?? 3) === n }),
        h('span', { class: 'gravedad__numero' }, n),
        h('span', { class: 'gravedad__texto' }, GRAVEDADES[n]))));
  }
  return h('input', {
    ...comunes, type: campo.tipo ?? 'text', value: campo.valor ?? '',
    min: campo.min, max: campo.max, maxlength: campo.largoMax, autocomplete: 'off',
  });
}

function leerControl(formulario, campo) {
  const control = formulario.elements[campo.nombre];
  const valor = control?.value ?? '';
  return typeof valor === 'string' ? valor.trim() : valor;
}

// Validación rápida en el navegador. La fuente de verdad son las reglas del backend.
function validarLocal(campos, valores) {
  for (const c of campos) {
    const valor = valores[c.nombre];
    if (c.requerido && !valor) return { campo: c.nombre, mensaje: `Completá "${c.etiqueta.toLowerCase()}".` };
    if (valor && c.largoMin && valor.length < c.largoMin) {
      return { campo: c.nombre, mensaje: `Tiene que tener al menos ${c.largoMin} caracteres.` };
    }
  }
  return null;
}

// ---------- Anillo de actividad de los últimos 30 días ----------
// Cada marca es un día; el recorrido va en sentido horario y hoy queda justo antes de las 12.

export function anillo(actividad, { prioridad = 'BAJA', tamano = 64, conTexto = true } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const total = actividad.reduce((a, b) => a + b, 0);
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', tamano);
  svg.setAttribute('height', tamano);
  svg.setAttribute('class', `anillo anillo--${prioridad.toLowerCase()}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${total} ocurrencia${total === 1 ? '' : 's'} en los últimos 30 días`);

  const dias = actividad.length;
  actividad.forEach((cantidad, indice) => {
    const posicion = dias - indice; // el día más antiguo va primero, hoy último
    const angulo = ((posicion / dias) * 360 - 90 - 6) * (Math.PI / 180);
    const interior = cantidad > 0 ? 30 : 36;
    const linea = document.createElementNS(ns, 'line');
    linea.setAttribute('x1', 50 + Math.cos(angulo) * interior);
    linea.setAttribute('y1', 50 + Math.sin(angulo) * interior);
    linea.setAttribute('x2', 50 + Math.cos(angulo) * 44);
    linea.setAttribute('y2', 50 + Math.sin(angulo) * 44);
    linea.setAttribute('class', cantidad > 0 ? 'anillo__dia anillo__dia--con' : 'anillo__dia');
    if (indice === 0) linea.classList.add('anillo__dia--hoy');
    svg.append(linea);
  });

  if (conTexto) {
    const texto = document.createElementNS(ns, 'text');
    texto.setAttribute('x', 50);
    texto.setAttribute('y', 50);
    texto.setAttribute('class', 'anillo__numero');
    texto.textContent = total;
    svg.append(texto);
  }
  return svg;
}
