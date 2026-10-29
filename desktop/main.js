/**
 * main.js — Proceso principal de la app de escritorio De Panas SV (Electron).
 *
 * Arranca el backend de siempre (backend/app.js) dentro de la app, escuchando solo en
 * 127.0.0.1 y en un puerto libre, y abre una ventana con el frontend que sirve ese
 * mismo servidor. La base vive en la carpeta de datos del usuario
 * (%APPDATA%\De Panas SV\depanas.db), nunca dentro de la app: así sobrevive a
 * actualizaciones y a desinstalar.
 *
 * Solo para las pruebas (pruebas/escritorio.spec.js):
 *  - DEPANAS_DATOS cambia esa carpeta (una temporal).
 *  - DEPANAS_DESCARGAS guarda las descargas ahí sin preguntar. Sin ella, como en la app del
 *    cliente, cada descarga (Excel, respaldo .json, .db) abre el diálogo «Guardar como».
 */

import { app, BrowserWindow, Menu, dialog, session, shell } from 'electron'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const RECURSOS = join(dirname(fileURLToPath(import.meta.url)), 'app')
const TITULO = 'De Panas SV'

let ventana = null
let servidor = null
let cerrarBase = null
let origen = null

// Una sola instancia: abrir el acceso directo otra vez trae la ventana que ya está abierta
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!ventana) return
    if (ventana.isMinimized()) ventana.restore()
    ventana.focus()
  })
  app.whenReady().then(iniciar).catch(error => {
    dialog.showErrorBox(TITULO, `No se pudo abrir la aplicación.\n\n${error?.message ?? error}`)
    app.quit()
  })
}

async function iniciar() {
  const carpetaDatos = process.env.DEPANAS_DATOS || app.getPath('userData')
  mkdirSync(carpetaDatos, { recursive: true })

  const { crearApp } = await import(pathToFileURL(join(RECURSOS, 'backend', 'app.js')).href)
  const { app: api, cerrar } = crearApp({
    dbPath: join(carpetaDatos, 'depanas.db'),
    schemaPath: join(RECURSOS, 'backend', 'db', 'schema.sql'),
    estaticos: join(RECURSOS, 'frontend'),
    origenCors: false, // la ventana y la API son el mismo origen
  })
  cerrarBase = cerrar

  // Puerto 0: el sistema da uno libre. Solo 127.0.0.1: nadie desde la red llega a la API
  servidor = await new Promise((resolve, reject) => {
    const s = api.listen(0, '127.0.0.1', () => resolve(s))
    s.on('error', reject)
  })
  origen = `http://127.0.0.1:${servidor.address().port}`

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir' }] },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
  ]))

  ventana = new BrowserWindow({
    title: TITULO,
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#FEEECC', // crema de la marca mientras carga
    icon: join(RECURSOS, 'frontend', 'brand', 'icon-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  })
  ventana.once('ready-to-show', () => {
    ventana.maximize()
    ventana.show()
  })
  ventana.on('closed', () => { ventana = null })

  // Enlaces externos: en el navegador del sistema; la ventana nunca sale de la app
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith(origen)) shell.openExternal(url)
    return { action: 'deny' }
  })
  ventana.webContents.on('will-navigate', (evento, url) => {
    if (!url.startsWith(origen)) evento.preventDefault()
  })

  if (process.env.DEPANAS_DESCARGAS) {
    session.defaultSession.on('will-download', (_evento, item) => {
      item.setSavePath(join(process.env.DEPANAS_DESCARGAS, item.getFilename()))
    })
  }

  await ventana.loadURL(origen)
}

// Al cerrar: el servidor deja de escuchar y la base se cierra (SQLite pasa el WAL a depanas.db)
let cerrando = false
app.on('before-quit', () => {
  if (cerrando) return
  cerrando = true
  try {
    servidor?.closeAllConnections?.()
    servidor?.close()
    cerrarBase?.()
  } catch {
    // Ya estaba cerrado
  }
})

app.on('window-all-closed', () => app.quit())
