/**
 * Backend para las pruebas e2e: el mismo de backend/index.js, pero con una base
 * temporal que se borra al arrancar. Así cada corrida empieza con los datos
 * iniciales (catálogo del Excel, Cesar_01 y Marta_02) y nunca toca depanas.db.
 */

import { rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '.tmp')
rmSync(carpeta, { recursive: true, force: true })
process.env.DEPANAS_DB = join(carpeta, 'e2e.db')

await import('../../backend/index.js')
