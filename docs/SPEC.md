# Bucle

**Especificación de requerimientos, diseño y plan de desarrollo** · Versión 2.0 · Noviembre 2026

---

## 1. Problema

Muchas personas tienen problemas que se repiten: llegar tarde, olvidarse algo, gastar de más, perder tiempo o cometer el mismo error. Casi nadie registra cuándo pasan, en qué contexto ni qué hizo para resolverlos. Cuando se intenta una solución, no hay forma objetiva de saber si funcionó: queda la sensación, no el dato.

**Bucle** es una aplicación web para registrar problemas recurrentes, anotar cada vez que vuelven a ocurrir y documentar las soluciones que se prueban. Con esos datos, la aplicación calcula la frecuencia, detecta patrones (día y franja horaria en que más ocurre) y **compara la frecuencia antes y después de cada solución** para mostrar cuáles funcionan de verdad.

**Usuarios:** estudiantes, trabajadores y cualquier persona que quiera convertir un "otra vez me pasó" en información útil.

## 2. Alcance

**Incluye (versión 1):**

- Gestión de categorías, problemas, ocurrencias y soluciones (alta, consulta, edición y baja).
- Ciclo de estados del problema (Activo, Controlado, Solucionado) con condiciones de negocio.
- Prioridad calculada automáticamente según frecuencia y gravedad.
- Búsqueda por texto y filtros combinables.
- Historial cronológico de cada problema.
- Estadísticas del problema, efectividad de cada solución y resumen general.
- Frontend web, API REST y base de datos PostgreSQL publicados en internet.

**No incluye:** múltiples usuarios ni inicio de sesión, inteligencia artificial, notificaciones, aplicación móvil nativa, exportación de datos.

> **Supuesto de la versión 1:** existe un único usuario. La API es pública y no tiene autenticación; esto se documenta como limitación conocida en el README.

## 3. Funcionalidades

| ID | Funcionalidad | Reglas |
|---|---|---|
| F-01 | Gestionar categorías: crear, listar, editar y eliminar | RN-01 a RN-03 |
| F-02 | Crear un problema con nombre, descripción y categoría | RN-01, RN-04 a RN-06 |
| F-03 | Editar y eliminar un problema | RN-04, RN-05, RN-18 |
| F-04 | Registrar, editar y eliminar ocurrencias (incluye botón rápido "Me volvió a pasar") | RN-07, RN-09, RN-10 |
| F-05 | Registrar, editar y eliminar soluciones | RN-11, RN-12, RN-17 |
| F-06 | Evaluar una solución: funcionó, funcionó parcialmente o no funcionó | RN-13, RN-17 |
| F-07 | Cambiar el estado de un problema | RN-14 a RN-16 |
| F-08 | Buscar y filtrar problemas por categoría, estado y prioridad | RN-08, RN-19 |
| F-09 | Ver el historial cronológico de un problema | RN-22 |
| F-10 | Ver estadísticas del problema, efectividad de soluciones y resumen general | RN-20, RN-21 |

## 4. Modelo de datos

Cinco entidades. Los valores **calculados** no se guardan: se obtienen de los datos cada vez que se consultan, para que nunca queden desactualizados.

### Categoría

| Campo | Tipo | Restricción |
|---|---|---|
| id | entero | autogenerado |
| nombre | texto | obligatorio, 2 a 40 caracteres, único |
| descripcion | texto | opcional, hasta 200 |

### Problema

| Campo | Tipo | Restricción |
|---|---|---|
| id | entero | autogenerado |
| nombre | texto | obligatorio, 3 a 80, único |
| descripcion | texto | opcional, hasta 500 |
| categoriaId | entero | obligatorio, debe existir |
| estado | enum | ACTIVO · CONTROLADO · SOLUCIONADO |
| fechaCreacion | fecha y hora | la asigna el servidor |
| fechaEstado | fecha y hora | fecha del último cambio de estado |
| cantidadOcurrencias | entero | **calculado** |
| fechaUltimaOcurrencia | fecha y hora | **calculado** |
| prioridad | enum | BAJA · MEDIA · ALTA, **calculado** (RN-08) |

### Ocurrencia

| Campo | Tipo | Restricción |
|---|---|---|
| id | entero | autogenerado |
| problemaId | entero | obligatorio, debe existir |
| fecha | fecha y hora | obligatoria, no futura |
| descripcion | texto | obligatoria, 3 a 300 (qué pasó) |
| contexto | texto | opcional, hasta 200 (dónde, con quién, qué estaba haciendo) |
| posibleCausa | texto | opcional, hasta 200 |
| gravedad | entero | obligatoria, 1 (leve) a 5 (grave) |

### Solución

| Campo | Tipo | Restricción |
|---|---|---|
| id | entero | autogenerado |
| problemaId | entero | obligatorio, debe existir |
| nombre | texto | obligatorio, 3 a 80, único dentro del problema |
| descripcion | texto | opcional, hasta 500 |
| fechaAplicacion | fecha | obligatoria (puede ser futura: solución planificada) |
| resultado | enum | PENDIENTE · FUNCIONO · PARCIAL · NO_FUNCIONO |
| observaciones | texto | hasta 500; obligatoria según RN-13 |
| fechaEvaluacion | fecha y hora | la asigna el servidor al evaluar |

### CambioEstado (para el historial)

| Campo | Tipo | Restricción |
|---|---|---|
| id | entero | autogenerado |
| problemaId | entero | obligatorio |
| estadoAnterior / estadoNuevo | enum | estados del problema |
| motivo | enum | MANUAL · RECAIDA |
| fecha | fecha y hora | la asigna el servidor |

**Relaciones:** una categoría tiene muchos problemas. Un problema tiene muchas ocurrencias, soluciones y cambios de estado. Si se borra un problema, se borran sus registros asociados (RN-18). Una categoría con problemas no se puede borrar (RN-03).

## 5. Reglas de negocio

Cada regla tiene al menos un test automático cuyo nombre empieza con su código (por ejemplo `RN-08 sube un nivel con gravedad ≥ 4`). Si una regla no se cumple, la API responde con el código HTTP indicado y un mensaje claro.

### Generales

**RN-01 · Textos limpios.** Todos los textos se recortan (espacios al inicio y al final). Un texto vacío después de recortarlo se considera no informado. Se aplican los límites de longitud del modelo de datos. *Error: 400.*

### Categorías

**RN-02 · Nombre de categoría válido y único.** Obligatorio, de 2 a 40 caracteres. No puede repetirse; la comparación no distingue mayúsculas ni acentos ("Finanzas" = "finanzas" = "FINANZAS"). *Error: 400 si es inválido, 409 si está repetido.*

**RN-03 · Categoría en uso.** No se puede eliminar una categoría que tiene problemas asociados. *Error: 409, indicando cuántos problemas la usan.*

### Problemas

**RN-04 · Nombre de problema válido y único.** Obligatorio, de 3 a 80 caracteres, sin repetirse entre problemas (misma comparación que RN-02). *Error: 400 / 409.*

**RN-05 · Categoría obligatoria.** Todo problema pertenece a una categoría existente. *Error: 400 si falta, 404 si no existe.*

**RN-06 · Valores iniciales.** Un problema nuevo empieza en estado ACTIVO, con fecha de creación y de estado iguales a la hora del servidor. El cliente no puede enviar estado, fechas, cantidad de ocurrencias ni prioridad: si los envía, se ignoran.

**RN-07 · Datos derivados.** La cantidad de ocurrencias y la fecha de la última ocurrencia se calculan siempre a partir de las ocurrencias registradas. Al crear, editar o eliminar una ocurrencia, el problema refleja el cambio en la consulta siguiente.

**RN-08 · Prioridad calculada.** Se cuentan las ocurrencias de los últimos 30 días:

- 0 o 1 → BAJA · de 2 a 4 → MEDIA · 5 o más → ALTA.
- Si alguna de esas ocurrencias tiene gravedad 4 o 5, la prioridad sube un nivel (como máximo, ALTA).

### Ocurrencias

**RN-09 · Ocurrencia válida.** Debe pertenecer a un problema existente (404). La fecha y hora es obligatoria y no puede ser futura. La descripción es obligatoria (3 a 300). La gravedad es obligatoria y debe ser un entero de 1 a 5. *Error: 400.*

**RN-10 · Recaída.** Si el problema está SOLUCIONADO y se registra (o se edita) una ocurrencia con fecha posterior a la fecha en que se marcó como solucionado, el problema vuelve automáticamente a ACTIVO y se registra un cambio de estado con motivo RECAIDA. Una ocurrencia cargada con fecha anterior (carga retroactiva) no cambia el estado.

### Soluciones

**RN-11 · Solución válida.** El nombre es obligatorio (3 a 80) y no se repite dentro del mismo problema. La fecha de aplicación es obligatoria y puede ser futura (solución planificada). *Error: 400 / 409.*

**RN-12 · Resultado inicial.** Toda solución se crea con resultado PENDIENTE. Si el cliente envía otro resultado al crearla, se ignora.

**RN-13 · Evaluación.** Para evaluar una solución:

- El resultado debe ser FUNCIONO, PARCIAL o NO_FUNCIONO. No se puede volver a PENDIENTE.
- No se puede evaluar una solución cuya fecha de aplicación todavía no llegó.
- Si el resultado es PARCIAL o NO_FUNCIONO, las observaciones son obligatorias (al menos 10 caracteres), para registrar qué falló.
- El servidor guarda la fecha de evaluación.

*Error: 400.*

### Estados del problema

**RN-14 · Pasar a CONTROLADO.** Requiere al menos una solución evaluada como FUNCIONO o PARCIAL. *Error: 409.*

**RN-15 · Pasar a SOLUCIONADO.** Requiere al menos una solución evaluada como FUNCIONO **y** ninguna ocurrencia en los últimos 14 días. *Error: 409, indicando qué condición falta.*

**RN-16 · Pasar a ACTIVO y registro de cambios.** Volver a ACTIVO siempre está permitido. No se puede "cambiar" al estado actual (400). Cada cambio guarda la fecha y queda en el historial con motivo MANUAL.

**RN-17 · Consistencia del estado.** No se puede eliminar ni reevaluar una solución si eso deja al problema en un estado que ya no cumple RN-14 o RN-15. El mensaje indica que primero hay que cambiar el estado del problema. *Error: 409.*

### Eliminación

**RN-18 · Borrado con confirmación.** Para eliminar un problema que tiene ocurrencias, soluciones o cambios de estado hay que confirmarlo explícitamente (`?confirmar=true`). Sin confirmación, la API responde 409 indicando cuántos registros se van a borrar. Con confirmación, borra el problema y todos sus registros asociados.

### Búsqueda y filtros

**RN-19 · Búsqueda y filtros.** El texto de búsqueda debe tener al menos 2 caracteres y se busca en nombre y descripción, sin distinguir mayúsculas ni acentos. Los filtros (categoría, estado y prioridad) se combinan entre sí y con la búsqueda (todos deben cumplirse). Un valor de filtro inexistente da error 400. Si no hay resultados, se devuelve una lista vacía (200) y la interfaz muestra "No se encontraron problemas". Orden: prioridad (ALTA primero) y luego la ocurrencia más reciente.

### Estadísticas e historial

**RN-20 · Efectividad de una solución (basada en datos).** Se compara la frecuencia del problema en los 28 días anteriores a la fecha de aplicación con la de los 28 días posteriores (o los días transcurridos, si todavía no pasaron 28). Las frecuencias se expresan en ocurrencias por semana.

- Mejora % = (frecuencia antes − frecuencia después) ÷ frecuencia antes × 100.
- Si pasaron menos de 7 días desde la aplicación → estado EN_OBSERVACION (no se calcula).
- Si no hubo ocurrencias antes → estado SIN_DATOS_PREVIOS.

Este cálculo es informativo: se muestra junto a la evaluación del usuario (RN-13), pero no la reemplaza. Así se ve si la percepción coincide con los datos.

**RN-21 · Estadísticas.** Para cada problema: total de ocurrencias, ocurrencias de los últimos 30 días, promedio semanal desde la primera ocurrencia, gravedad promedio, día de la semana y franja horaria con más ocurrencias (mañana 6–12 h, tarde 12–19 h, noche 19–6 h, hora de Argentina), cantidad de soluciones por resultado y mejor solución (mayor mejora % de RN-20). Resumen general: problemas por estado, problemas por categoría y los 5 problemas con más ocurrencias en los últimos 30 días.

**RN-22 · Historial.** El historial de un problema une en una sola línea de tiempo: ocurrencias, soluciones aplicadas (por fecha de aplicación), evaluaciones (por fecha de evaluación) y cambios de estado. Se ordena del más reciente al más antiguo.

### Formato de errores

Todos los errores tienen la misma forma. Los datos inválidos nunca provocan un error 500 ni muestran detalles internos.

```json
{ "error": { "codigo": "VALIDACION", "mensaje": "El nombre debe tener entre 3 y 80 caracteres",
             "campo": "nombre", "regla": "RN-04" } }
```

Códigos: `VALIDACION` (400), `NO_ENCONTRADO` (404), `CONFLICTO` (409), `ERROR_INTERNO` (500).

## 6. Tecnología y arquitectura

### Por qué JavaScript

Se elige **JavaScript en todo el proyecto** (Node.js en el backend y JavaScript del navegador en el frontend) porque:

- Un solo lenguaje para frontend, backend y tests.
- Render ejecuta Node.js directamente, sin Docker, y el despliegue es más simple que con Java.
- Node trae su propio sistema de tests (`node --test`), sin instalar frameworks de testing.
- Muy pocas dependencias: menos cosas que configurar, actualizar o que puedan fallar.

### Stack

| Capa | Tecnología | Publicación |
|---|---|---|
| Frontend | HTML, CSS y JavaScript sin frameworks | Netlify |
| Backend | Node.js 22 LTS + Express (API REST) | Render (Web Service) |
| Base de datos | PostgreSQL (driver `pg`) | Neon |
| Tests | `node:test` + `supertest` | se ejecutan con `npm test` |

Dependencias de producción: `express`, `pg`, `cors`. De desarrollo: `supertest`.

### Arquitectura en capas (backend)

```
Rutas (Express)  →  Servicios  →  Dominio (reglas puras)
                        ↓
                  Repositorios  →  PostgreSQL (producción)
                                →  Memoria    (tests)
```

- **Dominio:** funciones puras sin acceso a base de datos: validaciones, cálculo de prioridad, transiciones de estado, efectividad, estadísticas. Es donde viven las reglas y lo que más se testea.
- **Servicios:** coordinan cada caso de uso (por ejemplo, "registrar ocurrencia": valida, guarda y aplica la recaída).
- **Repositorios:** solo guardan y leen. Hay dos implementaciones con la misma interfaz: PostgreSQL y memoria. Los tests usan la de memoria, así corren rápido y sin base de datos.
- **Rutas:** traducen HTTP ↔ servicios y convierten errores de dominio al formato de la sección 5.
- **Reloj inyectable:** la hora actual se obtiene de un objeto `reloj`, así los tests de "últimos 30 días" o "14 días" son deterministas.

> **Decisión de simplicidad:** como hay un único usuario y pocos datos, los filtros, la prioridad y las estadísticas se calculan en JavaScript (capa de dominio) sobre los datos leídos, y no con consultas SQL complejas. Así la misma lógica funciona igual con memoria y con PostgreSQL, y se testea una sola vez.

### Estructura del repositorio

```
bucle/
├── README.md               cómo usar, instalar, probar y publicar + enlaces
├── AGENTS.md               instrucciones para agentes de IA que trabajen en el repo
├── .gitignore              incluye .env y node_modules
├── docs/
│   ├── SPEC.md             este documento
│   ├── PLAN.md             tareas con casillas (una tarea = un commit)
│   └── INFORME_PRUEBAS.md  resultados de tests automáticos y manuales
├── backend/
│   ├── package.json
│   ├── .env.example        variables sin valores reales
│   ├── db/schema.sql       tablas, claves y restricciones
│   ├── db/seed.sql         datos de demostración
│   ├── src/
│   │   ├── app.js          arma Express (se usa en tests)
│   │   ├── server.js       arranca el servidor
│   │   ├── dominio/        reglas, enums, errores, estadísticas
│   │   ├── servicios/
│   │   ├── repositorios/   postgres/ y memoria/
│   │   └── rutas/
│   └── test/               dominio/ y api/
└── frontend/
    ├── index.html
    ├── css/estilos.css
    ├── js/config.js        URL pública de la API (no es secreta)
    ├── js/api.js           cliente fetch y manejo de errores
    ├── js/vistas/          listado, detalle, categorías, resumen
    └── netlify.toml
```

### Variables de entorno (nunca se suben al repo)

| Variable | Dónde | Ejemplo en `.env.example` |
|---|---|---|
| `DATABASE_URL` | Render | `postgres://usuario:clave@host/db?sslmode=require` |
| `PORT` | Render (lo asigna solo) | `3000` |
| `CORS_ORIGIN` | Render | `https://bucle.netlify.app` |

## 7. API REST

Base: `https://<servicio>.onrender.com/api`. Todas las respuestas son JSON.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/salud` | Estado del servicio (sirve para "despertar" Render) |
| GET · POST | `/categorias` | Listar · crear categoría |
| PUT · DELETE | `/categorias/:id` | Editar · eliminar (RN-03) |
| GET | `/problemas?q=&categoria=&estado=&prioridad=` | Buscar y filtrar (RN-19) |
| POST | `/problemas` | Crear problema |
| GET · PUT | `/problemas/:id` | Detalle con valores calculados · editar |
| DELETE | `/problemas/:id?confirmar=true` | Eliminar (RN-18) |
| PATCH | `/problemas/:id/estado` | Cambiar estado (RN-14 a RN-16) |
| GET · POST | `/problemas/:id/ocurrencias` | Listar · registrar ocurrencia |
| PUT · DELETE | `/ocurrencias/:id` | Editar · eliminar ocurrencia |
| GET · POST | `/problemas/:id/soluciones` | Listar (con efectividad) · registrar solución |
| PUT · DELETE | `/soluciones/:id` | Editar · eliminar solución (RN-17) |
| PATCH | `/soluciones/:id/evaluacion` | Evaluar solución (RN-13) |
| GET | `/problemas/:id/historial` | Línea de tiempo (RN-22) |
| GET | `/problemas/:id/estadisticas` | Estadísticas del problema (RN-21) |
| GET | `/estadisticas` | Resumen general (RN-21) |

## 8. Interfaz de usuario

Aplicación de una sola página con navegación por `#` (sin recargar). Diseño adaptable a celular, porque el uso típico es registrar la ocurrencia en el momento en que pasa.

- **Listado (`#/`):** buscador, filtros, tarjetas con nombre, categoría, estado, prioridad (con color), cantidad y última ocurrencia. Botón "Nuevo problema". Mensaje claro cuando no hay resultados.
- **Detalle (`#/problemas/:id`):** datos del problema, selector de estado y botón destacado **"Me volvió a pasar"** (abre el formulario de ocurrencia con la fecha y hora actuales ya cargadas). Pestañas: Historial · Ocurrencias · Soluciones · Estadísticas.
- **Categorías (`#/categorias`)** y **Resumen (`#/resumen`).**
- **Validación:** el formulario valida en el navegador para avisar rápido, pero la fuente de verdad es el backend. Los errores de la API se muestran junto al campo correspondiente.
- **Confirmaciones:** borrar cualquier registro pide confirmación. Borrar un problema muestra cuántos registros asociados se van a eliminar.
- **Espera inicial:** si la API tarda en responder (Render "dormido"), se muestra "Conectando con el servidor…" en lugar de un error.

## 9. Estrategia de pruebas

- **Tests unitarios de dominio:** cada regla RN-01 a RN-22 tiene al menos un caso válido y uno inválido. Incluye los bordes: 1 y 2 ocurrencias, 4 y 5, gravedad 3 y 4, 13 y 14 días, 6 y 7 días.
- **Tests de API** (supertest + repositorios en memoria): recorren cada endpoint y verifican códigos HTTP y formato de error.
- **Prueba de humo en producción:** guion manual sobre la URL pública (sección 11), con fecha y resultado anotados en el informe.
- **Regla de entrega:** `npm test` debe pasar al 100 % antes de cada commit.
- **Informe de pruebas (`docs/INFORME_PRUEBAS.md`):** tabla regla → tests que la cubren → resultado, salida de `npm test`, resultados de la prueba manual y errores encontrados y corregidos.

## 10. Plan de desarrollo

Cada tarea es **un commit**. El mensaje empieza con el código de la tarea (por ejemplo `T-06: prioridad calculada (RN-08)`) y en el mismo commit se tilda la casilla en `docs/PLAN.md`.

| Tarea | Descripción | Reglas |
|---|---|---|
| T-01 | Estructura del repo, README inicial, `.gitignore`, `AGENTS.md`, `docs/SPEC.md` y `docs/PLAN.md` | — |
| T-02 | Backend base: Express, `/api/salud`, manejo central de errores, primer test | RN-01 |
| T-03 | Dominio: enums, errores, validaciones de texto y reloj inyectable | RN-01 |
| T-04 | Categorías: dominio, repositorio en memoria, servicio, rutas y tests | RN-02, RN-03 |
| T-05 | Problemas: crear, consultar, editar, con tests | RN-04 a RN-06 |
| T-06 | Ocurrencias: CRUD y datos derivados | RN-07, RN-09 |
| T-07 | Prioridad calculada | RN-08 |
| T-08 | Soluciones: CRUD y evaluación | RN-11 a RN-13 |
| T-09 | Estados, cambios de estado y consistencia | RN-14 a RN-17 |
| T-10 | Recaída automática | RN-10 |
| T-11 | Eliminación con confirmación y en cascada | RN-18 |
| T-12 | Búsqueda, filtros y orden | RN-19 |
| T-13 | Historial | RN-22 |
| T-14 | Estadísticas y efectividad | RN-20, RN-21 |
| T-15 | Repositorios PostgreSQL, `schema.sql` y `seed.sql` | — |
| T-16 | Publicación: base en Neon y backend en Render | — |
| T-17 | Frontend: estructura, cliente de API, listado con búsqueda y filtros | RN-19 |
| T-18 | Frontend: detalle, ocurrencias, soluciones, evaluación y estados | RN-09 a RN-17 |
| T-19 | Frontend: historial, estadísticas, categorías y resumen | RN-20 a RN-22 |
| T-20 | Publicación del frontend en Netlify y configuración de CORS | — |
| T-21 | Prueba de humo en producción, informe de pruebas y README final | — |

### Contenido de AGENTS.md

Instrucciones para cualquier agente de IA que trabaje en el repo: objetivo del proyecto y enlace a la spec, comandos (`npm install`, `npm test`, `npm run dev`), estructura de carpetas, convenciones (código y mensajes en español, reglas citadas por su código RN), flujo de trabajo (una tarea del plan por vez, test antes o junto con el código, `npm test` en verde, tildar la tarea y commit con su código), y prohibiciones (no subir `.env` ni credenciales, no agregar dependencias sin justificar, no implementar nada fuera de la spec).

## 11. Challenge de validación

Antes de aceptar el código generado por IA, se verifica que **resuelve el problema**, no solo que compila.

**Recorrido funcional (en la URL pública):**

1. Crear la categoría "Puntualidad" y el problema "Llegar tarde al trabajo".
2. Cargar 5 ocurrencias en los últimos 30 días, una con gravedad 4 → la prioridad debe ser ALTA y la cantidad, 5.
3. Agregar la solución "Poner la alarma 20 minutos antes" con fecha de hace 10 días y evaluarla como FUNCIONO → la efectividad debe mostrar la comparación antes/después.
4. Intentar marcar SOLUCIONADO con una ocurrencia de hace 3 días → debe rechazarse explicando el motivo (RN-15).
5. Marcar CONTROLADO → debe permitirse (RN-14) y aparecer en el historial.
6. Verificar que el historial muestra todo en orden y que las estadísticas cambian al editar o borrar una ocurrencia.

**Casos de error:**

- Problema sin nombre, con 2 caracteres o con nombre repetido en otra combinación de mayúsculas.
- Ocurrencia con fecha futura o gravedad 0, 6 o "abc".
- Evaluar una solución planificada a futuro, o marcar NO_FUNCIONO sin observaciones.
- Borrar una categoría en uso, o un problema con datos sin confirmar.
- Búsqueda de 1 carácter, filtro con un estado inexistente, búsqueda sin resultados.
- Pedir un id que no existe (`/problemas/99999`) → 404 con mensaje, no 500.

**Revisión de código:**

- Cada capa cumple su responsabilidad: no hay SQL en las rutas ni reglas de negocio en los repositorios.
- Cada regla está implementada en un solo lugar y tiene su test.
- No hay archivos gigantes ni código duplicado entre los repositorios de memoria y PostgreSQL.
- No hay secretos en el repo: se revisa el historial de git, no solo el último commit.
- La interfaz se entiende sin conocer la implementación.

## 12. Prompt profesional

> Sos un desarrollador full stack senior. Vas a construir **Bucle**, una aplicación web para registrar problemas recurrentes, sus ocurrencias y las soluciones probadas, y medir cuáles funcionan.
>
> **Fuente de verdad:** `docs/SPEC.md`. Implementá exactamente las funcionalidades F-01 a F-10 y las reglas RN-01 a RN-22. No agregues funcionalidades que no estén en la spec. Si algo no está especificado, elegí la alternativa más simple y dejala anotada en `docs/PLAN.md`.
>
> **Stack:** Node.js 22 + Express + PostgreSQL (`pg`) en el backend; HTML, CSS y JavaScript sin frameworks en el frontend; tests con `node:test` y `supertest`. No agregues otras dependencias.
>
> **Arquitectura:** rutas → servicios → dominio (funciones puras) y repositorios con dos implementaciones (PostgreSQL y memoria) que comparten interfaz. La hora actual se obtiene de un reloj inyectable.
>
> **Forma de trabajo:** seguí `docs/PLAN.md` en orden, de a una tarea. Para cada tarea: escribí los tests de las reglas involucradas (con el código RN en el nombre del test), implementá, corré `npm test` hasta que pase todo, tildá la tarea y hacé un commit cuyo mensaje empiece con el código de la tarea.
>
> **Calidad:** código y mensajes en español; funciones cortas con una sola responsabilidad; errores con el formato de la sección 5 de la spec; ningún dato inválido debe producir un error 500. Nunca escribas credenciales en el código: usá variables de entorno y mantené `.env.example` actualizado.
>
> **Antes de terminar cada tarea**, verificá que lo hecho funciona de punta a punta, no solo que los tests pasan.

## 13. Checklist de entrega

- [ ] Repositorio público en GitHub.
- [ ] `docs/SPEC.md` con reglas numeradas (RN-01 a RN-22).
- [ ] `AGENTS.md` en la raíz.
- [ ] `docs/PLAN.md` con todas las tareas tildadas y un commit por tarea.
- [ ] `npm test` pasa al 100 %.
- [ ] Sin secretos en el repo ni en el historial (`.env` en `.gitignore`).
- [ ] `docs/INFORME_PRUEBAS.md` completo.
- [ ] Frontend en Netlify, backend en Render y base de datos en Neon funcionando.
- [ ] README con descripción, capturas, instrucciones y enlaces públicos que funcionan.
