// Dirección pública de la API. No es un dato secreto.
// En la computadora local se usa el backend de desarrollo; publicado, el de Render.
const ES_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

export const API_URL = ES_LOCAL
  ? 'http://localhost:3000/api'
  : 'https://bucle.onrender.com/api';
