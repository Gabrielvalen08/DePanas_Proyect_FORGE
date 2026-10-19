import { test, expect, entrar, CESAR, MARTA } from './ayudantes.js'
import { ACCESO } from '../src/utils/mensajes.js'

// Proyecto "movil" (Pixel 7): el menú lateral se cambia por la barra inferior;
// Exportar, Cargar, el Gestor de usuarios y Bloquear van en la hoja "Más"
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

    await barra(page).getByRole('link', { name: 'Compras' }).click()
    await expect(page.getByRole('heading', { name: 'Compras', level: 1 })).toBeVisible()
    await barra(page).getByRole('link', { name: 'Catálogo' }).click()
    await expect(page.getByRole('heading', { name: 'Catálogo', level: 1 })).toBeVisible()
    await barra(page).getByRole('link', { name: 'Agregar' }).click()
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()
  })

  test('"Más" abre el resto de pantallas y Bloquear', async ({ page }) => {
    await entrar(page, CESAR)
    for (const pantalla of ['Exportar datos', 'Cargar datos', 'Gestor de usuarios']) {
      await abrirMas(page)
      await hojaMas(page).getByRole('link', { name: pantalla }).click()
      await expect(hojaMas(page)).toBeHidden()
      await expect(page.getByRole('heading', { name: pantalla, level: 1 })).toBeVisible()
    }
    await abrirMas(page)
    await hojaMas(page).getByRole('button', { name: 'Bloquear' }).click()
    await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
  })

  test('ninguna pantalla se sale del ancho del teléfono', async ({ page }) => {
    await entrar(page, CESAR)
    for (const ruta of ['/', '/compras', '/catalogo/materiales', '/exportar', '/cargar', '/usuarios']) {
      await page.goto(ruta)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(sobra, `${ruta} tiene scroll horizontal`).toBeLessThanOrEqual(0)
    }
  })

  test('Marta no ve el Gestor de usuarios en el celular', async ({ page }) => {
    await entrar(page, MARTA)
    await abrirMas(page)
    await expect(hojaMas(page).getByRole('link', { name: 'Exportar datos' })).toBeVisible()
    await expect(page.getByRole('link', { name: /usuarios/i })).toHaveCount(0)
  })
})
