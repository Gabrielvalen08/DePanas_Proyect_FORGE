import { test, expect, entrar, menu, CESAR } from './ayudantes.js'
import { USUARIOS } from '../src/utils/mensajes.js'

const NUEVO = { usuario: 'Luis_e2e', nombre: 'Luis', contrasena: 'tequeno9' }

async function abrirNuevo(page) {
  await page.getByRole('button', { name: USUARIOS.agregar }).click()
  return page.getByRole('dialog', { name: USUARIOS.tituloNuevo })
}

async function llenar(ventana, { usuario, nombre, contrasena }) {
  await ventana.getByLabel(USUARIOS.campos.usuario, { exact: true }).fill(usuario)
  await ventana.getByLabel(USUARIOS.campos.nombre, { exact: true }).fill(nombre)
  await ventana.getByLabel(USUARIOS.campos.contrasena, { exact: true }).fill(contrasena)
  await ventana.getByLabel(USUARIOS.campos.confirmar, { exact: true }).fill(contrasena)
}

test.describe('Gestor de usuarios', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, CESAR)
    await menu(page).getByRole('link', { name: 'Gestor de usuarios' }).click()
  })

  test('lista a César como administrador y a Marta como operadora', async ({ page }) => {
    const cesar = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /Cesar_01/ }) })
    await expect(cesar).toContainText(USUARIOS.roles.admin)
    await expect(cesar).toContainText(USUARIOS.todas)
    // Al administrador no se le puede eliminar
    await expect(cesar.getByRole('button', { name: USUARIOS.eliminar('Cesar_01') })).toHaveCount(0)

    const marta = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /Marta_02/ }) })
    await expect(marta).toContainText(USUARIOS.roles.operador)
  })

  test('no deja repetir el usuario ni la contraseña de otro', async ({ page }) => {
    const ventana = await abrirNuevo(page)
    await llenar(ventana, { ...NUEVO, usuario: 'marta_02' })
    await ventana.getByRole('checkbox', { name: /Compras/ }).check()
    await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
    await expect(ventana.getByText(USUARIOS.validacion.usuarioRepetido('Marta_02'))).toBeVisible()

    await llenar(ventana, { ...NUEVO, contrasena: '5678' })
    await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
    await expect(ventana.getByText(USUARIOS.validacion.contrasenaRepetida)).toBeVisible()
    await expect(ventana.getByLabel(USUARIOS.campos.contrasena, { exact: true })).toBeFocused()

    await ventana.getByRole('button', { name: USUARIOS.cancelar }).click()
    await expect(ventana).toBeHidden()
  })

  test('el Gestor de usuarios no se puede dar a otro usuario', async ({ page }) => {
    const ventana = await abrirNuevo(page)
    await expect(ventana.getByRole('checkbox', { name: /usuarios/i })).toHaveCount(0)
    await expect(ventana.getByText(USUARIOS.permisosNota)).toBeVisible()
  })

  test('crea un usuario que solo ve sus pantallas, lo edita y lo elimina', async ({ page }) => {
    // Crear con acceso solo a Compras
    const ventana = await abrirNuevo(page)
    await llenar(ventana, NUEVO)
    await ventana.getByRole('checkbox', { name: /Compras/ }).check()
    await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
    await expect(page.getByText(USUARIOS.creado(NUEVO))).toBeVisible()

    // Entra y solo ve Compras; lo demás lo devuelve a Compras
    await menu(page).getByRole('button', { name: 'Bloquear' }).click()
    await entrar(page, NUEVO)
    await expect(page.getByRole('heading', { name: 'Compras', level: 1 })).toBeVisible()
    await expect(menu(page).getByRole('link')).toHaveCount(1)
    for (const ruta of ['/', '/catalogo', '/usuarios']) {
      await page.goto(ruta)
      await expect(page).toHaveURL(/\/compras$/)
    }

    // César le cambia la contraseña y le da el Catálogo
    await menu(page).getByRole('button', { name: 'Bloquear' }).click()
    await entrar(page, CESAR)
    await menu(page).getByRole('link', { name: 'Gestor de usuarios' }).click()
    await page.getByRole('button', { name: USUARIOS.editar(NUEVO.usuario) }).click()
    const edicion = page.getByRole('dialog', { name: USUARIOS.tituloEditar(NUEVO.usuario) })
    await expect(edicion.getByLabel(USUARIOS.campos.usuario, { exact: true })).toBeDisabled()
    await edicion.getByLabel(USUARIOS.campos.contrasenaNueva, { exact: true }).fill('cachito7')
    await edicion.getByLabel(USUARIOS.campos.confirmar, { exact: true }).fill('cachito7')
    await edicion.getByRole('checkbox', { name: /Catálogo/ }).check()
    await edicion.getByRole('button', { name: USUARIOS.guardar }).click()
    await expect(page.getByText(USUARIOS.editado(NUEVO))).toBeVisible()

    // Con la nueva contraseña ve Compras y Catálogo
    await menu(page).getByRole('button', { name: 'Bloquear' }).click()
    await entrar(page, { ...NUEVO, contrasena: 'cachito7' })
    await expect(menu(page).getByRole('link', { name: 'Catálogo' })).toBeVisible()

    // César lo elimina y ya no puede entrar
    await menu(page).getByRole('button', { name: 'Bloquear' }).click()
    await entrar(page, CESAR)
    await menu(page).getByRole('link', { name: 'Gestor de usuarios' }).click()
    await page.getByRole('button', { name: USUARIOS.eliminar(NUEVO.usuario) }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: USUARIOS.confirmarEliminar.confirmar }).click()
    await expect(page.getByText(USUARIOS.eliminado(NUEVO.usuario))).toBeVisible()
    await expect(page.getByRole('rowheader', { name: new RegExp(NUEVO.usuario) })).toHaveCount(0)
  })
})
