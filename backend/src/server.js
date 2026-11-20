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
  const pool = crearPool(process.env.DATABASE_URL);
  await inicializarEsquema(pool);
  console.log('Conectado a PostgreSQL.');
  return crearRepositoriosPostgres(pool);
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
