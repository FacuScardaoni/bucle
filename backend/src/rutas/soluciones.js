import { Router } from 'express';

// Se monta en /api: las soluciones se listan y crean dentro de su problema,
// y se editan, evalúan o eliminan por su propio id.
export function crearRutasSoluciones({ soluciones }) {
  const rutas = Router();

  rutas.get('/problemas/:id/soluciones', async (req, res) => {
    res.json(await soluciones.listarPorProblema(req.params.id));
  });

  rutas.post('/problemas/:id/soluciones', async (req, res) => {
    res.status(201).json(await soluciones.crear(req.params.id, req.body));
  });

  rutas.put('/soluciones/:id', async (req, res) => {
    res.json(await soluciones.actualizar(req.params.id, req.body));
  });

  rutas.patch('/soluciones/:id/evaluacion', async (req, res) => {
    res.json(await soluciones.evaluar(req.params.id, req.body));
  });

  rutas.delete('/soluciones/:id', async (req, res) => {
    await soluciones.eliminar(req.params.id);
    res.status(204).end();
  });

  return rutas;
}
