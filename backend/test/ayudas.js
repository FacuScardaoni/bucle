// Utilidades compartidas por los tests de API.
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { crearServicios } from '../src/servicios/index.js';
import { crearRelojFijo } from '../src/dominio/reloj.js';
import { crearRepositoriosMemoria } from '../src/repositorios/memoria/index.js';

// "Ahora" fijo para todos los tests: viernes 20/11/2026 12:00 hora de Argentina.
export const AHORA = '2026-11-20T15:00:00.000Z';

// Fecha y hora ISO a N días antes de AHORA.
export const haceDias = (dias) => new Date(new Date(AHORA).getTime() - dias * 86400000).toISOString();

// Fecha de calendario 'AAAA-MM-DD' a N días de AHORA (negativo = pasado).
export const diaRelativo = (dias) => haceDias(-dias).slice(0, 10);

export function crearContexto(ahora = AHORA) {
  const reloj = crearRelojFijo(ahora);
  const repos = crearRepositoriosMemoria();
  const servicios = crearServicios({ repos, reloj });
  const app = crearApp({ servicios });
  return { app, api: request(app), reloj, repos, servicios };
}

// Atajos para preparar datos en los tests.
export async function crearCategoria(api, nombre = 'Puntualidad') {
  const res = await api.post('/api/categorias').send({ nombre });
  return res.body;
}

export async function crearProblema(api, datos = {}) {
  const categoriaId = datos.categoriaId ?? (await crearCategoria(api, `Cat ${Math.random()}`)).id;
  const res = await api.post('/api/problemas').send({ nombre: 'Llegar tarde', categoriaId, ...datos });
  return res.body;
}

// Registra una ocurrencia N días antes de AHORA.
export async function crearOcurrencia(api, problemaId, dias = 1, datos = {}) {
  const res = await api.post(`/api/problemas/${problemaId}/ocurrencias`)
    .send({ fecha: haceDias(dias), descripcion: 'Me volvió a pasar', gravedad: 3, ...datos });
  return res.body;
}
