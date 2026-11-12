/**
 * crear-base-demo.mjs — Crea una base de demostración con las compras de compras-demo.json.
 *
 *   npm run demo:base                     (desde backend/: backend/db/depanas-demo.db)
 *   node scripts/crear-base-demo.mjs <ruta.db>
 *
 * Nunca toca una base que ya tiene compras. Para usarla con el backend de desarrollo:
 *   DEPANAS_DB=db/depanas-demo.db npm start
 */

import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { abrirDB } from '../db.js'
import { cargarDemo } from '../db/demo.js'

const BACKEND = join(dirname(fileURLToPath(import.meta.url)), '..')
const ruta = resolve(process.argv[2] ?? join(BACKEND, 'db', 'depanas-demo.db'))

const db = abrirDB(ruta, join(BACKEND, 'db', 'schema.sql'))
try {
  const resultado = cargarDemo(db)
  if (!resultado) {
    console.error(`La base ${ruta} ya tiene compras: no se cargó la demostración.`)
    process.exitCode = 1
  } else {
    console.log(`Base de demostración lista en ${ruta}: ${resultado.nuevas} compras cargadas.`)
  }
} finally {
  db.close()
}
