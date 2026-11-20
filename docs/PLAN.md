# Plan de desarrollo — Bucle

Cada tarea es **un commit**. El mensaje del commit empieza con el código de la tarea y, en ese mismo commit, se tilda su casilla.

## Tareas

- [x] **T-01** Estructura del repo, README inicial, `.gitignore`, `AGENTS.md`, `docs/SPEC.md` y `docs/PLAN.md`
- [x] **T-02** Backend base: Express, `/api/salud`, manejo central de errores, primer test (RN-01)
- [x] **T-03** Dominio: enums, errores, validaciones de texto y reloj inyectable (RN-01)
- [x] **T-04** Categorías: dominio, repositorio en memoria, servicio, rutas y tests (RN-02, RN-03)
- [ ] **T-05** Problemas: crear, consultar y editar (RN-04 a RN-06)
- [ ] **T-06** Ocurrencias: CRUD y datos derivados (RN-07, RN-09)
- [ ] **T-07** Prioridad calculada (RN-08)
- [ ] **T-08** Soluciones: CRUD y evaluación (RN-11 a RN-13)
- [ ] **T-09** Estados, cambios de estado y consistencia (RN-14 a RN-17)
- [ ] **T-10** Recaída automática (RN-10)
- [ ] **T-11** Eliminación con confirmación y en cascada (RN-18)
- [ ] **T-12** Búsqueda, filtros y orden (RN-19)
- [ ] **T-13** Historial (RN-22)
- [ ] **T-14** Estadísticas y efectividad (RN-20, RN-21)
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
