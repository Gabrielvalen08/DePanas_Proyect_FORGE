/**
 * servidor.mjs — El servidor de De Panas SV, oculto (lo arranca iniciar.mjs).
 *
 * El backend de siempre (backend/app.js) en http://localhost:4510, solo en esta computadora
 * (127.0.0.1 y ::1), sirviendo también el frontend compilado. La base vive en
 * %APPDATA%\De Panas SV\depanas.db, fuera de esta carpeta: reemplazarla o borrarla no toca
 * los datos. Se apaga con «Apagar De Panas SV» dentro del sistema (POST /api/apagar).
 * Los errores se anotan en %APPDATA%\De Panas SV\registro.log.
 */

import { appendFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const APP = dirname(fileURLToPath(import.meta.url))
const PUERTO = Number(process.env.DEPANAS_PUERTO) || 4510
const DATOS = process.env.DEPANAS_DATOS || join(process.env.APPDATA ?? homedir(), 'De Panas SV')

mkdirSync(DATOS, { recursive: true })
const registrar = mensaje => {
  try {
    appendFileSync(join(DATOS, 'registro.log'), `[${new Date().toLocaleString('es-SV')}] ${mensaje}\n`)
  } catch {
    // Sin poder escribir el registro no hay a dónde avisar
  }
}
process.on('uncaughtException', error => {
  registrar(`Error: ${error?.stack ?? error}`)
  process.exit(1)
})

const { crearApp } = await import('./backend/app.js')

const servidores = []
let apagando = false
function apagar() {
  if (apagando) return
  apagando = true
  for (const s of servidores) {
    s.closeAllConnections?.()
    s.close()
  }
  try {
    cerrar() // SQLite pasa el WAL a depanas.db
  } catch {
    // Ya estaba cerrada
  }
  registrar('Apagado desde el sistema')
  process.exit(0)
}

const { app, cerrar } = crearApp({
  dbPath: join(DATOS, 'depanas.db'),
  schemaPath: join(APP, 'backend', 'db', 'schema.sql'),
  estaticos: join(APP, 'frontend'),
  origenCors: false, // el navegador y la API son el mismo origen
  // Solo estos nombres: una página de otro dominio no puede hablarle a este servidor (DNS rebinding)
  hostsPermitidos: [`localhost:${PUERTO}`, `127.0.0.1:${PUERTO}`, `[::1]:${PUERTO}`],
  apagar,
})

function escuchar(host) {
  return new Promise((resolve, reject) => {
    const s = app.listen(PUERTO, host, () => resolve(s))
    s.once('error', reject)
  })
}

// localhost puede ser 127.0.0.1 o ::1 según la computadora: se escucha en los dos, nunca en la red
try {
  servidores.push(await escuchar('127.0.0.1'))
} catch (error) {
  registrar(error?.code === 'EADDRINUSE' ? `El puerto ${PUERTO} lo usa otro programa` : `No se pudo escuchar: ${error?.message}`)
  process.exit(1)
}
try {
  servidores.push(await escuchar('::1'))
} catch {
  // Sin IPv6: basta con 127.0.0.1
}
registrar(`Iniciado en http://localhost:${PUERTO} (datos en ${DATOS})`)
