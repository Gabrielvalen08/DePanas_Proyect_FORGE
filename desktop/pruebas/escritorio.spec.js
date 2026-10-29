/**
 * La app de escritorio completa: abre, entra, registra una compra, exporta a Excel,
 * la API no responde sin sesión, y al cerrar y volver a abrir los datos siguen.
 */

import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtempSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readSheet } from 'read-excel-file/node'
import { ACCESO, COMPRA, CONFIRMAR, EXPORTAR, LISTA_COMPRAS } from '../../frontend/src/utils/mensajes.js'

const ESCRITORIO = dirname(dirname(fileURLToPath(import.meta.url)))
const CESAR = { usuario: 'Cesar_01', contrasena: 'DePanas#2026' }

/** Abre la app (sin empaquetar o, con DEPANAS_EXE, la empaquetada) con carpetas temporales */
async function abrir(datos, descargas) {
  const como = process.env.DEPANAS_EXE ? { executablePath: process.env.DEPANAS_EXE } : { args: ['.'], cwd: ESCRITORIO }
  const app = await electron.launch({ ...como, env: { ...process.env, DEPANAS_DATOS: datos, DEPANAS_DESCARGAS: descargas } })
  const ventana = await app.firstWindow()
  await expect(ventana.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
  return { app, ventana }
}

async function entrar(ventana, { usuario, contrasena }) {
  await ventana.getByLabel(ACCESO.etiquetaUsuario).fill(usuario)
  await ventana.getByLabel(ACCESO.etiquetaContrasena, { exact: true }).fill(contrasena)
  await ventana.getByRole('button', { name: ACCESO.boton }).click()
  await expect(ventana.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()
}

const confirmar = (ventana, etiqueta) => ventana.getByRole('alertdialog').getByRole('button', { name: etiqueta }).click()

test('la app de escritorio guarda, exporta y conserva los datos al volver a abrirla', async () => {
  const datos = mkdtempSync(join(tmpdir(), 'depanas-escritorio-'))
  const descargas = mkdtempSync(join(tmpdir(), 'depanas-descargas-'))
  try {
    let { app, ventana } = await abrir(datos, descargas)
    expect(await ventana.title()).toContain('De Panas SV')

    // Sin sesión la API no responde (y solo escucha en esta computadora)
    const sinSesion = await ventana.evaluate(async () => ({
      usuarios: (await fetch('/api/usuarios')).status,
      host: location.hostname,
    }))
    expect(sinSesion).toEqual({ usuarios: 401, host: '127.0.0.1' })

    await entrar(ventana, CESAR)

    // Catálogo del Excel: con Pepsi solo salen sus bebidas
    const formulario = ventana.getByRole('form', { name: 'Detalle de compra' }).first()
    await formulario.getByRole('combobox', { name: 'Proveedor' }).fill('Pepsi')
    await ventana.keyboard.press('Escape')
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('a')
    const sugerencias = ventana.getByRole('listbox', { name: 'Artículo, fila 1' })
    await expect(sugerencias.getByRole('option', { name: 'Agua' })).toBeVisible()
    await expect(sugerencias.getByRole('option', { name: 'Azucar' })).toHaveCount(0)

    // Registrar una compra
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Agua')
    await ventana.keyboard.press('Escape')
    await formulario.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill('2')
    await formulario.getByRole('combobox', { name: 'Unidad, fila 1' }).selectOption('caja')
    await formulario.getByRole('textbox', { name: 'Precio unitario, fila 1' }).fill('3.54')
    await ventana.getByRole('button', { name: 'Guardar compra' }).click()
    await confirmar(ventana, COMPRA.confirmarGuardar.confirmar)
    await expect(ventana.getByText(COMPRA.guardada)).toBeVisible()

    // Exportar a Excel desde Lista de compras: el archivo se guarda y trae la compra
    await ventana.getByRole('link', { name: 'Lista de compras' }).first().click()
    await ventana.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
    await ventana.getByRole('menuitem', { name: LISTA_COMPRAS.exportar }).click()
    await ventana.getByRole('button', { name: EXPORTAR.descargar }).click()
    await confirmar(ventana, CONFIRMAR.descargar.confirmar)
    await expect(ventana.getByText(/Descargamos 1 compra/)).toBeVisible()
    await expect.poll(() => readdirSync(descargas).filter(n => n.endsWith('.xlsx')).length).toBe(1)
    const [archivo] = readdirSync(descargas).filter(n => n.endsWith('.xlsx'))
    const filas = await readSheet(join(descargas, archivo))
    expect(filas).toContainEqual(expect.arrayContaining(['Pepsi', 'Agua', 2, 'caja', 7.08]))

    // Cerrar y volver a abrir: la compra sigue y hay que entrar de nuevo
    await app.close()
    ;({ app, ventana } = await abrir(datos, descargas))
    await entrar(ventana, CESAR)
    await ventana.getByRole('link', { name: 'Lista de compras' }).first().click()
    await expect(ventana.getByRole('button', { name: /Ver compra en Pepsi/ })).toBeVisible()
    await app.close()
  } finally {
    rmSync(datos, { recursive: true, force: true })
    rmSync(descargas, { recursive: true, force: true })
  }
})
