import { test, expect, entrar, confirmar, CESAR } from './ayudantes.js'
import { ASIGNACION, COMPRA, CONFIRMAR, PANTALLA_CATALOGO as CATALOGO } from '../src/utils/mensajes.js'

/*
 * Bug de «no deja bajar»: con dos ventanas abiertas a la vez (un formulario y su
 * confirmación), al cerrarse la página quedaba con overflow: hidden y ya no se
 * podía llegar a «Guardar compra». Cada prueba abre ese par de ventanas y después
 * comprueba que la página sigue bajando con la rueda del mouse.
 */

// Ventana baja: el contenido siempre es más alto que la pantalla
test.use({ viewport: { width: 1280, height: 420 } })

async function puedeBajar(page) {
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.mouse.move(640, 300)
  await page.mouse.wheel(0, 3000)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
}

test('después de guardar en el Catálogo se puede seguir bajando', async ({ page }, info) => {
  await entrar(page, CESAR)
  await page.goto('/catalogo/proveedores')
  const nombre = `Proveedor scroll ${info.project.name}`

  await page.getByRole('button', { name: CATALOGO.agregar('proveedor') }).click()
  const ventana = page.getByRole('dialog', { name: CATALOGO.tituloNuevo('proveedor') })
  await ventana.getByLabel(CATALOGO.nombre, { exact: true }).fill(nombre)
  await ventana.getByRole('button', { name: CATALOGO.guardar }).click()
  await confirmar(page, CONFIRMAR.guardarCambios.confirmar)
  await expect(ventana).toBeHidden()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await puedeBajar(page)

  // Limpieza (una sola ventana): la base la comparten las demás pruebas
  await page.getByRole('button', { name: CATALOGO.eliminar('proveedor', nombre) }).click()
  await confirmar(page, CATALOGO.confirmarEliminar.confirmar)
  await expect(page.getByRole('rowheader', { name: nombre })).toBeHidden()
  await puedeBajar(page)
})

test('después de crear un artículo con «+» se llega a «Guardar compra»', async ({ page }, info) => {
  await entrar(page, CESAR)
  const formulario = page.getByRole('form', { name: 'Detalle de compra' }).first()
  await formulario.getByRole('combobox', { name: 'Proveedor' }).fill('Selectos')
  await page.keyboard.press('Escape')

  await formulario.getByRole('button', { name: COMPRA.agregarArticulo('') }).click()
  const ventana = page.getByRole('dialog', { name: ASIGNACION.tituloNuevo })
  await ventana.getByRole('textbox', { name: ASIGNACION.nombreArticulo }).fill(`Servilleta scroll ${info.project.name}`)
  await ventana.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Desechables', exact: true }).click()
  await ventana.getByRole('button', { name: ASIGNACION.guardar }).click()
  await confirmar(page, ASIGNACION.confirmar.confirmar)
  await expect(ventana).toBeHidden()
  await expect(page.getByRole('alertdialog')).toBeHidden()

  // Con la fila completa aparecen el resumen y «Guardar compra», más abajo de lo que se ve
  await formulario.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill('2')
  await formulario.getByRole('combobox', { name: 'Unidad, fila 1' }).selectOption('lb')
  await formulario.getByRole('textbox', { name: 'Precio unitario, fila 1' }).fill('1.50')
  const guardar = page.getByRole('button', { name: 'Guardar compra' }).first()
  await expect(guardar).not.toBeInViewport()

  await puedeBajar(page)
  await expect(guardar).toBeInViewport()
})
