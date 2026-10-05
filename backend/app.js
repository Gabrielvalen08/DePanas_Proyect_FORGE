/**
 * app.js — Crea la aplicación Express y su conexión SQLite.
 * Separado de index.js para poder probarla con una base temporal.
 */

import express from 'express'
import cors from 'cors'
import { copyFileSync, existsSync, rmSync } from 'fs'

import { abrirDB, copiaConsistente } from './db.js'
import { crearRutasCompras } from './routes/compras.js'
import { crearRutasListas } from './routes/listas.js'
import { crearRutasExport } from './routes/db_export.js'

/**
 * @param {Object} opciones
 * @param {string} opciones.dbPath      ruta de depanas.db
 * @param {string} opciones.schemaPath  ruta de schema.sql
 * @param {string} [opciones.origenCors]
 */
export function crearApp({ dbPath, schemaPath, origenCors = 'http://localhost:5173' }) {
  let db = abrirDB(dbPath, schemaPath)
  const getDb = () => db
  const rutaRespaldo = dbPath.replace(/\.db$/, '') + '.respaldo.db'

  /**
   * Reemplaza depanas.db por `rutaArchivo` (ya validado).
   * Antes guarda un respaldo de la base actual; si algo falla, lo restaura.
   * La conexión siempre queda abierta al terminar.
   */
  function reemplazarDB(rutaArchivo) {
    copiaConsistente(db, rutaRespaldo)
    db.close()
    try {
      // Los -wal/-shm de la base anterior no deben aplicarse sobre la nueva
      for (const sufijo of ['-wal', '-shm']) rmSync(dbPath + sufijo, { force: true })
      copyFileSync(rutaArchivo, dbPath)
      db = abrirDB(dbPath, schemaPath)
    } catch (error) {
      if (existsSync(rutaRespaldo)) copyFileSync(rutaRespaldo, dbPath)
      db = abrirDB(dbPath, schemaPath)
      throw error
    }
    return { respaldo: rutaRespaldo }
  }

  const app = express()
  app.use(cors({ origin: origenCors }))
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.use('/api/compras', crearRutasListas(getDb))
  app.use('/api/ingresos', crearRutasCompras(getDb))
  app.use('/api/db', crearRutasExport(getDb, reemplazarDB))

  // Health-check: el frontend lo usa para decidir si trabaja con el servidor
  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  // Ruta raíz informativa
  app.get('/', (_req, res) => {
    res.send(`
      <html>
        <head><title>De Panas SV — API Backend</title></head>
        <body style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto; line-height: 1.6;">
          <h2>Servidor Backend De Panas SV activo</h2>
          <p>Este puerto es la API y base de datos SQLite.</p>
          <p>Para ver la aplicación, abre <a href="http://localhost:5173">http://localhost:5173</a>.</p>
          <hr/>
          <p style="color: #666; font-size: 0.9rem;">Endpoints: <code>/api/health</code>, <code>/api/compras</code>, <code>/api/ingresos</code>, <code>/api/db/exportar</code></p>
        </body>
      </html>
    `)
  })

  return { app, cerrar: () => db.close() }
}
