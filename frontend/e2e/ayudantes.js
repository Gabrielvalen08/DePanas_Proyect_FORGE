/**
 * Piezas comunes de las pruebas e2e.
 *
 * `test` agrega un vigilante a cada prueba: si la página lanza una excepción,
 * escribe un error en la consola o el backend responde 5xx (o 404 en /api),
 * la prueba falla aunque todo lo demás haya salido bien. Las respuestas 4xx
 * esperadas (contraseña incorrecta, usuario repetido…) no cuentan.
 */

import { test as base, expect } from '@playwright/test'
import { ACCESO } from '../src/utils/mensajes.js'

export const CESAR = { usuario: 'Cesar_01', contrasena: '1234', nombre: 'César' }
export const MARTA = { usuario: 'Marta_02', contrasena: '5678', nombre: 'Marta' }

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
