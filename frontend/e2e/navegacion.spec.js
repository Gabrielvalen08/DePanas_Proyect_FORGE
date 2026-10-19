import { test, expect, entrar, menu, CESAR } from './ayudantes.js'
import { DATOS } from '../src/utils/mensajes.js'

// Cada botón del menú abre su pantalla, con su título y sin errores
const PANTALLAS = [
  ['Compras', '/compras'],
  ['Catálogo', '/catalogo'],
  ['Exportar datos', '/exportar'],
  ['Cargar datos', '/cargar'],
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

  test('la app trabaja con el servidor (no en modo local)', async ({ page }) => {
    await menu(page).getByRole('link', { name: 'Exportar datos' }).click()
    await expect(page.getByText(DATOS.modoServidor)).toBeVisible()
  })

  test('una ruta que no existe lleva al inicio, y la vieja /configuracion al Catálogo', async ({ page }) => {
    await page.goto('/no-existe')
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()

    await page.goto('/configuracion/proveedores')
    await expect(page).toHaveURL(/\/catalogo\/proveedores$/)
  })

  test('cada sección del Catálogo abre su lista', async ({ page }) => {
    await page.goto('/catalogo')
    const secciones = page.getByRole('navigation', { name: 'Secciones del catálogo' })
    for (const [seccion, singular] of [['Proveedores', 'proveedor'], ['Categorías', 'categoría'], ['Materiales', 'material'], ['Productos', 'producto']]) {
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
