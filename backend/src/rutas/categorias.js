import { Router } from 'express';

export function crearRutasCategorias({ categorias }) {
  const rutas = Router();

  rutas.get('/', async (req, res) => {
    res.json(await categorias.listar());
  });

  rutas.post('/', async (req, res) => {
    res.status(201).json(await categorias.crear(req.body));
  });

  rutas.get('/:id', async (req, res) => {
    res.json(await categorias.obtener(req.params.id));
  });

  rutas.put('/:id', async (req, res) => {
    res.json(await categorias.actualizar(req.params.id, req.body));
  });

  rutas.delete('/:id', async (req, res) => {
    await categorias.eliminar(req.params.id);
    res.status(204).end();
  });

  return rutas;
}
