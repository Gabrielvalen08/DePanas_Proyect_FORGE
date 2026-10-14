/**
 * routes/db_export.js
 * Portabilidad entre dispositivos:
 *   GET  /api/db/exportar          → descarga una copia consistente de depanas.db
 *   POST /api/db/importar          → valida un .db, respalda la base actual y la reemplaza
 *   GET  /api/db/exportar-json     → exporta todas las compras como JSON
 *   POST /api/db/importar-json     → carga compras completas desde JSON
 *
 * Para importar el archivo binario se usa multer (upload a una carpeta temporal del sistema).
 */

import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { validarComprasJSON } from '../../shared/compras-json.js'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { copiaConsistente, enTransaccion, esBaseDePanas, registrarCompra } from '../db.js'
import { agruparFilas } from './listas.js'

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

  // Cada carga crea compras independientes; no se deduplican.
  router.post('/importar-json', (req, res) => {
    let compras
    try {
      compras = validarComprasJSON(req.body)
      if (!compras.length) throw new Error('Selecciona al menos una compra')
    } catch (err) {
      return res.status(400).json({ error: err.message })
    }
    const db = getDb()
    const insertar = db.prepare(
      'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )

    try {
      const resultado = enTransaccion(db, () => {
        let nuevas = 0

        for (const c of compras) {
          const id = randomUUID()
          registrarCompra(db, c)
          for (const m of c.materiales) {
            insertar.run(id, c.fecha, m.material, m.cantidad, m.unidad, m.monto, c.proveedor, m.categoria, m.producto)
          }
          nuevas++
        }
        return { nuevas }
      })
      res.json({ ok: true, ...resultado })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}

