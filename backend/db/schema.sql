-- schema.sql
-- De Panas SV — Esquema de base de datos SQLite (Una sola tabla)
-- Replica exactamente las columnas de Tabla_DePanas.xlsx:
-- Fecha, Material, Cantidad, Monto, Proveedor, Categoría, Producto

CREATE TABLE IF NOT EXISTS ingresos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha      TEXT NOT NULL,               -- Formato 'YYYY-MM-DD'
    material   TEXT NOT NULL,               -- Material / Insumo comprado
    cantidad   REAL NOT NULL DEFAULT 1,     -- Cantidad comprada
    monto      REAL NOT NULL,               -- Precio / Monto pagado
    proveedor  TEXT NOT NULL,               -- Proveedor o comercio
    categoria  TEXT DEFAULT '',             -- Categoría (definida en DB, aún no en web)
    producto   TEXT DEFAULT ''              -- Producto destino (definido en DB, aún no en web)
);

-- Índices para búsquedas y filtros rápidos
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_proveedor ON ingresos(proveedor COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_ingresos_material ON ingresos(material COLLATE NOCASE);
