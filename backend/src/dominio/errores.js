// Errores de negocio con el formato de la sección 5 de la spec.
// Las rutas los convierten en respuestas HTTP con el código correspondiente.

export class ErrorBucle extends Error {
  constructor(codigo, status, mensaje, { campo, regla, detalles } = {}) {
    super(mensaje);
    this.name = 'ErrorBucle';
    this.codigo = codigo;
    this.status = status;
    this.campo = campo;
    this.regla = regla;
    this.detalles = detalles;
  }

  aJSON() {
    const error = { codigo: this.codigo, mensaje: this.message };
    if (this.campo) error.campo = this.campo;
    if (this.regla) error.regla = this.regla;
    if (this.detalles) error.detalles = this.detalles;
    return { error };
  }
}

export function errorValidacion(mensaje, campo, regla) {
  return new ErrorBucle('VALIDACION', 400, mensaje, { campo, regla });
}

export function errorNoEncontrado(mensaje, regla) {
  return new ErrorBucle('NO_ENCONTRADO', 404, mensaje, { regla });
}

export function errorConflicto(mensaje, regla, detalles, campo) {
  return new ErrorBucle('CONFLICTO', 409, mensaje, { regla, detalles, campo });
}
