/**
 * La versión .zip completa (desktop/salida/De Panas SV, que arma `npm run preparar`):
 * «Abrir De Panas SV.cmd» arranca el servidor oculto y termina; el sistema se usa en el
 * navegador; la API no responde sin sesión ni a otro Host; abrir otra vez no levanta otro
 * servidor; «Apagar De Panas SV» lo apaga y al volver a abrir los datos siguen.
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
    pagina = await navegador.newPage()
    await entrar(pagina, puerto)
    await pagina.getByRole('link', { name: 'Lista de compras' }).first().click()
    await expect(pagina.getByRole('button', { name: /Ver compra en Pepsi/ })).toBeVisible()
    await pagina.getByRole('button', { name: APAGADO.boton }).click()
    await confirmar(pagina, CONFIRMAR.apagar.confirmar)
    await expect.poll(() => salud(puerto)).toBeNull()
  } finally {
    await navegador.close()
    // Si algo falló a mitad, que no quede un servidor de prueba encendido
    if (await salud(puerto)) {
      execFile('powershell.exe', ['-NoProfile', '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*servidor.mjs*' -and $_.CommandLine -like '*salida*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`])
    }
    rmSync(datos, { recursive: true, force: true })
  }
})
