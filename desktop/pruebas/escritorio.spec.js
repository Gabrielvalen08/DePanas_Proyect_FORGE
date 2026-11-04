/**
 * La versión .zip completa (desktop/salida/De Panas SV, que arma `npm run preparar`):
 * «Abrir De Panas SV.cmd» arranca el servidor oculto y termina; el sistema se usa en el
 * navegador; la API no responde sin sesión ni a otro Host; abrir otra vez no levanta otro
 * servidor; no hay «Cerrar sesión»; «Apagar De Panas SV» lo apaga, cerrar la última pestaña
 * también (F5 no), y al volver a abrir los datos siguen.
 */

import { test, expect, chromium } from '@playwright/test'
import { execFile } from 'child_process'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { createServer } from 'net'
import { request as httpRequest } from 'http'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readSheet } from 'read-excel-file/node'
import { ACCESO, APAGADO, COMPRA, CONFIRMAR, EXPORTAR, LISTA_COMPRAS } from '../../frontend/src/utils/mensajes.js'

const CARPETA = join(dirname(dirname(fileURLToPath(import.meta.url))), 'salida', 'De Panas SV')
const CESAR = { usuario: 'Cesar_01', contrasena: 'DePanas#2026' }

const puertoLibre = () => new Promise(resolve => {
  const s = createServer().listen(0, '127.0.0.1', () => {
    const { port } = s.address()
    s.close(() => resolve(port))
  })
})

/** Abre «Abrir De Panas SV.cmd» como lo haría el cliente; resuelve cuando la ventana del .cmd termina */
function abrirSistema(datos, puerto) {
  return new Promise((resolve, reject) => {
    execFile('cmd.exe', ['/c', join(CARPETA, 'Abrir De Panas SV.cmd')], {
      cwd: CARPETA, windowsHide: true,
      env: { ...process.env, DEPANAS_PRUEBA: '1', DEPANAS_DATOS: datos, DEPANAS_PUERTO: String(puerto) },
    }, (error, stdout, stderr) => (error ? reject(new Error(`${error.message}\n${stdout}\n${stderr}`)) : resolve(stdout)))
  })
}

async function salud(puerto) {
  try {
    return await (await fetch(`http://127.0.0.1:${puerto}/api/health`)).json()
  } catch {
    return null
  }
}

/** GET /api/health con otro encabezado Host (lo que haría una página con DNS rebinding) */
const conHost = (puerto, host) => new Promise((resolve, reject) => {
  const req = httpRequest({ host: '127.0.0.1', port: puerto, path: '/api/health', headers: { Host: host } }, res => {
    res.resume()
    resolve(res.statusCode)
  })
  req.on('error', reject)
  req.end()
})

async function entrar(pagina, puerto) {
  await pagina.goto(`http://localhost:${puerto}`)
  await pagina.getByLabel(ACCESO.etiquetaUsuario).fill(CESAR.usuario)
  await pagina.getByLabel(ACCESO.etiquetaContrasena, { exact: true }).fill(CESAR.contrasena)
  await pagina.getByRole('button', { name: ACCESO.boton }).click()
  await expect(pagina.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()
}

const confirmar = (pagina, etiqueta) => pagina.getByRole('alertdialog').getByRole('button', { name: etiqueta }).click()

// El servidor espera unos 5 s tras cerrarse la última pestaña. /api/health cancela ese apagado
// (es lo que pide una página al volver), así que aquí no se puede preguntar antes de tiempo
const ESPERA_APAGADO_MS = 5000
const dormir = ms => new Promise(resolve => setTimeout(resolve, ms))
const estaEncendido = async puerto => (await salud(puerto)) !== null

// Un solo manejador por pestaña: aceptar dos veces el mismo diálogo lanza una excepción
const conManejador = new WeakSet()
function aceptarDialogos(pagina) {
  if (conManejador.has(pagina)) return
  conManejador.add(pagina)
  pagina.on('dialog', dialogo => dialogo.accept())
}

/** Una pestaña abierta por script: es la única que el propio script puede cerrar */
async function abrirPestana(lanzadera, puerto) {
  const [pagina] = await Promise.all([
    lanzadera.waitForEvent('popup'),
    lanzadera.evaluate(url => { window.open(url) }, `http://localhost:${puerto}`),
  ])
  return pagina
}

/**
 * Cierra la pestaña por el camino normal del navegador: pregunta, se acepta y corre pagehide.
 * page.close() de Playwright no sirve aquí: destruye la página sin que llegue el aviso. Con
 * Alt+F4 y Ctrl+W en Edge real el aviso sí llega, también cuando el navegador entero se cierra.
 */
async function cerrarPestana(pagina) {
  // Sin un clic antes, el navegador no pregunta
  await pagina.mouse.click(5, 5)
  await Promise.all([pagina.waitForEvent('close'), pagina.evaluate(() => window.close()).catch(() => {})])
}

test.beforeAll(() => {
  if (!existsSync(join(CARPETA, 'Abrir De Panas SV.cmd'))) throw new Error('Primero arma la carpeta: npm run preparar')
})

test('el .zip: se abre con el .cmd, funciona en el navegador, se apaga desde el sistema y conserva los datos', async () => {
  const datos = mkdtempSync(join(tmpdir(), 'depanas-zip-'))
  const puerto = await puertoLibre()
  const navegador = await chromium.launch()
  try {
    // El .cmd termina enseguida y el servidor queda encendido, oculto
    const salida = await abrirSistema(datos, puerto)
    expect(salida).toContain('Esta ventana se cierra sola')
    expect(await salud(puerto)).toEqual({ ok: true, apagable: true })

    // Seguridad del sitio local
    expect((await fetch(`http://localhost:${puerto}/api/usuarios`)).status).toBe(401)
    expect(await conHost(puerto, `malicioso.example:${puerto}`)).toBe(403)

    // Abrir otra vez no levanta otro servidor (si lo intentara, el puerto ocupado lo haría fallar)
    await abrirSistema(datos, puerto)
    expect(await salud(puerto)).toEqual({ ok: true, apagable: true })

    let pagina = await navegador.newPage({ acceptDownloads: true })
    await entrar(pagina, puerto)

    // En el .zip no se cierra sesión: se apaga
    await expect(pagina.getByRole('button', { name: APAGADO.boton })).toBeVisible()
    await expect(pagina.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0)

    // Catálogo del Excel: con Pepsi solo salen sus bebidas
    const formulario = pagina.getByRole('form', { name: 'Detalle de compra' }).first()
    await formulario.getByRole('combobox', { name: 'Proveedor' }).fill('Pepsi')
    await pagina.keyboard.press('Escape')
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('a')
    const sugerencias = pagina.getByRole('listbox', { name: 'Artículo, fila 1' })
    await expect(sugerencias.getByRole('option', { name: 'Agua' })).toBeVisible()
    await expect(sugerencias.getByRole('option', { name: 'Azucar' })).toHaveCount(0)

    // Registrar una compra
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Agua')
    await pagina.keyboard.press('Escape')
    await formulario.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill('2')
    await formulario.getByRole('combobox', { name: 'Unidad, fila 1' }).selectOption('caja')
    await formulario.getByRole('textbox', { name: 'Precio unitario, fila 1' }).fill('3.54')
    await pagina.getByRole('button', { name: 'Guardar compra' }).click()
    await confirmar(pagina, COMPRA.confirmarGuardar.confirmar)
    await expect(pagina.getByText(COMPRA.guardada)).toBeVisible()

    // Exportar a Excel: la descarga del navegador trae la compra
    await pagina.getByRole('link', { name: 'Lista de compras' }).first().click()
    await pagina.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
    await pagina.getByRole('menuitem', { name: LISTA_COMPRAS.exportar }).click()
    await pagina.getByRole('button', { name: EXPORTAR.descargar }).click()
    const [descarga] = await Promise.all([
      pagina.waitForEvent('download'),
      confirmar(pagina, CONFIRMAR.descargar.confirmar),
    ])
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/)
    expect(await readSheet(await descarga.path())).toContainEqual(expect.arrayContaining(['Pepsi', 'Agua', 2, 'caja', 7.08]))

    // «Apagar De Panas SV»: pide confirmar, apaga y deja la pantalla de apagado
    await pagina.getByRole('button', { name: APAGADO.boton }).click()
    await confirmar(pagina, CONFIRMAR.apagar.confirmar)
    await expect(pagina.getByText(APAGADO.titulo)).toBeVisible()
    await expect.poll(() => salud(puerto)).toBeNull()

    // Volver a abrir: la compra sigue
    await abrirSistema(datos, puerto)
    const lanzadera = await navegador.newPage() // se queda sin sesión: no cuenta como pestaña
    await lanzadera.goto(`http://localhost:${puerto}`)
    pagina = await abrirPestana(lanzadera, puerto)
    aceptarDialogos(pagina)
    await entrar(pagina, puerto)
    await pagina.getByRole('link', { name: 'Lista de compras' }).first().click()
    await expect(pagina.getByRole('button', { name: /Ver compra en Pepsi/ })).toBeVisible()

    // F5 no lo apaga, y al recargar sigue sin haber «Cerrar sesión»
    await pagina.reload()
    await expect(pagina.getByRole('button', { name: /Ver compra en Pepsi/ })).toBeVisible()
    await expect(pagina.getByRole('button', { name: APAGADO.boton })).toBeVisible()
    await expect(pagina.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0)
    await dormir(ESPERA_APAGADO_MS + 1500)
    expect(await estaEncendido(puerto)).toBe(true)

    // Con dos pestañas con sesión, cerrar una no lo apaga
    const segunda = await abrirPestana(lanzadera, puerto)
    aceptarDialogos(segunda)
    await entrar(segunda, puerto)
    await cerrarPestana(segunda)
    await dormir(ESPERA_APAGADO_MS + 1500)
    expect(await estaEncendido(puerto)).toBe(true)

    // Cerrar la última sí, después de la espera
    await cerrarPestana(pagina)
    await dormir(ESPERA_APAGADO_MS + 1500)
    expect(await estaEncendido(puerto)).toBe(false)

    // Al abrir de nuevo, los datos siguen. Una pestaña en la pantalla de contraseña no lo apaga al cerrarse
    await abrirSistema(datos, puerto)
    pagina = await abrirPestana(lanzadera, puerto)
    await expect(pagina.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
    await cerrarPestana(pagina)
    await dormir(ESPERA_APAGADO_MS + 1500)
    expect(await estaEncendido(puerto)).toBe(true)

    pagina = await abrirPestana(lanzadera, puerto)
    await entrar(pagina, puerto)
    await pagina.getByRole('link', { name: 'Lista de compras' }).first().click()
    await expect(pagina.getByRole('button', { name: /Ver compra en Pepsi/ })).toBeVisible()

    // Tras «Apagar» no queda nada: cerrar la pestaña ya no pregunta
    await pagina.getByRole('button', { name: APAGADO.boton }).click()
    await confirmar(pagina, CONFIRMAR.apagar.confirmar)
    await expect(pagina.getByText(APAGADO.titulo)).toBeVisible()
    await expect.poll(() => salud(puerto)).toBeNull()
    let pregunto = false
    pagina.on('dialog', dialogo => {
      pregunto = true
      dialogo.accept()
    })
    await cerrarPestana(pagina)
    expect(pregunto).toBe(false)
  } finally {
    await navegador.close()
    // Si algo falló a mitad, que no quede un servidor de prueba encendido
    if (await salud(puerto)) {
      await new Promise(resolve => execFile('powershell.exe', ['-NoProfile', '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*servidor.mjs*' -and $_.CommandLine -like '*salida*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`], resolve))
    }
    // Windows tarda en soltar la base aunque el proceso ya haya terminado
    rmSync(datos, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
  }
})
