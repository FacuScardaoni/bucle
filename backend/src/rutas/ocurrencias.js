import { Router } from 'express';

// Se monta en /api: las ocurrencias se listan y crean dentro de su problema,
// y se editan o eliminan por su propio id.
export function crearRutasOcurrencias({ ocurrencias }) {
  const rutas = Router();

  rutas.get('/problemas/:id/ocurrencias', async (req, res) => {
    res.json(await ocurrencias.listarPorProblema(req.params.id));
  });

  rutas.post('/problemas/:id/ocurrencias', async (req, res) => {
    res.status(201).json(await ocurrencias.crear(req.params.id, req.body));
  });

  rutas.put('/ocurrencias/:id', async (req, res) => {
    res.json(await ocurrencias.actualizar(req.params.id, req.body));
  });

  rutas.delete('/ocurrencias/:id', async (req, res) => {
    await ocurrencias.eliminar(req.params.id);
    res.status(204).end();
  });

  return rutas;
}
