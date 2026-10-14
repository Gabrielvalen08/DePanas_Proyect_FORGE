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
import { resolverCarga } from '../../shared/carga-compras.js'
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

  // Valida y resuelve el lote completo dentro de la misma transacción.
  router.post('/importar-json', (req, res) => {
    const compras = Array.isArray(req.body) ? req.body : req.body?.compras
    const decisiones = Array.isArray(req.body) ? [] : req.body?.decisiones ?? []
    const db = getDb()
    try {
      const resultado = enTransaccion(db, () => {
        const existentes = agruparFilas(db.prepare('SELECT * FROM ingresos ORDER BY id').all())
        let plan
        try { plan = resolverCarga(compras, existentes, decisiones) }
        catch (err) { err.status ??= 400; throw err }
        if (!compras.length) { const err = new Error('Selecciona al menos una compra'); err.status = 400; throw err }
        const insertar = db.prepare(
          'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto, origen_id, compra_categoria) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        for (const { compra: c, nueva } of plan.escrituras) {
          const id = nueva ? randomUUID() : c.id
          if (!nueva) db.prepare('DELETE FROM ingresos WHERE compra_id = ?').run(id)
          registrarCompra(db, c)
          for (const m of c.materiales) {
            insertar.run(id, c.fecha, m.material, m.cantidad, m.unidad, m.monto, c.proveedor, m.categoria, m.producto, c.origen_id, c.categoria)
          }
        }
        return plan.resultado
      })
      res.json({ ok: true, ...resultado })
    } catch (err) {
      res.status(err.status ?? 500).json({ error: err.message })
    }
  })

  return router
}
