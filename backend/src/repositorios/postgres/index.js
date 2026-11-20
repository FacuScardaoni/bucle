// Repositorios PostgreSQL. Misma interfaz que los de memoria (ver repositorios/memoria).
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { errorConflicto } from '../../dominio/errores.js';

// Las fechas de calendario (tipo DATE) se devuelven como texto 'AAAA-MM-DD', sin convertir a Date.
pg.types.setTypeParser(pg.types.builtins.DATE, (valor) => valor);

// Campo en JavaScript → columna en la base. Solo estos nombres llegan al SQL (los valores van como parámetros).
const TABLAS = {
  categorias: {
    tabla: 'categorias',
    columnas: { id: 'id', nombre: 'nombre', nombreNormalizado: 'nombre_normalizado', descripcion: 'descripcion' },
  },
  problemas: {
    tabla: 'problemas',
    columnas: {
      id: 'id', nombre: 'nombre', nombreNormalizado: 'nombre_normalizado', descripcion: 'descripcion',
      categoriaId: 'categoria_id', estado: 'estado', fechaCreacion: 'fecha_creacion', fechaEstado: 'fecha_estado',
    },
  },
  ocurrencias: {
    tabla: 'ocurrencias',
    columnas: {
      id: 'id', problemaId: 'problema_id', fecha: 'fecha', descripcion: 'descripcion',
      contexto: 'contexto', posibleCausa: 'posible_causa', gravedad: 'gravedad',
    },
  },
  soluciones: {
    tabla: 'soluciones',
    columnas: {
      id: 'id', problemaId: 'problema_id', nombre: 'nombre', nombreNormalizado: 'nombre_normalizado',
      descripcion: 'descripcion', fechaAplicacion: 'fecha_aplicacion', resultado: 'resultado',
      observaciones: 'observaciones', fechaEvaluacion: 'fecha_evaluacion',
    },
  },
  cambiosEstado: {
    tabla: 'cambios_estado',
    columnas: {
      id: 'id', problemaId: 'problema_id', estadoAnterior: 'estado_anterior', estadoNuevo: 'estado_nuevo',
      motivo: 'motivo', fecha: 'fecha',
    },
  },
};

// Errores de restricciones de la base → errores de negocio (red de seguridad ante datos concurrentes).
async function consultar(ejecutor, sql, valores) {
  try {
    return await ejecutor.query(sql, valores);
  } catch (err) {
    if (err.code === '23505') throw errorConflicto('Ya existe un registro con ese nombre');
    if (err.code === '23503') throw errorConflicto('El registro está relacionado con otros datos');
    throw err;
  }
}

function crearTabla(ejecutor, { tabla, columnas }) {
  const campos = Object.keys(columnas);
  const seleccion = campos.map((c) => `${columnas[c]} AS "${c}"`).join(', ');

  function columna(campo) {
    if (!columnas[campo]) throw new Error(`Campo desconocido en ${tabla}: ${campo}`);
    return columnas[campo];
  }

  return {
    async listar(filtro = {}) {
      const claves = Object.keys(filtro);
      const where = claves.length ? `WHERE ${claves.map((c, i) => `${columna(c)} = $${i + 1}`).join(' AND ')}` : '';
      const { rows } = await consultar(ejecutor, `SELECT ${seleccion} FROM ${tabla} ${where} ORDER BY id`,
        claves.map((c) => filtro[c]));
      return rows;
    },

    async obtener(id) {
      const { rows } = await consultar(ejecutor, `SELECT ${seleccion} FROM ${tabla} WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async crear(datos) {
      const claves = Object.keys(datos);
      const sql = `INSERT INTO ${tabla} (${claves.map(columna).join(', ')})
                   VALUES (${claves.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING ${seleccion}`;
      const { rows } = await consultar(ejecutor, sql, claves.map((c) => datos[c]));
      return rows[0];
    },

    async actualizar(id, cambios) {
      const claves = Object.keys(cambios).filter((c) => c !== 'id');
      const sql = `UPDATE ${tabla} SET ${claves.map((c, i) => `${columna(c)} = $${i + 2}`).join(', ')}
                   WHERE id = $1 RETURNING ${seleccion}`;
      const { rows } = await consultar(ejecutor, sql, [id, ...claves.map((c) => cambios[c])]);
      return rows[0] ?? null;
    },

    // En problemas, ON DELETE CASCADE borra también ocurrencias, soluciones y cambios de estado (RN-18).
    async eliminar(id) {
      const { rowCount } = await consultar(ejecutor, `DELETE FROM ${tabla} WHERE id = $1`, [id]);
      return rowCount > 0;
    },
  };
}

function construirRepositorios(ejecutor) {
  return Object.fromEntries(Object.entries(TABLAS).map(([nombre, def]) => [nombre, crearTabla(ejecutor, def)]));
}

export function crearRepositoriosPostgres(pool) {
  const repos = construirRepositorios(pool);

  // Ejecuta la operación dentro de una transacción con repositorios ligados a una sola conexión.
  repos.transaccion = async (operacion) => {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await operacion(construirRepositorios(cliente));
      await cliente.query('COMMIT');
      return resultado;
    } catch (err) {
      await cliente.query('ROLLBACK');
      throw err;
    } finally {
      cliente.release();
    }
  };
  return repos;
}

// Las bases en la nube (Neon) exigen conexión cifrada. Se activa SSL siempre que la base
// no esté en la propia computadora, aunque la dirección no traiga "sslmode".
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '::1', ''];

export function opcionesDeConexion(connectionString) {
  const host = new URL(connectionString).hostname.replace(/^\[|\]$/g, '');
  const esLocal = HOSTS_LOCALES.includes(host);
  return { connectionString, max: 5, ...(esLocal ? {} : { ssl: true }) };
}

export function crearPool(connectionString) {
  return new pg.Pool(opcionesDeConexion(connectionString));
}

// Crea las tablas si no existen (db/schema.sql es idempotente).
export async function inicializarEsquema(pool) {
  const sql = await readFile(new URL('../../../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}
