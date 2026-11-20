import { Router } from 'express';

// Se monta en /api: historial y estadísticas.
export function crearRutasConsultas({ consultas }) {
  const rutas = Router();

  rutas.get('/problemas/:id/historial', async (req, res) => {
    res.json(await consultas.historial(req.params.id));
  });

  rutas.get('/problemas/:id/estadisticas', async (req, res) => {
    res.json(await consultas.estadisticasProblema(req.params.id));
  });

  rutas.get('/estadisticas', async (req, res) => {
    res.json(await consultas.resumen());
  });

  return rutas;
}
