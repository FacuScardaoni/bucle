// RN-22: historial de un problema como una sola línea de tiempo, del evento más reciente al más antiguo.
import { inicioDelDia } from './fechas.js';

// Ante la misma fecha, este orden mantiene el resultado estable.
const ORDEN_TIPOS = ['CAMBIO_ESTADO', 'SOLUCION_EVALUADA', 'SOLUCION_APLICADA', 'OCURRENCIA'];

function eventosDeSolucion(s) {
  const eventos = [{
    tipo: 'SOLUCION_APLICADA', fecha: inicioDelDia(s.fechaAplicacion),
    solucionId: s.id, nombre: s.nombre, fechaAplicacion: s.fechaAplicacion,
  }];
  if (s.fechaEvaluacion) {
    eventos.push({
      tipo: 'SOLUCION_EVALUADA', fecha: new Date(s.fechaEvaluacion),
      solucionId: s.id, nombre: s.nombre, resultado: s.resultado, observaciones: s.observaciones,
    });
  }
  return eventos;
}

export function construirHistorial({ ocurrencias = [], soluciones = [], cambios = [] }) {
  const eventos = [
    ...ocurrencias.map((o) => ({
      tipo: 'OCURRENCIA', fecha: new Date(o.fecha), ocurrenciaId: o.id,
      descripcion: o.descripcion, contexto: o.contexto, posibleCausa: o.posibleCausa, gravedad: o.gravedad,
    })),
    ...soluciones.flatMap(eventosDeSolucion),
    ...cambios.map((c) => ({
      tipo: 'CAMBIO_ESTADO', fecha: new Date(c.fecha),
      estadoAnterior: c.estadoAnterior, estadoNuevo: c.estadoNuevo, motivo: c.motivo,
    })),
  ];
  return eventos.sort((a, b) =>
    (b.fecha - a.fecha) || (ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo)));
}
