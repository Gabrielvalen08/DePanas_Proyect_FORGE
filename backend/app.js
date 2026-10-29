/**
 * app.js — Crea la aplicación Express y su conexión SQLite.
 * Separado de index.js para poder probarla con una base temporal.
 */

import express from 'express'
import cors from 'cors'
import { copyFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'

import { abrirDB, consolidar, copiaConsistente } from './db.js'
import { crearRutasCompras } from './routes/compras.js'
import { crearRutasListas } from './routes/listas.js'
import { crearRutasExport } from './routes/db_export.js'
import { crearRutasCatalogo } from './routes/catalogo.js'
import { buscar, crearRutaSesion, crearRutasRequisitos, crearRutasUsuarios, publico, tokenDe } from './routes/usuarios.js'
import { crearSesiones } from './sesiones.js'
import { cumple, permisoRequerido } from './permisos.js'

/**
 * @param {Object} opciones
 * @param {string} opciones.dbPath      ruta de depanas.db
 * @param {string} opciones.schemaPath  ruta de schema.sql
 * @param {string} [opciones.origenCors]
 * @param {string} [opciones.estaticos] carpeta del frontend ya compilado (frontend/dist) para
 *   servirlo desde este mismo servidor, como en la app de escritorio (desktop/)
 * @param {ReturnType<typeof crearSesiones>} [opciones.sesiones] sesiones (las pruebas pasan unas con reloj propio)
 */
export function crearApp({ dbPath, schemaPath, origenCors = 'http://localhost:5173', estaticos, sesiones = crearSesiones() }) {
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

  // Tras cada escritura que salió bien, sus cambios pasan del WAL a depanas.db
  // (ver consolidar en db.js): así el archivo .db siempre está completo
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => {
        if (res.statusCode >= 400) return
        try {
          consolidar(db)
        } catch {
          // Si la base está ocupada se consolida en la próxima escritura o al reiniciar
        }
      })
    }
    next()
  })

  // Health-check: el frontend lo usa para decidir si trabaja con el servidor
  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  // Toda la API exige sesión (salvo health y entrar) y el permiso de la ruta (permisos.js).
  // El usuario se vuelve a leer en cada petición: si lo eliminan o le quitan una pantalla,
  // deja de poder usarla en el acto.
  app.use('/api', (req, res, next) => {
    if (req.path === '/sesion' && req.method === 'POST') return next()
    const sesion = sesiones.leer(tokenDe(req))
    const registro = sesion && buscar(db, sesion.usuario)
    if (!registro) return res.status(401).json({ error: 'Tu sesión venció o no es válida. Vuelve a entrar.' })
    const usuario = publico(registro)
    if (!cumple(usuario, permisoRequerido(req.method, req.path))) {
      return res.status(403).json({ error: 'No tienes permiso para hacer esto.' })
    }
    req.usuario = usuario
    next()
  })

  app.use('/api/compras', crearRutasListas(getDb))
  app.use('/api/ingresos', crearRutasCompras(getDb))
  app.use('/api/db', crearRutasExport(getDb, reemplazarDB))
  app.use('/api/catalogo', crearRutasCatalogo(getDb))
  app.use('/api/usuarios', crearRutasUsuarios(getDb, sesiones))
  app.use('/api/sesion', crearRutaSesion(getDb, sesiones))
  app.use('/api/requisitos-contrasena', crearRutasRequisitos(getDb))

  // App de escritorio: el frontend compilado sale de este mismo servidor; cualquier
  // ruta que no sea de la API devuelve index.html para que la resuelva React Router
  if (estaticos) {
    app.use(express.static(estaticos))
    app.get(/^\/(?!api(\/|$)).*/, (_req, res) => res.sendFile(join(estaticos, 'index.html')))
    return { app, cerrar: () => db.close(), sesiones }
  }

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
          <p style="color: #666; font-size: 0.9rem;">Endpoints: <code>/api/health</code>, <code>/api/compras</code>, <code>/api/ingresos</code>, <code>/api/catalogo</code>, <code>/api/usuarios</code>, <code>/api/db/exportar</code></p>
        </body>
      </html>
    `)
  })

  return { app, cerrar: () => db.close(), sesiones }
}
