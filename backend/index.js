/**
 * index.js — Servidor Express de De Panas SV
 *
 * Arranca en http://localhost:3000
 * El frontend Vite redirige /api → localhost:3000 (ver vite.config.js)
 *
 * Rutas:
 *   GET/POST/PUT/DELETE  /api/compras       → compras completas (lo que usa el frontend)
 *   GET/POST/PUT/DELETE  /api/ingresos      → filas individuales de la tabla
 *   GET  /api/db/exportar                  → descarga una copia de depanas.db
 *   POST /api/db/importar                  → reemplaza depanas.db (con respaldo)
 *   GET  /api/db/exportar-json             → descarga las compras como JSON
 *   POST /api/db/importar-json             → fusiona compras desde JSON
 */

import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { crearApp } from './app.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_DIR = join(__dirname, 'db')
const DB_PATH = join(DB_DIR, 'depanas.db')

mkdirSync(DB_DIR, { recursive: true })

const { app } = crearApp({ dbPath: DB_PATH, schemaPath: join(DB_DIR, 'schema.sql') })

const PUERTO = process.env.PORT || 3000
app.listen(PUERTO, () => {
  console.log(`De Panas backend corriendo en http://localhost:${PUERTO}`)
  console.log(`Base de datos: ${DB_PATH}`)
})
