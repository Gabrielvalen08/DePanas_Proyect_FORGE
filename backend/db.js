/**
 * db.js — Apertura, migración y utilidades de la base SQLite
 */

import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'fs'

// Columnas mínimas para aceptar un archivo .db importado
export const COLUMNAS_REQUERIDAS = ['fecha', 'material', 'cantidad', 'monto', 'proveedor']

/** Abre la base, aplica el esquema y migra bases del esquema anterior */
export function abrirDB(dbPath, schemaPath) {
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(readFileSync(schemaPath, 'utf8'))
  migrar(db)
  return db
}

/**
 * Actualiza bases creadas antes de compra_id y unidad.
 * Las filas sin compra_id se agrupan por proveedor + fecha: es la mejor
 * aproximación posible, porque el esquema anterior no guardaba la compra.
 */
export function migrar(db) {
  const columnas = db.prepare('PRAGMA table_info(ingresos)').all().map(c => c.name)
  if (!columnas.includes('unidad')) {
    db.exec("ALTER TABLE ingresos ADD COLUMN unidad TEXT NOT NULL DEFAULT 'unidad'")
  }
  if (!columnas.includes('compra_id')) {
    db.exec('ALTER TABLE ingresos ADD COLUMN compra_id TEXT')
  }
  db.exec(
    "UPDATE ingresos SET compra_id = 'legado:' || proveedor || '|' || fecha " +
    "WHERE compra_id IS NULL OR compra_id = ''"
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_ingresos_compra ON ingresos(compra_id)')
}

/** Ejecuta fn dentro de una transacción; si lanza, deshace todo */
export function enTransaccion(db, fn) {
  db.exec('BEGIN')
  try {
    const resultado = fn()
    db.exec('COMMIT')
    return resultado
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // No había transacción abierta: no hay nada que deshacer
    }
    throw error
  }
}

/**
 * Copia consistente de la base completa en `destino`.
 * Con WAL, los datos recientes viven en depanas.db-wal; copiar solo el
 * archivo .db podía exportar una base vacía. VACUUM INTO incluye todo.
 */
export function copiaConsistente(db, destino) {
  db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`)
}

/** true si el archivo es una base SQLite con la tabla ingresos y sus columnas */
export function esBaseDePanas(ruta) {
  let db
  try {
    db = new DatabaseSync(ruta, { readOnly: true })
    const columnas = db.prepare('PRAGMA table_info(ingresos)').all().map(c => c.name)
    return COLUMNAS_REQUERIDAS.every(c => columnas.includes(c))
  } catch {
    return false
  } finally {
    db?.close()
  }
}
