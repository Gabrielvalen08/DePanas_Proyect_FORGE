import { test, expect, entrar, confirmar, CESAR, MARTA } from './ayudantes.js'
import { ACCESO, CONFIRMAR } from '../src/utils/mensajes.js'

// Proyecto "movil" (Pixel 7): el menú lateral se cambia por la barra inferior;
// el Gestor de usuarios y Cerrar sesión van en la hoja "Más"
const barra = page => page.getByRole('navigation', { name: 'Menú principal móvil' })
const hojaMas = page => page.getByRole('dialog', { name: 'Más opciones' })

async function abrirMas(page) {
  await barra(page).getByRole('button', { name: 'Más' }).click()
  await expect(hojaMas(page)).toBeVisible()
}

test.describe('Celular', () => {
  test('la barra inferior lleva a cada pantalla', async ({ page }) => {
    await entrar(page, CESAR)
    await expect(page.getByRole('complementary')).toBeHidden()
    await expect(barra(page)).toBeVisible()

    await barra(page).getByRole('link', { name: 'Lista' }).click()
    await expect(page.getByRole('heading', { name: 'Lista de compras', level: 1 })).toBeVisible()
    await barra(page).getByRole('link', { name: 'Catálogo' }).click()
    await expect(page.getByRole('heading', { name: 'Catálogo', level: 1 })).toBeVisible()
    await barra(page).getByRole('link', { name: 'Agregar' }).click()
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()
  })

  test('"Más" abre el Gestor de usuarios y Cerrar sesión', async ({ page }) => {
    await entrar(page, CESAR)
    await abrirMas(page)
    // Exportar y Cargar se abren desde la Lista de compras, no desde el menú
    await expect(hojaMas(page).getByRole('link', { name: 'Exportar datos' })).toHaveCount(0)
    await hojaMas(page).getByRole('link', { name: 'Gestor de usuarios' }).click()
    await expect(hojaMas(page)).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Gestor de usuarios', level: 1 })).toBeVisible()

    await abrirMas(page)
    await hojaMas(page).getByRole('button', { name: 'Cerrar sesión' }).click()
    await confirmar(page, CONFIRMAR.cerrarSesion.confirmar)
    await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
  })

  test('ninguna pantalla se sale del ancho del teléfono', async ({ page }) => {
    await entrar(page, CESAR)
    for (const ruta of ['/', '/compras', '/catalogo/articulos', '/catalogo/categorias', '/exportar', '/cargar', '/usuarios']) {
      await page.goto(ruta)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(sobra, `${ruta} tiene scroll horizontal`).toBeLessThanOrEqual(0)
    }
  })

  test('Marta no ve el Gestor de usuarios en el celular', async ({ page }) => {
    await entrar(page, MARTA)
    await abrirMas(page)
    await expect(hojaMas(page).getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
    await expect(page.getByRole('link', { name: /usuarios/i })).toHaveCount(0)
  })
})
