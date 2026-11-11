/**
 * demo.js — Datos de demostración: dos meses de compras inventadas pero realistas
 * (compras-demo.json, generado con scripts/generar-demo.mjs).
 *
 * Nunca se cargan solos en la base real del cliente. Se usan:
 *  - Desde la app: Lista de compras → ⋮ → Cargar datos, eligiendo compras-demo.json.
 *  - Con una base aparte: `npm run demo:base` (backend/db/depanas-demo.db).
 *  - En la versión .zip: «Abrir De Panas SV (demo).cmd», con su propia carpeta de datos.
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { comprasDAO } from '../dao/compras.js'

export const RUTA_COMPRAS_DEMO = join(dirname(fileURLToPath(import.meta.url)), 'compras-demo.json')

export const leerComprasDemo = () => JSON.parse(readFileSync(RUTA_COMPRAS_DEMO, 'utf8'))

/**
 * Carga las compras de demostración en la base (todo o nada). Solo si la base no tiene
 * compras: nunca mezcla la demo con datos reales. Devuelve el resultado de la carga o null.
 */
export function cargarDemo(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM ingresos').get()
  if (n > 0) return null
  return comprasDAO(db).cargarRespaldo(leerComprasDemo())
}
