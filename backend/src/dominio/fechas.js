// Utilidades de fechas. Las fechas "de calendario" (sin hora) se interpretan
// en la zona horaria de Argentina, que es donde se usa la aplicación.

export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';
export const MS_POR_DIA = 24 * 60 * 60 * 1000;

const formatoPartes = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23', weekday: 'short',
});

function partes(fecha) {
  const p = {};
  for (const { type, value } of formatoPartes.formatToParts(fecha)) p[type] = value;
  return p;
}

// 'YYYY-MM-DD' del día calendario en Argentina.
export function fechaCalendario(fecha) {
  const p = partes(fecha);
  return `${p.year}-${p.month}-${p.day}`;
}

// Hora (0 a 23) en Argentina.
export function horaLocal(fecha) {
  return Number(partes(fecha).hour);
}

// Día de la semana en Argentina: 0 = lunes ... 6 = domingo.
const DIAS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function diaSemanaLocal(fecha) {
  return DIAS_EN.indexOf(partes(fecha).weekday);
}

// Inicio del día calendario 'YYYY-MM-DD' en Argentina (UTC-3, sin horario de verano).
export function inicioDelDia(fechaCalendarioTexto) {
  return new Date(`${fechaCalendarioTexto}T00:00:00-03:00`);
}

export function restarDias(fecha, dias) {
  return new Date(fecha.getTime() - dias * MS_POR_DIA);
}

export function sumarDias(fecha, dias) {
  return new Date(fecha.getTime() + dias * MS_POR_DIA);
}

export function diasEntre(desde, hasta) {
  return (hasta.getTime() - desde.getTime()) / MS_POR_DIA;
}
