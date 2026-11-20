// Carga los datos de demostración (db/seed.sql) solo si la base está vacía.
// Uso: DATABASE_URL=... npm run seed
import { readFile } from 'node:fs/promises';
import { crearPool, inicializarEsquema } from '../repositorios/postgres/index.js';

if (!process.env.DATABASE_URL) {
  console.error('Falta la variable DATABASE_URL.');
  process.exit(1);
}

const pool = crearPool(process.env.DATABASE_URL);
try {
  await inicializarEsquema(pool);
  const { rows } = await pool.query('SELECT count(*)::int AS cantidad FROM categorias');
  if (rows[0].cantidad > 0) {
    console.log('La base ya tiene datos: no se cargó la demo.');
  } else {
    const sql = await readFile(new URL('../../db/seed.sql', import.meta.url), 'utf8');
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query('COMMIT');
      console.log('Datos de demostración cargados.');
    } catch (err) {
      await cliente.query('ROLLBACK');
      throw err;
    } finally {
      cliente.release();
    }
  }
} finally {
  await pool.end();
}
