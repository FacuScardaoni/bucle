// Repositorios en memoria. Misma interfaz que los de PostgreSQL.
// Se usan en los tests y en desarrollo local cuando no hay DATABASE_URL.

const copiar = (fila) => (fila ? structuredClone(fila) : null);

function cumpleFiltro(fila, filtro) {
  return Object.entries(filtro).every(([campo, valor]) => fila[campo] === valor);
}

class TablaMemoria {
  constructor() {
    this.filas = new Map();
    this.siguienteId = 1;
  }

  // filtro: igualdad por campo, por ejemplo { problemaId: 3 }
  async listar(filtro = {}) {
    return [...this.filas.values()].filter((f) => cumpleFiltro(f, filtro)).map(copiar);
  }

  async obtener(id) {
    return copiar(this.filas.get(id));
  }

  async crear(datos) {
    const fila = { id: this.siguienteId++, ...structuredClone(datos) };
    this.filas.set(fila.id, fila);
    return copiar(fila);
  }

  async actualizar(id, cambios) {
    const actual = this.filas.get(id);
    if (!actual) return null;
    const nueva = { ...actual, ...structuredClone(cambios), id };
    this.filas.set(id, nueva);
    return copiar(nueva);
  }

  async eliminar(id) {
    return this.filas.delete(id);
  }

  async eliminarDonde(filtro) {
    for (const fila of [...this.filas.values()]) {
      if (cumpleFiltro(fila, filtro)) this.filas.delete(fila.id);
    }
  }
}

export function crearRepositoriosMemoria() {
  const repos = {
    categorias: new TablaMemoria(),
    problemas: new TablaMemoria(),
    ocurrencias: new TablaMemoria(),
    soluciones: new TablaMemoria(),
    cambiosEstado: new TablaMemoria(),
  };

  // Borrar un problema borra sus registros asociados (igual que ON DELETE CASCADE).
  const eliminarProblema = repos.problemas.eliminar.bind(repos.problemas);
  repos.problemas.eliminar = async (id) => {
    for (const tabla of [repos.ocurrencias, repos.soluciones, repos.cambiosEstado]) {
      await tabla.eliminarDonde({ problemaId: id });
    }
    return eliminarProblema(id);
  };

  // En memoria no hace falta una transacción real: se ejecuta directamente.
  repos.transaccion = async (operacion) => operacion(repos);
  return repos;
}
