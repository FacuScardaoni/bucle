# Plan de desarrollo — Bucle

Cada tarea es **un commit**. El mensaje del commit empieza con el código de la tarea y, en ese mismo commit, se tilda su casilla.

## Tareas

- [x] **T-01** Estructura del repo, README inicial, `.gitignore`, `AGENTS.md`, `docs/SPEC.md` y `docs/PLAN.md`
- [x] **T-02** Backend base: Express, `/api/salud`, manejo central de errores, primer test (RN-01)
- [x] **T-03** Dominio: enums, errores, validaciones de texto y reloj inyectable (RN-01)
- [x] **T-04** Categorías: dominio, repositorio en memoria, servicio, rutas y tests (RN-02, RN-03)
- [x] **T-05** Problemas: crear, consultar y editar (RN-04 a RN-06)
- [x] **T-06** Ocurrencias: CRUD y datos derivados (RN-07, RN-09)
- [x] **T-07** Prioridad calculada (RN-08)
- [x] **T-08** Soluciones: CRUD y evaluación (RN-11 a RN-13)
- [x] **T-09** Estados, cambios de estado y consistencia (RN-14 a RN-17)
- [x] **T-10** Recaída automática (RN-10)
- [x] **T-11** Eliminación con confirmación y en cascada (RN-18)
- [x] **T-12** Búsqueda, filtros y orden (RN-19)
- [x] **T-13** Historial (RN-22)
- [x] **T-14** Estadísticas y efectividad (RN-20, RN-21)
- [ ] **T-15** Repositorios PostgreSQL, `schema.sql` y `seed.sql`
- [ ] **T-16** Publicación: base de datos en Neon y backend en Render
- [ ] **T-17** Frontend: estructura, cliente de API, listado con búsqueda y filtros (RN-19)
- [ ] **T-18** Frontend: detalle, ocurrencias, soluciones, evaluación y estados (RN-09 a RN-17)
- [ ] **T-19** Frontend: historial, estadísticas, categorías y resumen (RN-20 a RN-22)
- [ ] **T-20** Publicación del frontend en Netlify y configuración de CORS
- [ ] **T-21** Prueba de humo en producción, informe de pruebas y README final

## Decisiones

Decisiones tomadas durante el desarrollo sobre puntos que la spec no detalla. En todos los casos se eligió la alternativa más simple.

| # | Tema | Decisión |
|---|---|---|
| D-01 | Lenguaje y módulos | JavaScript con módulos ES (`import`/`export`) y Node.js 22 LTS. |
| D-02 | Dependencias | Producción: `express` (servidor HTTP), `pg` (driver de PostgreSQL), `cors` (permitir que el frontend en Netlify llame a la API). Desarrollo: `supertest` (tests HTTP sin levantar un puerto). |
| D-03 | Zona horaria | Las fechas de calendario (fecha de aplicación, "hoy") y los patrones por día y franja horaria se calculan en hora de Argentina (`America/Argentina/Buenos_Aires`). Las fechas con hora se guardan en UTC. |
| D-04 | Formato de fechas en la API | Fecha y hora en ISO 8601 (`2026-11-20T09:30:00-03:00`); fecha de calendario como `AAAA-MM-DD`. Un número entero puede enviarse como número o como texto (`3` o `"3"`). |
| D-05 | Repositorios | Interfaz común mínima: `listar(filtro)`, `obtener(id)`, `crear(datos)`, `actualizar(id, cambios)`, `eliminar(id)`, más `transaccion(operacion)`. El filtro es de igualdad por campo. Los nombres se guardan también normalizados (`nombreNormalizado`) para controlar duplicados. |
| D-06 | Listado de categorías | Cada categoría incluye `cantidadProblemas`, para que la interfaz sepa si se puede borrar (RN-03) sin otra consulta. |
| D-07 | Ventana de 30 días | "Últimos 30 días" = ocurrencias con fecha posterior a `ahora − 30 días` y no posterior a `ahora`. |
| D-08 | Solución evaluada con fecha futura | Como una solución futura no se puede evaluar (RN-13), tampoco se permite editar la fecha de aplicación de una solución ya evaluada a una fecha futura. Una solución aplicada "hoy" ya puede evaluarse. |
| D-09 | Ventana de 14 días (RN-15) | Se aplica igual que la de 30 días: ocurrencias con fecha posterior a `ahora − 14 días`. Si faltan varias condiciones, el error las lista todas en `detalles.faltan`. |
| D-10 | Alcance de RN-17 | La consistencia se verifica solo sobre la condición de soluciones (RN-14 / RN-15), que es lo único que cambia al eliminar o reevaluar una solución. |
| D-11 | Aviso de recaída | Al crear o editar una ocurrencia, la respuesta incluye `recaida: true/false` para que la interfaz avise que el problema volvió a ACTIVO. La ocurrencia y el cambio de estado se guardan en la misma transacción. |
| D-12 | Parámetros de búsqueda | `GET /api/problemas?q=&categoria=&estado=&prioridad=`. Un parámetro vacío equivale a no enviarlo. Repetir un parámetro (`?estado=A&estado=B`) da error 400. Ante empate de prioridad y fecha, se ordena por nombre. |
| D-13 | Eventos del historial | Tipos: `OCURRENCIA`, `SOLUCION_APLICADA` (al inicio del día de aplicación, hora de Argentina), `SOLUCION_EVALUADA` (última evaluación) y `CAMBIO_ESTADO`. Con la misma fecha, el orden es: cambio de estado, evaluación, aplicación, ocurrencia. |
| D-14 | Efectividad y mejor solución | Los días de observación se cuentan desde el inicio del día de aplicación (hora de Argentina). Una solución con fecha futura tiene efectividad `PLANIFICADA`. La "mejor solución" es la de mayor mejora **positiva**; si ninguna mejoró, es `null`. Ante empate en día o franja más frecuente, gana el primero (lunes antes que martes; mañana antes que tarde). |
