# Plan de desarrollo — Bucle

Cada tarea es **un commit**. El mensaje del commit empieza con el código de la tarea y, en ese mismo commit, se tilda su casilla.

## Tareas

- [x] **T-01** Estructura del repo, README inicial, `.gitignore`, `AGENTS.md`, `docs/SPEC.md` y `docs/PLAN.md`
- [ ] **T-02** Backend base: Express, `/api/salud`, manejo central de errores, primer test (RN-01)
- [ ] **T-03** Dominio: enums, errores, validaciones de texto y reloj inyectable (RN-01)
- [ ] **T-04** Categorías: dominio, repositorio en memoria, servicio, rutas y tests (RN-02, RN-03)
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
