import { ErrorBucle } from '../dominio/errores.js';

// Ruta inexistente: 404 con el formato estándar.
export function rutaNoEncontrada(req, res) {
  res.status(404).json({
    error: { codigo: 'NO_ENCONTRADO', mensaje: `La ruta ${req.method} ${req.path} no existe` },
  });
}

// Manejador central de errores. Nunca expone detalles internos (sección 5 de la spec).
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorBucle) {
    return res.status(err.status).json(err.aJSON());
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { codigo: 'VALIDACION', mensaje: 'El cuerpo de la petición no es un JSON válido' },
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(400).json({
      error: { codigo: 'VALIDACION', mensaje: 'El cuerpo de la petición es demasiado grande' },
    });
  }
  console.error(err);
  return res.status(500).json({
    error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado. Intentá de nuevo.' },
  });
}
