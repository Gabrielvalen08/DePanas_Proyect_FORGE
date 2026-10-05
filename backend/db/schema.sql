-- schema.sql
-- De Panas SV — Esquema de base de datos SQLite

-- Catálogo de materiales: nombre único + su categoría + producto destino
CREATE TABLE IF NOT EXISTS materiales_catalogo (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT UNIQUE NOT NULL COLLATE NOCASE,
    categoria TEXT NOT NULL,
    producto  TEXT NOT NULL DEFAULT ''
);

-- Tabla principal de ingresos (una fila por material comprado)
-- Replica exactamente las columnas del Excel: Fecha, Material, Cantidad, Monto, Proveedor, Categoría, Producto
CREATE TABLE IF NOT EXISTS ingresos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha      TEXT NOT NULL,           -- 'YYYY-MM-DD'
    material   TEXT NOT NULL,
    cantidad   REAL NOT NULL DEFAULT 1,
    monto      REAL NOT NULL,           -- precio total pagado por esa línea
    proveedor  TEXT NOT NULL,
    categoria  TEXT NOT NULL,
    producto   TEXT NOT NULL DEFAULT '' -- producto final al que se destina (opcional)
);

-- Índices para los filtros más comunes
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_proveedor ON ingresos(proveedor COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_ingresos_material ON ingresos(material COLLATE NOCASE);
