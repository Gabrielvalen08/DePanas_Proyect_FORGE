import { readSheet } from 'read-excel-file/node'
import { test, expect, entrar, menu, confirmar, CESAR } from './ayudantes.js'
import { COMPRA, CONFIRMAR, ESTADOS, EXPORTAR, LISTA_COMPRAS, VALIDACION } from '../src/utils/mensajes.js'

/** Llena la fila n de una compra con un artículo del catálogo (ya tiene categoría y producto) */
async function llenarFila(page, formulario, n, { material, cantidad, precio }) {
  await formulario.getByRole('combobox', { name: `Artículo, fila ${n}` }).fill(material)
  await page.keyboard.press('Escape')
  await formulario.getByRole('spinbutton', { name: `Cantidad, fila ${n}` }).fill(String(cantidad))
  await formulario.getByRole('combobox', { name: `Unidad, fila ${n}` }).selectOption('lb')
  // Con centavos: el campo de precio llena de derecha a izquierda, como una caja registradora
  await formulario.getByRole('textbox', { name: `Precio unitario, fila ${n}` }).fill(Number(precio).toFixed(2))
}

/** Llena la primera compra de Agregar compra: proveedor y la fila 1 */
async function llenarCompra(page, { proveedor, ...fila }) {
  const formulario = page.getByRole('form', { name: 'Detalle de compra' }).first()
  await formulario.getByRole('combobox', { name: 'Proveedor' }).fill(proveedor)
  await page.keyboard.press('Escape')
  await llenarFila(page, formulario, 1, fila)
  return formulario
}

test.describe('Compras', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, CESAR)
  })

  test('por pasos: Guardar aparece con una fila completa; una fila a medias dice qué falta', async ({ page }) => {
    const guardar = page.getByRole('button', { name: 'Guardar compra' })
    const formulario = page.getByRole('form', { name: 'Detalle de compra' }).first()
    await expect(guardar).toHaveCount(0)
    await expect(formulario.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveCount(0)

    await formulario.getByRole('combobox', { name: 'Proveedor' }).fill('Selectos')
    await page.keyboard.press('Escape')
    await expect(formulario.getByRole('combobox', { name: 'Artículo, fila 1' })).toBeVisible()
    await expect(guardar).toHaveCount(0)

    await llenarFila(page, formulario, 1, { material: 'Azucar', cantidad: 1, precio: 2.5 })
    await formulario.getByRole('button', { name: COMPRA.agregarFila }).click()
    await formulario.getByRole('spinbutton', { name: 'Cantidad, fila 2' }).fill('1')
    await guardar.click()
    await expect(formulario.getByText(VALIDACION.material).first()).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('el total suma las filas, y "Agregar otro artículo" y "Eliminar fila" funcionan', async ({ page }) => {
    const formulario = await llenarCompra(page, { proveedor: 'Selectos', material: 'Azucar', cantidad: 1, precio: 2.5 })
    await formulario.getByRole('button', { name: COMPRA.agregarFila }).click()
    await llenarFila(page, formulario, 2, { material: 'Anis', cantidad: 1, precio: 1.25 })
    // Sin IVA, subtotal y total coinciden: se revisa el total, que va al final
    await expect(formulario.getByText('$3.75').last()).toBeVisible()

    await formulario.getByRole('button', { name: 'Eliminar fila 2' }).click()
    await expect(formulario.getByRole('textbox', { name: 'Precio unitario, fila 2' })).toHaveCount(0)
    await expect(formulario.getByText('$2.50').last()).toBeVisible()
  })

  test('una compra registra los artículos que se sugerirán al volver a elegir el proveedor', async ({ page, request }) => {
    const proveedor = `Mercado e2e ${crypto.randomUUID()}`
    await llenarCompra(page, { proveedor, material: 'Gatorade', cantidad: 1, precio: 2.5 })
    await page.getByRole('button', { name: 'Guardar compra' }).click()
    const guardado = page.waitForResponse(r => new URL(r.url()).pathname === '/api/compras' && r.request().method() === 'POST')
    await confirmar(page, COMPRA.confirmarGuardar.confirmar)
    const respuesta = await guardado
    expect(respuesta.ok()).toBe(true)
    const { id } = await respuesta.json()
    const headers = { Authorization: await respuesta.request().headerValue('authorization') }

    try {
      await expect(page.getByText(COMPRA.guardada)).toBeVisible()
      const formulario = page.getByRole('form', { name: 'Detalle de compra' }).first()
      const campoProveedor = formulario.getByRole('combobox', { name: 'Proveedor' })
      await expect(campoProveedor).toHaveValue('')
      await campoProveedor.fill(proveedor)
      await page.keyboard.press('Escape')
      const articulo = formulario.getByRole('combobox', { name: 'Artículo, fila 1' })
      await articulo.fill('a')
      const sugerencias = page.getByRole('listbox', { name: 'Artículo, fila 1' })
      await expect(sugerencias.getByRole('option', { name: 'Gatorade' })).toBeVisible()
      await expect(sugerencias.getByRole('option', { name: 'Agua' })).toHaveCount(0)
      await sugerencias.getByRole('option', { name: 'Gatorade' }).click()
      await expect(articulo).toHaveValue('Gatorade')
    } finally {
      expect((await request.delete(`/api/compras/${id}`, { headers })).ok()).toBe(true)
      expect((await request.delete(`/api/catalogo/proveedor/${encodeURIComponent(proveedor)}`, { headers })).ok()).toBe(true)
    }
  })

  test('al escribir, la sugerencia que más coincide queda marcada y Enter la completa', async ({ page }) => {
    const formulario = page.getByRole('form', { name: 'Detalle de compra' }).first()
    await formulario.getByRole('combobox', { name: 'Proveedor' }).fill('Pep')
    await page.keyboard.press('Enter')
    await expect(formulario.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Pepsi')
    const articulo = formulario.getByRole('combobox', { name: 'Artículo, fila 1' })
    await articulo.fill('gat')
    await expect(page.getByRole('listbox', { name: 'Artículo, fila 1' }).getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await expect(articulo).toHaveValue('Gatorade')
  })

  test('"Nueva compra" aparece con una fila completa y agrega otro bloque para registrar otra compra', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Nueva compra' })).toHaveCount(0)
    await llenarCompra(page, { proveedor: 'Selectos', material: 'Azucar', cantidad: 1, precio: 2.5 })
    await page.getByRole('button', { name: 'Nueva compra' }).click()
    await expect(page.getByRole('form', { name: /Detalle de compra/ })).toHaveCount(2)
  })

  test('registra una compra, aparece en Compras, se exporta y se elimina', async ({ page }) => {
    // Registrar
    await llenarCompra(page, { proveedor: 'MMAG', material: 'Tocino La Rioja', cantidad: 2, precio: 2.75 })
    await page.getByRole('button', { name: 'Guardar compra' }).click()
    await confirmar(page, COMPRA.confirmarGuardar.confirmar)
    await expect(page.getByText(COMPRA.guardada)).toBeVisible()

    // Aparece en la lista con su gasto total
    await menu(page).getByRole('link', { name: 'Lista de compras' }).click()
    const fila = page.getByRole('row').filter({ has: page.getByRole('button', { name: /Ver compra en MMAG/ }) })
    await expect(fila).toContainText('$5.50')

    // Exportar a Excel (desde el ⋮ de la lista): el archivo trae la compra
    await page.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
    await page.getByRole('menuitem', { name: LISTA_COMPRAS.exportar }).click()
    await page.getByRole('button', { name: EXPORTAR.descargar }).click()
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      confirmar(page, CONFIRMAR.descargar.confirmar),
    ])
    // Un .xlsx real: cada dato en su columna, el monto como número
    expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/)
    const filas = await readSheet(await descarga.path())
    expect(filas[0]).toEqual(['Fecha', 'Proveedor', 'Artículo', 'Cantidad', 'Unidad', 'Monto', 'IVA', 'Categoría', 'Producto'])
    expect(filas).toContainEqual(expect.arrayContaining(['MMAG', 'Tocino La Rioja', 5.5]))

    // Ver el detalle y eliminar
    await menu(page).getByRole('link', { name: 'Lista de compras' }).click()
    await page.getByRole('button', { name: /Ver compra en MMAG/ }).click()
    const detalle = page.getByRole('dialog', { name: 'Compra en MMAG' })
    await expect(detalle).toContainText('Tocino La Rioja')
    await detalle.getByRole('button', { name: 'Eliminar' }).click()
    await confirmar(page, COMPRA.confirmarEliminar.confirmar)
    await expect(page.getByText(COMPRA.eliminada)).toBeVisible()
    await expect(page.getByRole('button', { name: /Ver compra en MMAG/ })).toHaveCount(0)
    await expect(page.getByText(ESTADOS.sinCompras.titulo)).toBeVisible()
  })
})
