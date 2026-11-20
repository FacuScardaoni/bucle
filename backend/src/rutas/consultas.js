import { Router } from 'express';

// Se monta en /api: historial y estadísticas.
export function crearRutasConsultas({ consultas }) {
  const rutas = Router();

  rutas.get('/problemas/:id/historial', async (req, res) => {
    res.json(await consultas.historial(req.params.id));
  });

  return rutas;
}
