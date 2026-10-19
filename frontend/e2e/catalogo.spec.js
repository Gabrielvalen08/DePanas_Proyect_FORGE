import { test, expect, entrar, CESAR } from './ayudantes.js'
import { PANTALLA_CATALOGO as CATALOGO } from '../src/utils/mensajes.js'

test.describe('Catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, CESAR)
    await page.goto('/catalogo/proveedores')
  })

  test('agrega, renombra y elimina un proveedor', async ({ page }) => {
    // Agregar
    await page.getByRole('button', { name: CATALOGO.agregar('proveedor') }).click()
    const nuevo = page.getByRole('dialog', { name: CATALOGO.tituloNuevo('proveedor') })
    await nuevo.getByLabel(CATALOGO.nombre, { exact: true }).fill('La Colonia e2e')
    await nuevo.getByRole('button', { name: CATALOGO.guardar }).click()
    await expect(page.getByText(CATALOGO.agregado('proveedor', { nombre: 'La Colonia e2e' }))).toBeVisible()
    await expect(page.getByRole('rowheader', { name: 'La Colonia e2e' })).toBeVisible()

    // Renombrar
    await page.getByRole('button', { name: CATALOGO.editar('proveedor', 'La Colonia e2e') }).click()
    const edicion = page.getByRole('dialog', { name: CATALOGO.tituloEditar('proveedor') })
    await edicion.getByLabel(CATALOGO.nombre, { exact: true }).fill('La Colonia Escalón e2e')
    await edicion.getByRole('button', { name: CATALOGO.guardar }).click()
    await expect(page.getByRole('rowheader', { name: 'La Colonia Escalón e2e' })).toBeVisible()

    // Eliminar
    await page.getByRole('button', { name: CATALOGO.eliminar('proveedor', 'La Colonia Escalón e2e') }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: CATALOGO.confirmarEliminar.confirmar }).click()
    await expect(page.getByRole('rowheader', { name: 'La Colonia Escalón e2e' })).toHaveCount(0)
  })

  test('no deja agregar un proveedor sin nombre ni uno repetido', async ({ page }) => {
    await page.getByRole('button', { name: CATALOGO.agregar('proveedor') }).click()
    const ventana = page.getByRole('dialog', { name: CATALOGO.tituloNuevo('proveedor') })
    await ventana.getByRole('button', { name: CATALOGO.guardar }).click()
    await expect(ventana.getByText(CATALOGO.faltaNombre)).toBeVisible()

    await ventana.getByLabel(CATALOGO.nombre, { exact: true }).fill('selectos')
    await ventana.getByRole('button', { name: CATALOGO.guardar }).click()
    // Sigue abierta: el aviso dice que ya existe
    await expect(page.getByText(/Ya existe/).first()).toBeVisible()
    await expect(ventana).toBeVisible()
  })

  test('el buscador filtra la lista', async ({ page }) => {
    await page.getByRole('textbox', { name: CATALOGO.buscar('proveedor') }).fill('mma')
    await expect(page.getByRole('rowheader', { name: 'MMAG' })).toBeVisible()
    await expect(page.getByRole('rowheader', { name: 'Pepsi' })).toHaveCount(0)
  })
})
