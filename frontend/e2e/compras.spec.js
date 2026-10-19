import { readFile } from 'fs/promises'
import { test, expect, entrar, menu, CESAR } from './ayudantes.js'
import { COMPRA, ESTADOS, EXPORTAR, VALIDACION } from '../src/utils/mensajes.js'

/** Llena la primera compra de Agregar compra con un material del catálogo (ya tiene categoría y producto) */
async function llenarCompra(page, { proveedor, material, cantidad, precio }) {
  const formulario = page.getByRole('form', { name: 'Detalle de compra' }).first()
  await formulario.getByRole('combobox', { name: 'Proveedor' }).fill(proveedor)
  await page.keyboard.press('Escape')
  await formulario.getByRole('combobox', { name: 'Material, fila 1' }).fill(material)
  await page.keyboard.press('Escape')
  await formulario.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill(String(cantidad))
  await formulario.getByRole('spinbutton', { name: 'Precio, fila 1' }).fill(String(precio))
  return formulario
}

test.describe('Compras', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, CESAR)
  })

  test('no guarda una compra vacía y dice qué falta', async ({ page }) => {
    await page.getByRole('button', { name: 'Guardar compra' }).click()
    await expect(page.getByText(VALIDACION.resumen)).toBeVisible()
    await expect(page.getByText(VALIDACION.proveedor).first()).toBeVisible()
  })

  test('el total suma las filas, y "Agregar otra fila" y "Eliminar fila" funcionan', async ({ page }) => {
    const formulario = await llenarCompra(page, { proveedor: 'Selectos', material: 'Azucar', cantidad: 1, precio: 2.5 })
    await formulario.getByRole('button', { name: 'Agregar otra fila' }).click()
    await formulario.getByRole('spinbutton', { name: 'Precio, fila 2' }).fill('1.25')
    await expect(formulario.getByText('$3.75')).toBeVisible()

    await formulario.getByRole('button', { name: 'Eliminar fila 2' }).click()
    await expect(formulario.getByRole('spinbutton', { name: 'Precio, fila 2' })).toHaveCount(0)
    await expect(formulario.getByText('$2.50')).toBeVisible()
  })

  test('"Nueva compra" agrega otro bloque para registrar otra compra', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva compra' }).click()
    await expect(page.getByRole('form', { name: 'Detalle de compra' })).toHaveCount(2)
  })

  test('registra una compra, aparece en Compras, se exporta y se elimina', async ({ page }) => {
    // Registrar
    await llenarCompra(page, { proveedor: 'MMAG', material: 'Tocino La Rioja', cantidad: 2, precio: 5.5 })
    await page.getByRole('button', { name: 'Guardar compra' }).click()
    await expect(page.getByText(COMPRA.guardada('MMAG', 1))).toBeVisible()

    // Aparece en la lista con su gasto total
    await menu(page).getByRole('link', { name: 'Compras' }).click()
    const fila = page.getByRole('row').filter({ has: page.getByRole('button', { name: /Ver compra en MMAG/ }) })
    await expect(fila).toContainText('$5.50')

    // Exportar a CSV: el archivo trae la compra
    await menu(page).getByRole('link', { name: 'Exportar datos' }).click()
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: EXPORTAR.descargar }).click(),
    ])
    expect(descarga.suggestedFilename()).toMatch(/\.csv$/)
    const csv = await readFile(await descarga.path(), 'utf8')
    expect(csv).toContain('MMAG')
    expect(csv).toContain('Tocino La Rioja')

    // Ver el detalle y eliminar
    await menu(page).getByRole('link', { name: 'Compras' }).click()
    await page.getByRole('button', { name: /Ver compra en MMAG/ }).click()
    const detalle = page.getByRole('dialog', { name: 'Compra en MMAG' })
    await expect(detalle).toContainText('Tocino La Rioja')
    await detalle.getByRole('button', { name: 'Eliminar' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: COMPRA.confirmarEliminar.confirmar }).click()
    await expect(page.getByText(COMPRA.eliminada)).toBeVisible()
    await expect(page.getByRole('button', { name: /Ver compra en MMAG/ })).toHaveCount(0)
    await expect(page.getByText(ESTADOS.sinCompras.titulo)).toBeVisible()
  })
})
