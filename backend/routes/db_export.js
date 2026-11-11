/**
 * routes/db_export.js
 * Portabilidad entre dispositivos:
 *   GET  /api/db/exportar          → descarga una copia consistente de depanas.db
 *   POST /api/db/importar          → valida un .db, respalda la base actual y la reemplaza
 *   GET  /api/db/exportar-json     → exporta todas las compras como JSON
 *   POST /api/db/importar-json     → carga compras completas desde JSON
 *
 * Para importar el archivo binario se usa multer (upload a una carpeta temporal del sistema).
 * Los respaldos JSON leen y escriben con el DAO de compras (dao/compras.js).
 */

import { Router } from 'express'
import multer from 'multer'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { copiaConsistente, esBaseDePanas } from '../db.js'
import { comprasDAO } from '../dao/compras.js'
import { enviarError, responder } from './responder.js'

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
      return enviarError(res, err)
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
      enviarError(res, err)
    } finally {
      borrarSiExiste(req.file.path)
    }
  })

  // GET /api/db/exportar-json — todas las compras, agrupadas
  router.get('/exportar-json', (_req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="depanas_compras.json"')
    responder(res, () => comprasDAO(getDb()).todas())
  })

  // POST /api/db/importar-json — { compras, decisiones } (o solo la lista): todo o nada
  router.post('/importar-json', (req, res) => {
    const compras = Array.isArray(req.body) ? req.body : req.body?.compras
    const decisiones = Array.isArray(req.body) ? [] : req.body?.decisiones ?? []
    responder(res, () => ({ ok: true, ...comprasDAO(getDb()).cargarRespaldo(compras, decisiones) }))
  })

  return router
}
