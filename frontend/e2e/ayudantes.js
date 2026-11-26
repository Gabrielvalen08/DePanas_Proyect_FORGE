/**
 * Piezas comunes de las pruebas e2e.
 *
 * `test` agrega un vigilante a cada prueba: si la página lanza una excepción,
 * escribe un error en la consola o el backend responde 5xx (o 404 en /api),
 * la prueba falla aunque todo lo demás haya salido bien. Las respuestas 4xx
 * esperadas (contraseña incorrecta, usuario repetido…) no cuentan.
 */

import { test as base, expect } from '@playwright/test'
import { ACCESO, ASIGNACION, CONFIRMAR } from '../src/utils/mensajes.js'

export const CESAR = { usuario: 'Cesar_01', contrasena: 'DePanas#2026', nombre: 'César' }
export const MARTA = { usuario: 'Marta_02', contrasena: 'DePanas#2026', nombre: 'Marta' }

export const test = base.extend({
  errores: [
    async ({ page }, usar) => {
      const errores = []
      page.on('pageerror', error => errores.push(`Excepción en la página: ${error.message}`))
      page.on('console', mensaje => {
        // El navegador también avisa así de las respuestas 4xx esperadas; esas se revisan abajo
        if (mensaje.type() === 'error' && !mensaje.text().startsWith('Failed to load resource')) {
          errores.push(`Error en la consola: ${mensaje.text()}`)
        }
      })
      page.on('response', respuesta => {
        const { pathname } = new URL(respuesta.url())
        if (respuesta.status() >= 500 || (respuesta.status() === 404 && pathname.startsWith('/api/'))) {
          errores.push(`El servidor respondió ${respuesta.status()} en ${respuesta.request().method()} ${pathname}`)
        }
      })
      await usar(errores)
      expect(errores, 'La página no debe tener errores').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Abre la app e inicia sesión; termina cuando ya se ve la primera pantalla */
export async function entrar(page, { usuario, contrasena }) {
  await page.goto('/')
  await page.getByLabel(ACCESO.etiquetaUsuario).fill(usuario)
  await page.getByLabel(ACCESO.etiquetaContrasena, { exact: true }).fill(contrasena)
  await page.getByRole('button', { name: ACCESO.boton }).click()
  await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

/** Menú lateral (escritorio) */
export const menu = page => page.getByRole('complementary')

/** Acepta el diálogo de confirmación abierto (toda acción se confirma) */
export async function confirmar(page, etiqueta) {
  await page.getByRole('alertdialog').getByRole('button', { name: etiqueta }).click()
}

/**
 * La unidad de la fila n es la del artículo y no se cambia en la fila: se elige en el formulario
 * del artículo (su botón, «+» o lápiz). Si el sistema ya abrió el formulario (el artículo no tenía
 * unidad), se usa ese. Elige la unidad, guarda y confirma si hubo cambios; termina con la fila mostrándola.
 * Sin permiso para editar un artículo que ya está completo (su botón sale apagado), se queda con la que tiene.
 */
export async function unidadDelArticulo(page, formulario, n, unidad) {
  const ventana = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: ASIGNACION.etiquetaUnidad }) })
  if (!(await ventana.isVisible())) {
    const fila = formulario.getByRole('row').filter({ has: page.getByRole('combobox', { name: `Artículo, fila ${n}` }) })
    const boton = fila.getByRole('button').first()
    if (await boton.isDisabled()) {
      await expect(formulario.getByLabel(`Unidad, fila ${n}`)).not.toHaveText(/^—/)
      return
    }
    await boton.click()
  }
  await expect(ventana).toBeVisible()
  await ventana.getByRole('combobox', { name: ASIGNACION.etiquetaUnidad }).selectOption(unidad)
  // Un artículo que aún no tiene categoría (catálogo del Excel) también la pide
  const categorias = ventana.getByRole('group', { name: 'Categoría' })
  if (await categorias.count() && !(await categorias.getByRole('button', { pressed: true }).count())) {
    await categorias.getByRole('button').first().click()
  }
  await ventana.getByRole('button', { name: ASIGNACION.guardar }).click()
  const si = page.getByRole('alertdialog').getByRole('button', { name: ASIGNACION.confirmar.confirmar })
  await expect.poll(async () => (await si.isVisible()) || !(await ventana.isVisible())).toBe(true)
  if (await si.isVisible()) await si.click()
  await expect(ventana).toBeHidden()
  await expect(formulario.getByLabel(`Unidad, fila ${n}`)).toHaveText(unidad)
}

/** Cierra la sesión desde el menú lateral y confirma; termina en la pantalla de acceso */
export async function salir(page) {
  await menu(page).getByRole('button', { name: 'Cerrar sesión' }).click()
  await confirmar(page, CONFIRMAR.cerrarSesion.confirmar)
  await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
}
