/**
 * routes/db_export.js
 * Portabilidad entre dispositivos:
 *   GET  /api/db/exportar          → descarga el archivo depanas.db
 *   POST /api/db/importar          → recibe un .db, lo reemplaza y reconecta SQLite
 *   GET  /api/db/exportar-json     → exporta todos los ingresos como JSON
 *   POST /api/db/importar-json     → importa ingresos desde JSON (fusiona, no reemplaza)
 *
 * Para importar el archivo binario se usa multer (upload a disco temporal).
 */

import { Router } from 'express'
import multer from 'multer'
import { existsSync, copyFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'

const upload = multer({ dest: 'tmp_uploads/' })

export function crearRutasExport(db, dbPath, reconectarDB) {
  const router = Router()

  // GET /api/db/exportar — descarga el archivo SQLite completo
  router.get('/exportar', (_req, res) => {
    const rutaAbsoluta = resolve(dbPath)
    if (!existsSync(rutaAbsoluta)) {
      return res.status(404).json({ error: 'Base de datos no encontrada' })
    }
    res.download(rutaAbsoluta, 'depanas.db', err => {
      if (err) res.status(500).json({ error: 'Error al descargar' })
    })
  })

  // POST /api/db/importar — reemplaza la base de datos con el archivo recibido
  router.post('/importar', upload.single('db'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' })
    }
    try {
      const rutaAbsoluta = resolve(dbPath)
      // Cerrar la conexión actual antes de reemplazar el archivo
      reconectarDB(() => {
        copyFileSync(req.file.path, rutaAbsoluta)
        unlinkSync(req.file.path)
      })
      res.json({ ok: true, mensaje: 'Base de datos importada correctamente' })
    } catch (err) {
      if (req.file?.path && existsSync(req.file.path)) unlinkSync(req.file.path)
      res.status(500).json({ error: err.message })
    }
  })

  // GET /api/db/exportar-json — todos los ingresos como JSON (alternativa ligera)
  router.get('/exportar-json', (_req, res) => {
    try {
      const ingresos = db.prepare('SELECT * FROM ingresos ORDER BY fecha DESC, id DESC').all()
      res.setHeader('Content-Disposition', 'attachment; filename="depanas_ingresos.json"')
      res.json(ingresos)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/db/importar-json — fusiona ingresos desde JSON
  // Body: array de objetos { fecha, material, cantidad, monto, proveedor, categoria, producto }
  router.post('/importar-json', (req, res) => {
    const filas = req.body
    if (!Array.isArray(filas) || filas.length === 0) {
      return res.status(400).json({ error: 'Se esperaba un array de ingresos' })
    }

    const insertar = db.prepare(
      'INSERT INTO ingresos (fecha, material, cantidad, monto, proveedor, categoria, producto) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )

    db.exec('BEGIN')
    try {
      let insertadas = 0
      for (const f of filas) {
        insertar.run(f.fecha, f.material, Number(f.cantidad) || 1, Number(f.monto), f.proveedor, f.categoria, f.producto ?? '')
        insertadas++
      }
      db.exec('COMMIT')
      res.json({ ok: true, insertadas })
    } catch (err) {
      try { db.exec('ROLLBACK') } catch {}
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
