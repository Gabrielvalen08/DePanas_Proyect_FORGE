/**
 * db.js — Apertura, migración y utilidades de la base SQLite
 */

import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'fs'
import { CATALOGO_INICIAL } from './db/catalogo.js'
import { USUARIOS_INICIALES } from './db/usuarios.js'

// Columnas mínimas para aceptar un archivo .db importado
export const COLUMNAS_REQUERIDAS = ['fecha', 'material', 'cantidad', 'monto', 'proveedor']

// Versión del catálogo (PRAGMA user_version). La siembra corre una sola vez por
// base: si corriera en cada arranque, lo que el usuario elimina volvería a aparecer.
const VERSION_CATALOGO = 1

/** Abre la base, aplica el esquema y migra bases del esquema anterior */
export function abrirDB(dbPath, schemaPath) {
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  // Si otro programa tiene la base ocupada (p. ej. DB Browser), espera en vez de fallar al instante
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec(readFileSync(schemaPath, 'utf8'))
  migrar(db)
  prepararCatalogo(db)
  prepararUsuarios(db)
  // Lo que quedó en depanas.db-wal de la sesión anterior pasa a depanas.db
  consolidar(db, 'TRUNCATE')
  return db
}

/**
 * Pasa a depanas.db lo que está en el WAL. Con WAL, SQLite solo lo hace al
 * cerrar la conexión o al juntar ~4 MB, y el servidor casi nunca se cierra
 * ordenadamente (npm run dev lo mata al reiniciar): sin esto, copiar a mano
 * solo depanas.db podía llevarse una base vacía.
 * PASSIVE no bloquea a nadie; TRUNCATE además vacía el archivo -wal.
 */
export function consolidar(db, modo = 'PASSIVE') {
  db.exec(`PRAGMA wal_checkpoint(${modo === 'TRUNCATE' ? 'TRUNCATE' : 'PASSIVE'});`)
}

/**
 * Bases nuevas, de la versión anterior o importadas: siembra el catálogo del
 * Excel y le agrega lo que ya hay en sus compras. Desde entonces el catálogo es
 * la única fuente de las opciones: cada compra guardada registra lo suyo.
 */
export function prepararCatalogo(db) {
  const { user_version: version } = db.prepare('PRAGMA user_version').get()
  if (version >= VERSION_CATALOGO) return
  enTransaccion(db, () => {
    sembrarCatalogo(db)
    completarDesdeCompras(db)
  })
  db.exec(`PRAGMA user_version = ${VERSION_CATALOGO}`)
}

/**
 * Siembra Cesar_01 (administrador) y Marta_02 si la tabla está vacía. Como el
 * administrador no se puede eliminar, la tabla nunca vuelve a quedar vacía y
 * lo que el administrador cambia no se pisa al reabrir la base.
 */
export function prepararUsuarios(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n > 0) return
  const insertar = db.prepare('INSERT INTO usuarios (usuario, nombre, contrasena, rol, permisos) VALUES (?, ?, ?, ?, ?)')
  enTransaccion(db, () => {
    for (const u of USUARIOS_INICIALES) {
      insertar.run(u.usuario, u.nombre, u.contrasena, u.rol, JSON.stringify(u.permisos))
    }
  })
}

/** Completa la categoría o el producto vacíos de un material (no pisa lo asignado) */
function completarMaterial(db, nombre, categoria, producto) {
  db.prepare(
    "UPDATE catalogo SET categoria = CASE WHEN categoria = '' THEN ? ELSE categoria END, " +
    "producto = CASE WHEN producto = '' THEN ? ELSE producto END " +
    "WHERE tipo = 'material' AND nombre = ? COLLATE NOCASE"
  ).run(categoria || '', producto || '', nombre)
}

/** Opciones del Excel (db/catalogo.js) */
function sembrarCatalogo(db) {
  for (const tipo of ['proveedor', 'categoria', 'producto']) {
    for (const nombre of CATALOGO_INICIAL[tipo]) registrarEnCatalogo(db, tipo, nombre)
  }
  for (const [nombre, categoria, producto] of CATALOGO_INICIAL.material) {
    registrarEnCatalogo(db, 'material', nombre)
    completarMaterial(db, nombre, categoria, producto)
  }
}

/** Lo que ya está en las compras; cada material toma la categoría y el producto de su fila más reciente */
function completarDesdeCompras(db) {
  for (const tipo of ['proveedor', 'categoria', 'producto']) {
    const filas = db.prepare(`SELECT DISTINCT ${tipo} AS v FROM ingresos WHERE ${tipo} IS NOT NULL AND trim(${tipo}) != ''`).all()
    for (const { v } of filas) registrarEnCatalogo(db, tipo, v)
  }
  const ultimo = campo => db.prepare(
    `SELECT ${campo} AS v FROM ingresos WHERE material = ? COLLATE NOCASE AND ${campo} != '' ORDER BY id DESC LIMIT 1`
  )
  const ultimaCategoria = ultimo('categoria')
  const ultimoProducto = ultimo('producto')
  for (const { v } of db.prepare("SELECT DISTINCT material AS v FROM ingresos WHERE trim(material) != ''").all()) {
    registrarEnCatalogo(db, 'material', v)
    completarMaterial(db, v, ultimaCategoria.get(v)?.v, ultimoProducto.get(v)?.v)
  }
}

/**
 * Devuelve el nombre ya registrado (con su escritura original, sin distinguir
 * mayúsculas) o registra uno nuevo. { nombre, nuevo }
 */
export function registrarEnCatalogo(db, tipo, nombre) {
  const limpio = nombre.trim()
  const existente = db.prepare('SELECT nombre FROM catalogo WHERE tipo = ? AND nombre = ? COLLATE NOCASE').get(tipo, limpio)
  if (existente) return { nombre: existente.nombre, nuevo: false }
  db.prepare('INSERT INTO catalogo (tipo, nombre) VALUES (?, ?)').run(tipo, limpio)
  return { nombre: limpio, nuevo: true }
}

/**
 * Registra en el catálogo el proveedor, los materiales y sus categorías y
 * productos de una compra (ya validada). Llamar dentro de la transacción del guardado.
 */
export function registrarCompra(db, compra) {
  registrarEnCatalogo(db, 'proveedor', compra.proveedor)
  for (const m of compra.materiales) {
    const categoria = (m.categoria || compra.categoria || '').trim()
    const producto = (m.producto || '').trim()
    registrarEnCatalogo(db, 'material', m.material)
    if (categoria) registrarEnCatalogo(db, 'categoria', categoria)
    if (producto) registrarEnCatalogo(db, 'producto', producto)
    completarMaterial(db, m.material, categoria, producto)
  }
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

  // Catálogos creados antes de que los materiales guardaran categoría y producto
  const columnasCatalogo = db.prepare('PRAGMA table_info(catalogo)').all().map(c => c.name)
  for (const columna of ['categoria', 'producto']) {
    if (!columnasCatalogo.includes(columna)) {
      db.exec(`ALTER TABLE catalogo ADD COLUMN ${columna} TEXT NOT NULL DEFAULT ''`)
    }
  }
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
