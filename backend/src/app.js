import express from 'express';
import cors from 'cors';
import { rutaNoEncontrada, manejarErrores } from './rutas/errores.js';

// Arma la aplicación Express. No abre ningún puerto: eso lo hace server.js.
// Los tests usan esta función directamente con supertest.
export function crearApp({ corsOrigin = '*' } = {}) {
  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/salud', (req, res) => {
    res.json({ estado: 'ok', servicio: 'bucle-api' });
  });

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
