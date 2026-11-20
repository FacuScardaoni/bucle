# AGENTS.md — Instrucciones para agentes de IA

Este archivo le explica a cualquier agente de IA (Claude, Copilot, Cursor, etc.) cómo trabajar en este repositorio.

## Proyecto

**Bucle** es una aplicación web para registrar problemas recurrentes, sus ocurrencias y las soluciones probadas, y medir con datos cuáles funcionan.

- Especificación (fuente de verdad): [`docs/SPEC.md`](docs/SPEC.md). Funcionalidades F-01 a F-10, reglas de negocio RN-01 a RN-22.
- Plan de trabajo: [`docs/PLAN.md`](docs/PLAN.md).
- Informe de pruebas: [`docs/INFORME_PRUEBAS.md`](docs/INFORME_PRUEBAS.md).

## Stack

- **Backend** (`backend/`): Node.js 22 + Express 5 + PostgreSQL (`pg`). Módulos ES (`import`/`export`).
- **Frontend** (`frontend/`): HTML, CSS y JavaScript sin frameworks ni build.
- **Tests:** `node:test` + `supertest`.
- Publicación: frontend en Netlify, backend en Render, base de datos en Neon.

## Comandos

```bash
cd backend
npm install          # instalar dependencias
npm test             # correr todos los tests (deben pasar al 100 %)
npm run dev          # servidor local en http://localhost:3000 (sin DATABASE_URL usa memoria)
npm start            # servidor en producción
npm run seed         # carga datos de demostración (solo si la base está vacía; requiere DATABASE_URL)
npm run test:db      # contrato de repositorios contra PostgreSQL (requiere DATABASE_URL_TEST, una base de PRUEBA)
```

El frontend se abre con cualquier servidor estático, por ejemplo `npx serve frontend`.

## Arquitectura del backend

```
rutas/ (HTTP)  →  servicios/ (casos de uso)  →  dominio/ (reglas puras)
                        ↓
                  repositorios/  →  postgres/ (producción) · memoria/ (tests)
```

- **dominio/**: funciones puras. Acá viven las reglas de negocio. Sin acceso a base de datos ni a Express.
- **servicios/**: coordinan cada caso de uso usando dominio + repositorios.
- **repositorios/**: solo leen y guardan. Las implementaciones de memoria y PostgreSQL tienen la misma interfaz.
- **rutas/**: traducen HTTP a llamadas de servicio. No contienen reglas de negocio ni SQL.
- La hora actual se obtiene SIEMPRE del `reloj` inyectado (nunca `new Date()` en dominio o servicios), para que los tests sean deterministas.

## Convenciones

- Código, comentarios, mensajes de error y commits en **español**.
- Cada regla se cita por su código (`RN-08`) en el código que la implementa y en el nombre de sus tests (`test('RN-08 sube un nivel con gravedad ≥ 4', ...)`).
- Los errores se lanzan con las funciones de `dominio/errores.js` y respetan el formato de la sección 5 de la spec.
- Funciones cortas y con una sola responsabilidad. Sin código duplicado.

## Flujo de trabajo

1. Tomar la siguiente tarea sin tildar de `docs/PLAN.md` (de a una).
2. Escribir los tests de las reglas involucradas.
3. Implementar.
4. Correr `npm test` hasta que todo pase.
5. Tildar la tarea en `docs/PLAN.md` y hacer **un commit** cuyo mensaje empiece con el código: `T-07: prioridad calculada (RN-08)`.

Si algo no está especificado, elegir la alternativa más simple y anotarla en la sección "Decisiones" de `docs/PLAN.md`.

## Prohibido

- Subir `.env`, credenciales, cadenas de conexión reales o tokens. Usar variables de entorno y mantener `backend/.env.example` actualizado.
- Agregar dependencias sin justificarlas en `docs/PLAN.md`.
- Implementar funcionalidades que no estén en la spec.
- Dejar tests fallando o desactivados.
