import { crearApp } from './app.js';

const puerto = Number(process.env.PORT) || 3000;
const app = crearApp({ corsOrigin: process.env.CORS_ORIGIN || '*' });

app.listen(puerto, () => {
  console.log(`Bucle API escuchando en http://localhost:${puerto}`);
});
