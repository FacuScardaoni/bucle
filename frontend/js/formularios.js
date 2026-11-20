// Formularios de alta y edición. Cada función abre un diálogo y resuelve cuando se guarda.
import { api } from './api.js';
import { abrirFormulario, avisar, valorFechaHoraLocal, valorFecha, confirmar } from './ui.js';

const opcional = (texto) => (texto ? texto : null);

export function formularioCategoria(categoria) {
  return new Promise((resolver) => {
    const dialogo = abrirFormulario({
      titulo: categoria ? 'Editar categoría' : 'Nueva categoría',
      textoBoton: categoria ? 'Guardar cambios' : 'Crear categoría',
      campos: [
        { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, largoMin: 2, largoMax: 40, valor: categoria?.nombre },
        { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', largoMax: 200, valor: categoria?.descripcion },
      ],
      alEnviar: async (v) => {
        const datos = { nombre: v.nombre, descripcion: opcional(v.descripcion) };
        const guardada = categoria
          ? await api.put(`/categorias/${categoria.id}`, datos)
          : await api.post('/categorias', datos);
        avisar(categoria ? 'Categoría guardada.' : `Categoría "${guardada.nombre}" creada.`);
        resolver(guardada);
      },
    });
    dialogo.addEventListener('close', () => resolver(null));
  });
}

// Para crear un problema hace falta al menos una categoría: si no hay, se ofrece crearla primero.
export async function formularioProblema(problema) {
  let categorias = await api.get('/categorias');
  if (categorias.length === 0) {
    const crear = await confirmar({
      titulo: 'Primero, una categoría',
      mensaje: 'Cada problema pertenece a una categoría (por ejemplo "Puntualidad" o "Finanzas"). Creá la primera para seguir.',
      textoBoton: 'Crear categoría',
    });
    if (!crear) return null;
    const nueva = await formularioCategoria();
    categorias = [nueva];
  }

  return new Promise((resolver) => {
    const dialogo = abrirFormulario({
      titulo: problema ? 'Editar problema' : 'Nuevo problema',
      descripcion: problema ? null : 'Algo que te pasa una y otra vez. Después vas a ir anotando cada vez que vuelva a pasar.',
      textoBoton: problema ? 'Guardar cambios' : 'Crear problema',
      campos: [
        { nombre: 'nombre', etiqueta: 'Qué te pasa', requerido: true, largoMin: 3, largoMax: 80, valor: problema?.nombre, ayuda: 'Por ejemplo: "Llegar tarde al trabajo".' },
        { nombre: 'categoriaId', etiqueta: 'Categoría', tipo: 'select', requerido: true, valor: problema?.categoriaId,
          opciones: categorias.map((c) => [c.id, c.nombre]) },
        { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', largoMax: 500, valor: problema?.descripcion },
      ],
      alEnviar: async (v) => {
        const datos = { nombre: v.nombre, categoriaId: Number(v.categoriaId), descripcion: opcional(v.descripcion) };
        const guardado = problema
          ? await api.put(`/problemas/${problema.id}`, datos)
          : await api.post('/problemas', datos);
        avisar(problema ? 'Problema guardado.' : 'Problema creado.');
        resolver(guardado);
      },
    });
    dialogo.addEventListener('close', () => resolver(null));
  });
}

// "Me volvió a pasar": la fecha y hora actuales vienen cargadas.
export function formularioOcurrencia(problema, ocurrencia) {
  return new Promise((resolver) => {
    const dialogo = abrirFormulario({
      titulo: ocurrencia ? 'Editar ocurrencia' : 'Me volvió a pasar',
      descripcion: ocurrencia ? null : problema.nombre,
      textoBoton: ocurrencia ? 'Guardar cambios' : 'Registrar',
      campos: [
        { nombre: 'fecha', etiqueta: 'Cuándo', tipo: 'datetime-local', requerido: true, max: valorFechaHoraLocal(),
          valor: valorFechaHoraLocal(ocurrencia ? new Date(ocurrencia.fecha) : new Date()) },
        { nombre: 'descripcion', etiqueta: 'Qué pasó', requerido: true, largoMin: 3, largoMax: 300, valor: ocurrencia?.descripcion },
        { nombre: 'gravedad', etiqueta: 'Qué tan grave fue', tipo: 'gravedad', requerido: true, valor: ocurrencia?.gravedad ?? 3 },
        { nombre: 'contexto', etiqueta: 'Contexto', largoMax: 200, valor: ocurrencia?.contexto, ayuda: 'Dónde estabas, con quién, qué estabas haciendo.' },
        { nombre: 'posibleCausa', etiqueta: 'Posible causa', largoMax: 200, valor: ocurrencia?.posibleCausa },
      ],
      alEnviar: async (v) => {
        const datos = {
          fecha: new Date(v.fecha).toISOString(),
          descripcion: v.descripcion,
          gravedad: Number(v.gravedad),
          contexto: opcional(v.contexto),
          posibleCausa: opcional(v.posibleCausa),
        };
        const guardada = ocurrencia
          ? await api.put(`/ocurrencias/${ocurrencia.id}`, datos)
          : await api.post(`/problemas/${problema.id}/ocurrencias`, datos);
        if (guardada.recaida) {
          avisar('Registrado. Como el problema estaba solucionado, volvió a Activo.', 'atencion');
        } else {
          avisar(ocurrencia ? 'Ocurrencia guardada.' : 'Registrado.');
        }
        resolver(guardada);
      },
    });
    dialogo.addEventListener('close', () => resolver(null));
  });
}

export function formularioSolucion(problema, solucion) {
  return new Promise((resolver) => {
    const dialogo = abrirFormulario({
      titulo: solucion ? 'Editar solución' : 'Nueva solución',
      descripcion: solucion ? null : `Algo que vas a probar (o ya probaste) para "${problema.nombre}".`,
      textoBoton: solucion ? 'Guardar cambios' : 'Agregar solución',
      campos: [
        { nombre: 'nombre', etiqueta: 'Qué vas a probar', requerido: true, largoMin: 3, largoMax: 80, valor: solucion?.nombre,
          ayuda: 'Por ejemplo: "Poner la alarma 20 minutos antes".' },
        { nombre: 'fechaAplicacion', etiqueta: 'Desde cuándo', tipo: 'date', requerido: true,
          valor: solucion?.fechaAplicacion ?? valorFecha(), ayuda: 'Puede ser una fecha futura si la estás planificando.' },
        { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', largoMax: 500, valor: solucion?.descripcion },
      ],
      alEnviar: async (v) => {
        const datos = { nombre: v.nombre, fechaAplicacion: v.fechaAplicacion, descripcion: opcional(v.descripcion) };
        const guardada = solucion
          ? await api.put(`/soluciones/${solucion.id}`, datos)
          : await api.post(`/problemas/${problema.id}/soluciones`, datos);
        avisar(solucion ? 'Solución guardada.' : 'Solución agregada.');
        resolver(guardada);
      },
    });
    dialogo.addEventListener('close', () => resolver(null));
  });
}

// RN-13: si no funcionó o funcionó en parte, hay que contar qué falló.
export function formularioEvaluacion(solucion) {
  return new Promise((resolver) => {
    const dialogo = abrirFormulario({
      titulo: 'Evaluar solución',
      descripcion: solucion.nombre,
      textoBoton: 'Guardar evaluación',
      campos: [
        { nombre: 'resultado', etiqueta: '¿Funcionó?', tipo: 'select', requerido: true,
          valor: solucion.resultado === 'PENDIENTE' ? 'FUNCIONO' : solucion.resultado,
          opciones: [['FUNCIONO', 'Funcionó'], ['PARCIAL', 'Funcionó en parte'], ['NO_FUNCIONO', 'No funcionó']] },
        { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', largoMax: 500, valor: solucion.observaciones,
          ayuda: 'Obligatorias si no funcionó o funcionó en parte: contá qué falló.' },
      ],
      alEnviar: async (v) => {
        const evaluada = await api.patch(`/soluciones/${solucion.id}/evaluacion`,
          { resultado: v.resultado, observaciones: opcional(v.observaciones) });
        avisar('Evaluación guardada.');
        resolver(evaluada);
      },
    });
    dialogo.addEventListener('close', () => resolver(null));
  });
}
