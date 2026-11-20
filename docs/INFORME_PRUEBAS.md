# Informe de pruebas — Bucle

Fecha: 20 de noviembre de 2026 · Versión: commit de la tarea T-21

Este informe resume cómo se probó Bucle y con qué resultado: tests automáticos en memoria, tests contra PostgreSQL real, pruebas de la interfaz en el navegador y una prueba de humo en producción.

## 1. Resumen

| Tipo de prueba | Cantidad | Resultado |
|---|---|---|
| Tests automáticos (`npm test`, repositorios en memoria) | 109 | ✅ 109 pasan, 0 fallan |
| Tests contra PostgreSQL (`npm run test:db`) | 14 | ✅ 14 pasan, 0 fallan |
| Recorridos de la interfaz en navegador (local, Chrome sin interfaz) | 5 flujos | ✅ Sin errores en consola |
| Prueba de humo en producción (Netlify + Render + Neon) | 29 verificaciones | ✅ 29 correctas (ver nota en 5.2) |

## 2. Cómo correr las pruebas

```bash
cd backend
npm install
npm test                                   # 109 tests, sin base de datos
DATABASE_URL_TEST=postgres://... npm run test:db   # contra una base PostgreSQL de PRUEBA (se vacía)
```

`npm test` usa los repositorios en memoria y un reloj fijo (viernes 20/11/2026 12:00, hora de Argentina), así los resultados no dependen del día en que se corren.

## 3. Cobertura de las reglas de negocio

Cada regla tiene tests cuyo nombre empieza con su código, así se puede rastrear qué prueba cubre cada regla (por ejemplo, `node --test --test-name-pattern="RN-15"`).

| Regla | Qué verifica | Tests | Resultado |
|---|---|---|---|
| RN-01 | Textos recortados, vacío = no informado, JSON inválido → 400 | 6 | ✅ |
| RN-02 | Nombre de categoría válido y único (sin mayúsculas ni acentos) | 3 | ✅ |
| RN-03 | No se elimina una categoría con problemas | 1 | ✅ |
| RN-04 | Nombre de problema de 3 a 80, único | 2 | ✅ |
| RN-05 | Categoría obligatoria y existente | 1 | ✅ |
| RN-06 | Problema nuevo ACTIVO, ignora campos calculados | 1 | ✅ |
| RN-07 | Cantidad y última ocurrencia calculadas | 1 | ✅ |
| RN-08 | Prioridad por frecuencia en 30 días y gravedad (bordes 1/2, 4/5, gravedad 3/4, 30 días) | 9 | ✅ |
| RN-09 | Ocurrencia válida: fecha no futura, descripción, gravedad 1 a 5 | 3 | ✅ |
| RN-10 | Recaída automática; carga retroactiva no cambia el estado | 4 | ✅ |
| RN-11 | Solución válida, nombre único dentro del problema, fecha futura permitida | 3 | ✅ |
| RN-12 | Solución nace PENDIENTE | 1 | ✅ |
| RN-13 | Evaluación: resultados válidos, no evaluar antes de aplicar, observaciones obligatorias | 6 | ✅ |
| RN-14 | Requisito para CONTROLADO | 2 | ✅ |
| RN-15 | Requisitos para SOLUCIONADO (solución que funcionó + 14 días) | 4 | ✅ |
| RN-16 | ACTIVO siempre permitido, no repetir estado, registro de cambios | 3 | ✅ |
| RN-17 | Consistencia del estado al borrar o reevaluar soluciones | 3 | ✅ |
| RN-18 | Borrado con confirmación y en cascada | 4 | ✅ |
| RN-19 | Búsqueda, filtros combinables, orden, valores inválidos | 7 | ✅ |
| RN-20 | Efectividad antes/después (28 días, observación, sin datos, planificada) | 7 | ✅ |
| RN-21 | Estadísticas del problema y resumen general | 7 | ✅ |
| RN-22 | Historial cronológico, incluida la recaída | 3 | ✅ |

Además hay tests sin código de regla que cubren: rutas inexistentes (404), ids inválidos (400), registros inexistentes (404), validaciones genéricas de formato, fechas en hora de Argentina, reloj fijo, actividad diaria del anillo y la conexión segura a la base.

## 4. Tests contra PostgreSQL

`npm run test:db` se ejecutó contra PostgreSQL 16 local. Verifica que la implementación de PostgreSQL cumpla el mismo contrato que la de memoria:

- Alta, consulta, filtro, edición y borrado; registros inexistentes.
- Tipos de datos: fecha y hora como `Date`, fecha de calendario como texto, gravedad como número.
- Borrado en cascada de un problema.
- Transacciones: devuelven el resultado y, si algo falla, no guardan nada (rollback).
- Un nombre duplicado que llega a la base se convierte en error 409.
- Recorrido completo de la API sobre PostgreSQL: categoría → problema → ocurrencias → solución → estados → recaída → historial → borrado.
- Los datos de demostración (`seed.sql`) cumplen las reglas: estados coherentes con sus soluciones (RN-17), prioridades esperadas, patrón "lunes" en "Llegar tarde al trabajo" y efectividad calculable.

Resultado: **14 de 14 pasan**.

## 5. Pruebas manuales

### 5.1 Interfaz (local, con datos de demostración)

Se recorrió la interfaz con Chrome automatizado (Playwright) en escritorio (1100 px) y celular (390 px):

| Flujo | Resultado esperado | Resultado |
|---|---|---|
| Pasar "Gastar de más en delivery" a Solucionado sin cumplir requisitos | Diálogo que lista las 2 condiciones que faltan (RN-15) | ✅ |
| Registrar ocurrencia con descripción de 2 letras | Error junto al campo, sin enviar | ✅ |
| Registrar ocurrencia válida con gravedad 4 | Se guarda y la cantidad sube | ✅ |
| Renombrar un problema con un nombre existente en otras mayúsculas | Error del servidor junto al campo "nombre" (RN-04) | ✅ |
| Evaluar "No funcionó" sin observaciones | Error junto al campo (RN-13) | ✅ |
| Eliminar un problema con datos | Segunda confirmación con la cantidad de registros (RN-18) y vuelta al listado | ✅ |
| Todas las pantallas y pestañas, y rutas inexistentes | Sin errores de JavaScript en la consola | ✅ |

Capturas: [estado rechazado](capturas/estado-rechazado.png) · [validación del formulario](capturas/validacion-formulario.png).

### 5.2 Prueba de humo en producción

Se ejecutó desde la página publicada en Netlify (https://erroresapp.netlify.app), llamando a la API publicada en Render (https://bucle.onrender.com/api) con la base en Neon. Así se verificaron también la conexión entre los tres servicios y la configuración de CORS. Los datos de prueba se borraron al terminar.

| # | Verificación | Resultado |
|---|---|---|
| 1 | `/api/salud` responde | ✅ |
| 2 | Crear categoría (F-01) | ✅ |
| 3 | Categoría repetida en mayúsculas → 409 (RN-02) | ✅ |
| 4 | Nombre de problema de 2 letras → 400 (RN-04) | ✅ |
| 5 | Categoría inexistente → 404 (RN-05) | ✅ |
| 6 | Problema nuevo nace ACTIVO aunque se envíe otro estado (RN-06) | ✅ |
| 7 | Ocurrencia con fecha futura → 400 (RN-09) | ✅ |
| 8 | Ocurrencia con gravedad 7 → 400 (RN-09) | ✅ |
| 9 | Cantidad de ocurrencias calculada = 6 (RN-07) | ✅ |
| 10 | Prioridad calculada (RN-08) | ✅ (ver nota) |
| 11 | Solución nace PENDIENTE (RN-12) | ✅ |
| 12 | Evaluar "No funcionó" sin observaciones → 400 (RN-13) | ✅ |
| 13 | Pasar a CONTROLADO sin solución que funcionó → 409 (RN-14) | ✅ |
| 14 | Evaluar FUNCIONO (RN-13) | ✅ |
| 15 | Efectividad calculada: 1 → 0,5 por semana, 50 % de mejora (RN-20) | ✅ |
| 16 | Pasar a SOLUCIONADO sin ocurrencias en 14 días (RN-15) | ✅ |
| 17 | Borrar la solución que sostiene el estado → 409 (RN-17) | ✅ |
| 18 | Nueva ocurrencia marca recaída (RN-10) | ✅ |
| 19 | El problema volvió a ACTIVO (RN-10) | ✅ |
| 20 | Búsqueda "HUMO" + estado ACTIVO encuentra 1 problema (RN-19) | ✅ |
| 21 | Búsqueda de 1 letra → 400 (RN-19) | ✅ |
| 22 | Historial empieza por la recaída, 11 eventos (RN-22) | ✅ |
| 23 | Estadísticas del problema (RN-21) | ✅ |
| 24 | Resumen general (RN-21) | ✅ |
| 25 | Borrar categoría en uso → 409 (RN-03) | ✅ |
| 26 | Borrar problema sin confirmar → 409 con detalle de 7 ocurrencias, 1 solución y 2 cambios (RN-18) | ✅ |
| 27 | Borrar problema confirmado → 204 (RN-18) | ✅ |
| 28 | Borrar la categoría ya vacía (limpieza) | ✅ |
| 29 | Problema inexistente → 404 | ✅ |

**Nota sobre la verificación 10:** el guion de prueba esperaba prioridad MEDIA, pero la API devolvió **ALTA**. Al revisarlo, el error estaba en el guion y no en la aplicación: había **2** ocurrencias en los últimos 30 días (hace 29 y 20 días), que dan MEDIA, y una de ellas con gravedad 5 sube un nivel → **ALTA**, tal como indica RN-08. El resultado de la aplicación es correcto.

## 6. Errores encontrados y corregidos durante el desarrollo

| Error | Dónde se detectó | Corrección |
|---|---|---|
| Neon rechazaba la conexión ("connection is insecure") y el servidor no arrancaba en Render | Primer deploy en Render (T-16) | El servidor activa SSL siempre que la base no sea local, y muestra en los logs un mensaje claro si no puede conectarse (D-23). Test agregado. |
| El error de nombre repetido no indicaba el campo, así que la interfaz lo mostraba como error general | Prueba de interfaz (T-18) | Los conflictos de nombre devuelven `campo: "nombre"` (D-20). Test actualizado. |
| En los datos de demostración, las ocurrencias de "Llegar tarde" decían "Lunes" pero caían en otros días según la fecha de carga | Revisión visual del detalle (T-18) | Esas fechas se cuentan desde el lunes de la semana de carga (D-21). Test agregado contra PostgreSQL. |
| En celular, la pestaña elegida podía quedar fuera de la vista | Revisión visual (T-19) | La fila de pestañas se desplaza hasta la pestaña elegida. |

## 7. Seguridad y secretos

- `.env` está en `.gitignore`; el repo solo tiene `backend/.env.example` con valores de ejemplo.
- Se revisó **todo el historial de git** (no solo el último commit) buscando cadenas de conexión de Neon y contraseñas: no hay ninguna.
- La cadena de conexión real está solo en las variables de entorno de Render.
- El frontend nunca inserta texto del usuario como HTML (evita inyección de código).

## 8. Limitaciones conocidas

- La versión 1 es de un solo usuario y no tiene inicio de sesión: cualquiera con el enlace puede ver y modificar los datos (alcance definido en la spec).
- El plan gratuito de Render "duerme" el servidor: la primera carga puede tardar hasta un minuto. La interfaz lo avisa con "Conectando con el servidor…".
- El frontend se publicó en Netlify subiendo la carpeta a mano, así que un cambio en el frontend requiere volver a subirla.

## Anexo: lista de tests automáticos (`npm test`)

<details>
<summary>Ver los 109 tests</summary>

- RN-19 sin filtros ordena por prioridad y luego por ocurrencia más reciente
- RN-19 busca en nombre y descripción sin distinguir mayúsculas ni acentos
- RN-19 filtra por categoría, estado y prioridad
- RN-19 los filtros se combinan entre sí y con la búsqueda
- RN-19 sin resultados devuelve una lista vacía con 200
- RN-19 la búsqueda debe tener al menos 2 caracteres (vacía = sin búsqueda)
- RN-19 un valor de filtro inexistente da error 400
- F-01 crea, lista, edita y elimina una categoría
- RN-02 el nombre de la categoría es obligatorio y tiene entre 2 y 40 caracteres
- RN-02 no se repite el nombre aunque cambien mayúsculas o acentos
- RN-02 al editar se puede conservar el propio nombre pero no tomar uno ajeno
- RN-03 no se puede eliminar una categoría con problemas asociados
- una categoría inexistente responde 404 y un id inválido 400
- RN-18 un problema sin registros asociados se elimina sin confirmación
- RN-18 sin confirmación responde 409 indicando cuántos registros se borrarían
- RN-18 con confirmación borra el problema y todos sus registros asociados
- RN-18 eliminar un problema inexistente responde 404
- F-10 las soluciones se listan con su efectividad calculada (RN-20)
- RN-21 GET /problemas/:id/estadisticas devuelve las estadísticas del problema
- RN-21 GET /estadisticas devuelve el resumen general
- RN-14 no puede pasar a CONTROLADO sin una solución FUNCIONO o PARCIAL
- RN-14 pasa a CONTROLADO con una solución PARCIAL
- RN-15 no puede pasar a SOLUCIONADO sin una solución FUNCIONO
- RN-15 no puede pasar a SOLUCIONADO con ocurrencias en los últimos 14 días
- RN-15 indica todas las condiciones que faltan
- RN-15 pasa a SOLUCIONADO con una solución FUNCIONO y 14 días sin ocurrencias
- RN-16 volver a ACTIVO siempre está permitido
- RN-16 no se puede cambiar al estado actual ni a un estado inexistente
- RN-16 cada cambio de estado queda registrado con motivo MANUAL
- RN-17 no se puede eliminar la solución que sostiene el estado CONTROLADO
- RN-17 no se puede reevaluar como NO_FUNCIONO la única solución de un problema SOLUCIONADO
- RN-17 sí se puede eliminar o reevaluar si otra solución sigue sosteniendo el estado
- RN-22 el historial une ocurrencias, soluciones, evaluaciones y cambios de estado, del más reciente al más antiguo
- RN-22 una recaída aparece en el historial con su motivo
- RN-22 un problema sin registros tiene historial vacío y uno inexistente da 404
- F-04 registra, lista, edita y elimina ocurrencias
- F-04 las ocurrencias se listan de la más reciente a la más antigua
- RN-09 la ocurrencia debe pertenecer a un problema existente
- RN-09 la fecha es obligatoria, válida y no futura
- RN-09 la descripción es obligatoria (3 a 300) y la gravedad es un entero de 1 a 5
- RN-07 la cantidad y la última ocurrencia se calculan y se actualizan al cambiar las ocurrencias
- editar o eliminar una ocurrencia inexistente responde 404
- RN-08 la prioridad del problema se recalcula al registrar ocurrencias
- F-02 crea un problema y lo consulta con el nombre de su categoría
- RN-04 el nombre es obligatorio y tiene entre 3 y 80 caracteres
- RN-04 no puede haber dos problemas con el mismo nombre (sin importar mayúsculas ni acentos)
- RN-05 la categoría es obligatoria y debe existir
- RN-06 un problema nuevo empieza ACTIVO, con fechas del servidor, e ignora campos calculados
- F-03 edita nombre, descripción y categoría pero no el estado
- consultar o editar un problema inexistente responde 404
- RN-10 una ocurrencia posterior al cambio a SOLUCIONADO reactiva el problema
- RN-10 una carga retroactiva (fecha anterior al cambio) no cambia el estado
- RN-10 editar la fecha de una ocurrencia a después del cambio también es recaída
- RN-10 en un problema CONTROLADO una ocurrencia no cambia el estado
- GET /api/salud responde ok
- una ruta inexistente responde 404 con el formato de error estándar
- RN-01 un JSON mal formado responde 400 y no 500
- F-05 registra, lista, edita y elimina soluciones
- RN-11 el nombre es obligatorio (3 a 80) y la fecha de aplicación es obligatoria y válida
- RN-11 el nombre no se repite dentro del mismo problema, pero sí en otro
- RN-11 la fecha de aplicación puede ser futura (solución planificada)
- RN-12 toda solución se crea PENDIENTE aunque el cliente envíe otro resultado
- RN-13 evaluar como FUNCIONO guarda el resultado y la fecha de evaluación
- RN-13 el resultado debe ser FUNCIONO, PARCIAL o NO_FUNCIONO (no PENDIENTE)
- RN-13 no se puede evaluar una solución cuya fecha de aplicación no llegó
- RN-13 una solución aplicada hoy ya se puede evaluar
- RN-13 PARCIAL o NO_FUNCIONO requieren observaciones de al menos 10 caracteres
- RN-13 una solución evaluada no puede pasar a tener fecha de aplicación futura
- editar, evaluar o eliminar una solución inexistente responde 404
- RN-20 calcula la mejora comparando 28 días antes y después
- RN-20 las ocurrencias de hace más de 28 días antes de aplicar no cuentan
- RN-20 si pasaron menos de 28 días normaliza por los días transcurridos
- RN-20 una mejora negativa indica que el problema empeoró
- RN-20 con menos de 7 días desde la aplicación queda EN_OBSERVACION
- RN-20 sin ocurrencias previas queda SIN_DATOS_PREVIOS
- RN-20 una solución con fecha futura queda PLANIFICADA
- RN-21 franjas horarias en hora de Argentina
- RN-21 estadísticas del problema: totales, promedio, gravedad, día y franja
- RN-21 sin ocurrencias las estadísticas quedan en cero o vacías
- RN-21 cuenta soluciones por resultado y elige la de mayor mejora positiva
- RN-21 resumen general: por estado, por categoría y los 5 más frecuentes
- RN-08 0 o 1 ocurrencias en 30 días → BAJA
- RN-08 de 2 a 4 ocurrencias en 30 días → MEDIA
- RN-08 5 o más ocurrencias en 30 días → ALTA
- RN-08 las ocurrencias de hace más de 30 días no cuentan
- RN-08 sube un nivel con gravedad ≥ 4
- RN-08 con gravedad 3 no sube de nivel
- RN-08 nunca supera ALTA
- RN-08 una ocurrencia grave de hace más de 30 días no sube el nivel
- actividad por día: cuenta ocurrencias por día de calendario argentino (0 = hoy)
- RN-01 recorta espacios al inicio y al final
- RN-01 un texto vacío o solo con espacios se considera no informado
- RN-01 un valor que no es texto da error 400
- RN-01 texto obligatorio: rechaza vacío y respeta límites
- RN-01 texto opcional: acepta null y controla el máximo
- normalizar ignora mayúsculas, acentos y espacios repetidos
- enteroEnRango acepta números y texto numérico, rechaza el resto
- idValido rechaza ids no numéricos o no positivos
- fechaHoraValida exige formato ISO
- fechaCalendarioValida exige AAAA-MM-DD y una fecha real
- las fechas de calendario, días y horas se calculan en hora de Argentina
- el reloj fijo devuelve siempre la hora configurada
- una base en la nube usa conexión cifrada aunque la dirección no traiga sslmode
- una base en la propia computadora no fuerza SSL
- crear, obtener, listar con filtro, actualizar y eliminar
- registros inexistentes: obtener → null, actualizar → null, eliminar → false
- tipos: fecha y hora como Date, fecha de calendario como texto, gravedad como número
- eliminar un problema borra sus ocurrencias, soluciones y cambios de estado
- la transacción devuelve el resultado de la operación

</details>
