import { test, expect, entrar, menu, CESAR, MARTA } from './ayudantes.js'
import { ACCESO } from '../src/utils/mensajes.js'

test.describe('Acceso', () => {
  test('sin sesión, solo se ve la pantalla de acceso', async ({ page }) => {
    await page.goto('/compras')
    await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Menú principal' })).toHaveCount(0)
  })

  test('pide usuario y contraseña antes de entrar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: ACCESO.boton }).click()
    await expect(page.getByRole('alert').filter({ hasText: ACCESO.faltaUsuario })).toBeVisible()

    await page.getByLabel(ACCESO.etiquetaUsuario).fill(CESAR.usuario)
    await page.getByRole('button', { name: ACCESO.boton }).click()
    await expect(page.getByRole('alert').filter({ hasText: ACCESO.faltaContrasena })).toBeVisible()
  })

  test('rechaza una contraseña incorrecta y un usuario que no existe', async ({ page }) => {
    await page.goto('/')
    for (const [usuario, contrasena] of [[CESAR.usuario, '0000'], ['Nadie_99', '1234']]) {
      await page.getByLabel(ACCESO.etiquetaUsuario).fill(usuario)
      await page.getByLabel(ACCESO.etiquetaContrasena, { exact: true }).fill(contrasena)
      await page.getByRole('button', { name: ACCESO.boton }).click()
      await expect(page.getByRole('alert').filter({ hasText: ACCESO.incorrecta })).toBeVisible()
    }
    await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
  })

  test('el ojo muestra y oculta la contraseña, y "Olvidé mi contraseña" da ayuda', async ({ page }) => {
    await page.goto('/')
    const campo = page.getByLabel(ACCESO.etiquetaContrasena, { exact: true })
    await expect(campo).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Ver contraseña' }).click()
    await expect(campo).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click()
    await expect(campo).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: ACCESO.olvideContrasena }).click()
    await expect(page.getByText(ACCESO.ayudaOlvide)).toBeVisible()
  })

  test('César entra y ve todas las pantallas, también el Gestor de usuarios', async ({ page }) => {
    await entrar(page, CESAR)
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()
    for (const pantalla of ['Agregar compra', 'Compras', 'Catálogo', 'Exportar datos', 'Cargar datos', 'Gestor de usuarios']) {
      await expect(menu(page).getByRole('link', { name: pantalla })).toBeVisible()
    }
  })

  test('Marta entra sin el Gestor de usuarios, y si lo abre a mano vuelve al inicio', async ({ page }) => {
    await entrar(page, MARTA)
    await expect(menu(page).getByRole('link', { name: 'Compras' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Gestor de usuarios' })).toHaveCount(0)

    await page.goto('/usuarios')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()
  })

  test('Bloquear cierra la sesión y vuelve a pedir la contraseña', async ({ page }) => {
    await entrar(page, CESAR)
    await menu(page).getByRole('button', { name: 'Bloquear' }).click()
    await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
    await expect(page.getByText(ACCESO.bloqueado)).toBeVisible()

    // Recargar no vuelve a abrir la sesión
    await page.reload()
    await expect(page.getByRole('heading', { name: ACCESO.titulo })).toBeVisible()
  })

  test('la sesión sigue abierta al recargar la página', async ({ page }) => {
    await entrar(page, CESAR)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()
  })
})
