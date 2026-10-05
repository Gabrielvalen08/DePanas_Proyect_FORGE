/**
 * routes/db_export.js
 * Portabilidad entre dispositivos:
 *   GET  /api/db/exportar          → descarga una copia consistente de depanas.db
 *   POST /api/db/importar          → valida un .db, respalda la base actual y la reemplaza
 *   GET  /api/db/exportar-json     → exporta todas las compras como JSON
 *   POST /api/db/importar-json     → fusiona compras desde JSON (no duplica las que ya existen)
 *
 * Para importar el archivo binario se usa multer (upload a una carpeta temporal del sistema).
 */

import { Router } from 'express'
import multer from 'multer'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { copiaConsistente, enTransaccion, esBaseDePanas } from '../db.js'
import { agruparFilas, validarCompra } from './listas.js'

const CARPETA_TEMPORAL = join(tmpdir(), 'depanas-uploads')
mkdirSync(CARPETA_TEMPORAL, { recursive: true })

const upload = multer({
  dest: CARPETA_TEMPORAL,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
})

function borrarSiExiste(ruta) {
  if (ruta && existsSync(ruta)) rmSync(ruta, { force: true })
}

/**
 * Convierte el JSON importado en compras { id?, proveedor, fecha, categoria, materiales }.
 * Acepta el formato de /exportar-json (compras con materiales) y filas planas
 * de `ingresos` (las agrupa por compra_id o, si no tienen, por proveedor + fecha).
 */
function aCompras(datos) {
  if (datos.every(d => Array.isArray(d?.materiales))) return datos
  const filas = datos.map(f => ({
    ...f,
    compra_id: f.compra_id || `legado:${f.proveedor}|${f.fecha}`,
    unidad: f.unidad || 'unidad',
  }))
  return agruparFilas(filas)
}

/**
 * getDb(): conexión vigente.
 * reemplazarDB(rutaArchivo): cierra la conexión, reemplaza depanas.db y la reabre.
 */
export function crearRutasExport(getDb, reemplazarDB) {
  const router = Router()

  // GET /api/db/exportar — copia completa y consistente (incluye lo que está en el WAL)
  router.get('/exportar', (_req, res) => {
    const temporal = join(tmpdir(), `depanas-export-${Date.now()}.db`)
    try {
      copiaConsistente(getDb(), temporal)
    } catch (err) {
      borrarSiExiste(temporal)
      return res.status(500).json({ error: `No se pudo exportar: ${err.message}` })
    }
    res.download(temporal, 'depanas.db', err => {
      borrarSiExiste(temporal)
      if (err && !res.headersSent) res.status(500).json({ error: 'Error al descargar' })
    })
  })

  // POST /api/db/importar — reemplaza la base de datos con el archivo recibido
  router.post('/importar', upload.single('db'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' })
    }
    try {
      if (!esBaseDePanas(req.file.path)) {
        return res.status(400).json({ error: 'El archivo no es una base de datos de De Panas válida' })
      }
      const { respaldo } = reemplazarDB(req.file.path)
      res.json({ ok: true, mensaje: 'Base de datos importada correctamente', respaldo })
    } catch (err) {
      res.status(500).json({ error: err.message })
    } finally {
      borrarSiExiste(req.file.path)
    }
  })

  // GET /api/db/exportar-json — todas las compras, agrupadas
  router.get('/exportar-json', (_req, res) => {
    try {
      const filas = getDb().prepare('SELECT * FROM ingresos ORDER BY fecha DESC, id DESC').all()
      res.setHeader('Content-Disposition', 'attachment; filename="depanas_compras.json"')
      res.json(agruparFilas(filas))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/db/importar-json — fusiona compras desde JSON.
  // Las compras cuyo id ya existe se omiten: importar dos veces no duplica.
  router.post('/importar-json', (req, res) => {
    const datos = req.body
    if (!Array.isArray(datos) || datos.length === 0) {
      return res.status(400).json({ error: 'Se esperaba una lista de compras' })
    }

    const compras = []
    for (const [i, cruda] of aCompras(datos).entries()) {
      const { compra, error } = validarCompra(cruda)
      if (error) return res.status(400).json({ error: `Compra ${i + 1}: ${error}` })
      // Sin id propio (p. ej. exportada en modo local): id derivado del contenido,
      // así reimportar el mismo archivo no la duplica
      const id = typeof cruda.id === 'string' && cruda.id
        ? cruda.id
        : `importada:${createHash('sha1').update(JSON.stringify(compra)).digest('hex').slice(0, 16)}`
      compras.push({ id, ...compra })
    }

    const db = getDb()
    const existe = db.prepare('SELECT 1 FROM ingresos WHERE compra_id = ? LIMIT 1')
    const insertar = db.prepare(
      'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )

    try {
      const resultado = enTransaccion(db, () => {
        let nuevas = 0
        let omitidas = 0
        for (const c of compras) {
          if (existe.get(c.id)) { omitidas++; continue }
          for (const m of c.materiales) {
            insertar.run(c.id, c.fecha, m.material, m.cantidad, m.unidad, m.monto, c.proveedor, c.categoria, m.producto)
          }
          nuevas++
        }
        return { nuevas, omitidas }
      })
      res.json({ ok: true, ...resultado })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
