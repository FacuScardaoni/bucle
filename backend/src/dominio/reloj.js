// La hora actual se obtiene siempre de un "reloj" inyectado.
// En producción es la hora del sistema; en los tests se usa un reloj fijo y controlable.

export function crearRelojSistema() {
  return { ahora: () => new Date() };
}

export function crearRelojFijo(fechaInicial) {
  let actual = new Date(fechaInicial);
  return {
    ahora: () => new Date(actual),
    fijar: (fecha) => { actual = new Date(fecha); },
  };
}
