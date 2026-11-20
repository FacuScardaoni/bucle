-- Esquema de la base de datos de Bucle (PostgreSQL).
-- Es idempotente: el servidor lo ejecuta al arrancar y no borra datos existentes.

CREATE TABLE IF NOT EXISTS categorias (
  id                 SERIAL PRIMARY KEY,
  nombre             VARCHAR(40)  NOT NULL,
  nombre_normalizado VARCHAR(40)  NOT NULL UNIQUE,          -- RN-02
  descripcion        VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS problemas (
  id                 SERIAL PRIMARY KEY,
  nombre             VARCHAR(80)  NOT NULL,
  nombre_normalizado VARCHAR(80)  NOT NULL UNIQUE,          -- RN-04
  descripcion        VARCHAR(500),
  categoria_id       INTEGER      NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,  -- RN-03, RN-05
  estado             VARCHAR(12)  NOT NULL DEFAULT 'ACTIVO'
                     CHECK (estado IN ('ACTIVO', 'CONTROLADO', 'SOLUCIONADO')),
  fecha_creacion     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_estado       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ocurrencias (
  id                 SERIAL PRIMARY KEY,
  problema_id        INTEGER      NOT NULL REFERENCES problemas(id) ON DELETE CASCADE,  -- RN-18
  fecha              TIMESTAMPTZ  NOT NULL,
  descripcion        VARCHAR(300) NOT NULL,
  contexto           VARCHAR(200),
  posible_causa      VARCHAR(200),
  gravedad           SMALLINT     NOT NULL CHECK (gravedad BETWEEN 1 AND 5)             -- RN-09
);

CREATE TABLE IF NOT EXISTS soluciones (
  id                 SERIAL PRIMARY KEY,
  problema_id        INTEGER      NOT NULL REFERENCES problemas(id) ON DELETE CASCADE,
  nombre             VARCHAR(80)  NOT NULL,
  nombre_normalizado VARCHAR(80)  NOT NULL,
  descripcion        VARCHAR(500),
  fecha_aplicacion   DATE         NOT NULL,
  resultado          VARCHAR(12)  NOT NULL DEFAULT 'PENDIENTE'
                     CHECK (resultado IN ('PENDIENTE', 'FUNCIONO', 'PARCIAL', 'NO_FUNCIONO')),
  observaciones      VARCHAR(500),
  fecha_evaluacion   TIMESTAMPTZ,
  UNIQUE (problema_id, nombre_normalizado)                                               -- RN-11
);

CREATE TABLE IF NOT EXISTS cambios_estado (
  id                 SERIAL PRIMARY KEY,
  problema_id        INTEGER      NOT NULL REFERENCES problemas(id) ON DELETE CASCADE,
  estado_anterior    VARCHAR(12)  NOT NULL,
  estado_nuevo       VARCHAR(12)  NOT NULL,
  motivo             VARCHAR(10)  NOT NULL CHECK (motivo IN ('MANUAL', 'RECAIDA')),
  fecha              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocurrencias_problema    ON ocurrencias (problema_id);
CREATE INDEX IF NOT EXISTS idx_soluciones_problema     ON soluciones (problema_id);
CREATE INDEX IF NOT EXISTS idx_cambios_estado_problema ON cambios_estado (problema_id);
