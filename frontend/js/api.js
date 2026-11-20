// Cliente de la API REST. Todas las llamadas pasan por acá.
import { API_URL } from './config.js';

const ESPERA_AVISO_MS = 2500;
let pedidosLentos = 0;

export class ErrorApi extends Error {
  constructor({ status, codigo, mensaje, campo, regla, detalles }) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.campo = campo;
    this.regla = regla;
    this.detalles = detalles;
  }
}

// El plan gratuito de Render "duerme" el servidor: si una respuesta tarda, se avisa en pantalla.
function avisoConexion(sumar) {
  pedidosLentos += sumar;
  document.getElementById('aviso-conexion').hidden = pedidosLentos === 0;
}

async function pedir(metodo, ruta, cuerpo) {
  let lento = false;
  const temporizador = setTimeout(() => { lento = true; avisoConexion(1); }, ESPERA_AVISO_MS);
  try {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    if (respuesta.status === 204) return null;
    const datos = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      throw new ErrorApi({
        status: respuesta.status,
        ...(datos?.error ?? { codigo: 'ERROR', mensaje: 'El servidor respondió con un error inesperado.' }),
      });
    }
    return datos;
  } catch (error) {
    if (error instanceof ErrorApi) throw error;
    throw new ErrorApi({
      status: 0, codigo: 'SIN_CONEXION',
      mensaje: 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
    });
  } finally {
    clearTimeout(temporizador);
    if (lento) avisoConexion(-1);
  }
}

export const api = {
  get: (ruta) => pedir('GET', ruta),
  post: (ruta, cuerpo) => pedir('POST', ruta, cuerpo ?? {}),
  put: (ruta, cuerpo) => pedir('PUT', ruta, cuerpo ?? {}),
  patch: (ruta, cuerpo) => pedir('PATCH', ruta, cuerpo ?? {}),
  eliminar: (ruta) => pedir('DELETE', ruta),
};
