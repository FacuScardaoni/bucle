// Formularios de alta y edición. Cada función abre un diálogo y resuelve cuando se guarda.
import { api } from './api.js';
import { abrirFormulario, avisar, valorFechaHoraLocal, confirmar } from './ui.js';

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
