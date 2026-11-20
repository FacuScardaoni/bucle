import { crearApp } from './app.js';
import { crearServicios } from './servicios/index.js';
import { crearRelojSistema } from './dominio/reloj.js';
import { crearRepositoriosMemoria } from './repositorios/memoria/index.js';

const puerto = Number(process.env.PORT) || 3000;

function crearRepositorios() {
  console.warn('Sin DATABASE_URL: se usan datos en memoria (se pierden al reiniciar).');
  return crearRepositoriosMemoria();
}

const servicios = crearServicios({ repos: crearRepositorios(), reloj: crearRelojSistema() });
const app = crearApp({ servicios, corsOrigin: process.env.CORS_ORIGIN || '*' });

app.listen(puerto, () => {
  console.log(`Bucle API escuchando en http://localhost:${puerto}`);
});
