import { Router } from 'express';

export function crearRutasProblemas({ problemas }) {
  const rutas = Router();

  rutas.get('/', async (req, res) => {
    res.json(await problemas.listar(req.query));
  });

  rutas.post('/', async (req, res) => {
    res.status(201).json(await problemas.crear(req.body));
  });

  rutas.get('/:id', async (req, res) => {
    res.json(await problemas.obtener(req.params.id));
  });

  rutas.put('/:id', async (req, res) => {
    res.json(await problemas.actualizar(req.params.id, req.body));
  });

  return rutas;
}
