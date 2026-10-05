/**
 * index.js — Servidor Express de De Panas SV
 *
 * Arranca en http://localhost:3000
 * El frontend Vite redirige /api → localhost:3000 (ver vite.config.js)
 *
 * Rutas:
 *   GET/POST/PUT/DELETE  /api/ingresos      → CRUD de compras en tabla única
 *   GET  /api/db/exportar                  → descarga depanas.db
 *   POST /api/db/importar                  → reemplaza depanas.db con archivo subido
 *   GET  /api/db/exportar-json             → descarga ingresos como JSON
 *   POST /api/db/importar-json             → importa ingresos desde JSON
 */

import express from 'express'
import cors from 'cors'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { DatabaseSync } from 'node:sqlite'

import { crearRutasCompras } from './routes/compras.js'
import { crearRutasExport } from './routes/db_export.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Rutas de base de datos ---
const DB_DIR  = join(__dirname, 'db')
const DB_PATH = join(DB_DIR, 'depanas.db')
const SCHEMA  = join(DB_DIR, 'schema.sql')

mkdirSync(DB_DIR, { recursive: true })

// --- Inicializar SQLite ---
let db = abrirDB()

function abrirDB() {
  const baseDatos = new DatabaseSync(DB_PATH)
  baseDatos.exec('PRAGMA journal_mode = WAL;')
  baseDatos.exec('PRAGMA foreign_keys = ON;')

  // Crear la tabla única ingresos si no existe
  baseDatos.exec(readFileSync(SCHEMA, 'utf8'))

  return baseDatos
}

/**
 * Cierra la conexión, ejecuta una función (p.ej. reemplazar el archivo con una importación),
 * y vuelve a abrir la conexión. Usada al cargar un .db externo.
 */
function reconectarDB(fn) {
  db.close()
  fn()
  db = abrirDB()
}

// --- Express ---
const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

// Rutas de API
app.use('/api/ingresos', (req, res, next) => crearRutasCompras(db)(req, res, next))
app.use('/api/db',       (req, res, next) => crearRutasExport(db, DB_PATH, reconectarDB)(req, res, next))

// Ruta raíz informativa
app.get('/', (_req, res) => {
  res.send(`
    <html>
      <head><title>De Panas SV — API Backend</title></head>
      <body style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto; line-height: 1.6;">
        <h2>🟢 Servidor Backend De Panas SV activo</h2>
        <p>Este puerto (<strong>3000</strong>) es la API y base de datos SQLite.</p>
        <p>Para ver la aplicación visual e interfaz, abre en tu navegador:</p>
        <p><a href="http://localhost:5173" style="font-size: 1.2rem; color: #e65100; font-weight: bold;">👉 http://localhost:5173</a></p>
        <hr/>
        <p style="color: #666; font-size: 0.9rem;">Endpoints disponibles: <code>/api/health</code>, <code>/api/ingresos</code>, <code>/api/db/exportar</code></p>
      </body>
    </html>
  `)
})

// Health-check
app.get('/api/health', (_req, res) => res.json({ ok: true, db: DB_PATH }))

const PUERTO = process.env.PORT || 3000
app.listen(PUERTO, () => {
  console.log(`De Panas backend corriendo en http://localhost:${PUERTO}`)
  console.log(`Base de datos: ${DB_PATH}`)
})
