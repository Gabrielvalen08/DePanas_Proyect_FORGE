import { test, expect, entrar, menu, CESAR } from './ayudantes.js'
import { LISTA_COMPRAS } from '../src/utils/mensajes.js'

// Cada botón del menú abre su pantalla, con su título y sin errores
const PANTALLAS = [
  ['Lista de compras', '/compras'],
  ['Catálogo', '/catalogo'],
  ['Gestor de usuarios', '/usuarios'],
  ['Agregar compra', '/'],
]

test.describe('Navegación', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, CESAR)
  })

  test('cada botón del menú abre su pantalla', async ({ page }) => {
    for (const [nombre, ruta] of PANTALLAS) {
      await menu(page).getByRole('link', { name: nombre }).click()
      await expect(page).toHaveURL(new RegExp(`${ruta === '/' ? '/' : ruta}$`))
      await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible()
      await expect(page).toHaveTitle(`${nombre} | De Panas SV`)
    }
  })

  test('Exportar y Cargar no salen en el menú: se abren desde el ⋮ de Lista de compras y tienen Regresar', async ({ page }) => {
    await expect(menu(page).getByRole('link', { name: 'Exportar datos' })).toHaveCount(0)
    await expect(menu(page).getByRole('link', { name: 'Cargar datos' })).toHaveCount(0)

    for (const [opcion, titulo] of [[LISTA_COMPRAS.exportar, 'Exportar datos'], [LISTA_COMPRAS.cargar, 'Cargar datos']]) {
      await menu(page).getByRole('link', { name: 'Lista de compras' }).click()
      await page.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
      await page.getByRole('menuitem', { name: opcion }).click()
      await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Regresar' }).click()
      await expect(page.getByRole('heading', { name: 'Lista de compras', level: 1 })).toBeVisible()
    }
  })

  test('la app trabaja con el servidor (no en modo local)', async ({ page }) => {
    const respuesta = page.waitForResponse(r => new URL(r.url()).pathname === '/api/compras' && r.ok())
    await menu(page).getByRole('link', { name: 'Lista de compras' }).click()
    await respuesta
  })

  test('una ruta que no existe lleva al inicio, y las viejas /configuracion y /catalogo/materiales a su nuevo lugar', async ({ page }) => {
    await page.goto('/no-existe')
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()

    await page.goto('/configuracion/proveedores')
    await expect(page).toHaveURL(/\/catalogo\/proveedores$/)
    await page.goto('/catalogo/materiales')
    await expect(page).toHaveURL(/\/catalogo\/articulos$/)
  })

  test('cada sección del Catálogo abre su lista', async ({ page }) => {
    await page.goto('/catalogo')
    const secciones = page.getByRole('navigation', { name: 'Secciones del catálogo' })
    for (const [seccion, singular] of [['Proveedores', 'proveedor'], ['Categorías', 'categoría'], ['Artículos', 'artículo'], ['Productos', 'producto']]) {
      await secciones.getByRole('link', { name: new RegExp(`^${seccion}`) }).click()
      await expect(page.getByRole('button', { name: `Agregar ${singular}` })).toBeVisible()
    }
  })

  test('"Saltar al contenido" lleva el foco al contenido', async ({ page }) => {
    await page.keyboard.press('Tab')
    const saltar = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(saltar).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#contenido')).toBeFocused()
  })
})
