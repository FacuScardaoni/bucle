import express from 'express';
import cors from 'cors';
import { rutaNoEncontrada, manejarErrores } from './rutas/errores.js';
import { crearRutasCategorias } from './rutas/categorias.js';
import { crearRutasProblemas } from './rutas/problemas.js';
import { crearRutasOcurrencias } from './rutas/ocurrencias.js';
import { crearRutasSoluciones } from './rutas/soluciones.js';
import { crearRutasConsultas } from './rutas/consultas.js';

// Arma la aplicación Express. No abre ningún puerto: eso lo hace server.js.
// Los tests usan esta función directamente con supertest.
export function crearApp({ servicios, corsOrigin = '*' }) {
  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/salud', (req, res) => {
    res.json({ estado: 'ok', servicio: 'bucle-api' });
  });

  app.use('/api/categorias', crearRutasCategorias(servicios));
  app.use('/api/problemas', crearRutasProblemas(servicios));
  app.use('/api', crearRutasOcurrencias(servicios));
  app.use('/api', crearRutasSoluciones(servicios));
  app.use('/api', crearRutasConsultas(servicios));

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
