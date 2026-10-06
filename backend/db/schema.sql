-- schema.sql
-- De Panas SV — Esquema de base de datos SQLite (una sola tabla)
-- Replica las columnas de Tabla_DePanas.xlsx:
-- Fecha, Material, Cantidad, Monto, Proveedor, Categoría, Producto
-- y agrega:
--   compra_id: identifica la compra (lista) a la que pertenece cada fila.
--              Sin él, dos compras al mismo proveedor el mismo día se mezclaban.
--   unidad:    unidad de la cantidad (lb, kg, unidad…).
--
-- Las bases creadas con el esquema anterior se actualizan en db.js (migrar).

CREATE TABLE IF NOT EXISTS ingresos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id  TEXT,                         -- Compra a la que pertenece la fila
    fecha      TEXT NOT NULL,               -- Formato 'YYYY-MM-DD'
    material   TEXT NOT NULL,               -- Material / Insumo comprado
    cantidad   REAL NOT NULL DEFAULT 1,     -- Cantidad comprada
    unidad     TEXT NOT NULL DEFAULT 'unidad', -- Unidad de la cantidad
    monto      REAL NOT NULL,               -- Total pagado por esta línea
    proveedor  TEXT NOT NULL,               -- Proveedor o comercio
    categoria  TEXT DEFAULT '',             -- Categoría (definida en DB, aún no en web)
    producto   TEXT DEFAULT ''              -- Producto destino (definido en DB, aún no en web)
);

-- Opciones de los desplegables (proveedor, categoría, material, producto).
-- Cada material guarda su categoría y su producto, como en el Excel.
-- Se siembra con las listas del Excel (db/catalogo.js) al abrir la base.
CREATE TABLE IF NOT EXISTS catalogo (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo       TEXT NOT NULL CHECK (tipo IN ('proveedor', 'categoria', 'material', 'producto')),
    nombre     TEXT NOT NULL,
    categoria  TEXT NOT NULL DEFAULT '',   -- Solo materiales
    producto   TEXT NOT NULL DEFAULT '',   -- Solo materiales
    UNIQUE (tipo, nombre COLLATE NOCASE)
);

-- Índices para búsquedas y filtros rápidos
-- (el índice de compra_id se crea en db.js, después de migrar bases antiguas)
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_proveedor ON ingresos(proveedor COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_ingresos_material ON ingresos(material COLLATE NOCASE);
