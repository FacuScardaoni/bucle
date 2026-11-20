import { crearApp } from './app.js';
import { crearServicios } from './servicios/index.js';
import { crearRelojSistema } from './dominio/reloj.js';
import { crearRepositoriosMemoria } from './repositorios/memoria/index.js';
import { crearRepositoriosPostgres, crearPool, inicializarEsquema } from './repositorios/postgres/index.js';

const puerto = Number(process.env.PORT) || 3000;

async function crearRepositorios() {
  if (!process.env.DATABASE_URL) {
    console.warn('Sin DATABASE_URL: se usan datos en memoria (se pierden al reiniciar).');
    return crearRepositoriosMemoria();
  }
  try {
    const pool = crearPool(process.env.DATABASE_URL);
    await inicializarEsquema(pool);
    console.log('Conectado a PostgreSQL.');
    return crearRepositoriosPostgres(pool);
  } catch (error) {
    // Mensaje corto y claro en los logs (sin mostrar la dirección, que contiene la contraseña).
    console.error(`No se pudo conectar a la base de datos: ${error.message}${error.code ? ` (código ${error.code})` : ''}`);
    console.error('Revisá la variable DATABASE_URL: tiene que ser la connection string de Neon, completa y sin comillas.');
    process.exit(1);
  }
}

// CORS_ORIGIN admite varios orígenes separados por coma (por ejemplo, Netlify y localhost).
function origenesPermitidos() {
  const origenes = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim()).filter(Boolean);
  return origenes.length === 1 ? origenes[0] : origenes;
}

const servicios = crearServicios({ repos: await crearRepositorios(), reloj: crearRelojSistema() });
const app = crearApp({ servicios, corsOrigin: origenesPermitidos() });

app.listen(puerto, () => {
  console.log(`Bucle API escuchando en http://localhost:${puerto}`);
});
