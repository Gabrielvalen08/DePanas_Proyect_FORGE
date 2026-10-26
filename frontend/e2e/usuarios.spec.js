import { test, expect, entrar, menu, confirmar, salir, CESAR } from './ayudantes.js'
import { COMPRA, CONFIRMAR, USUARIOS } from '../src/utils/mensajes.js'

// Cumple los requisitos iniciales: 8 caracteres, mayúscula, minúscula, número y carácter especial
const NUEVO = { usuario: 'Luis_e2e', nombre: 'Luis', contrasena: 'Tequeño#9' }

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

async function irAlGestor(page) {
  await menu(page).getByRole('link', { name: 'Gestor de usuarios' }).click()
}

test.describe('Gestor de usuarios', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, CESAR)
    await irAlGestor(page)
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

  test('la contraseña nueva debe cumplir los requisitos, que se ven en vivo', async ({ page }) => {
    const ventana = await abrirNuevo(page)
    await llenar(ventana, { ...NUEVO, contrasena: 'arepa99' })
    const requisitos = ventana.locator('#editor-usuario-requisitos')
    await expect(requisitos.getByRole('listitem').filter({ hasText: 'Un número' })).toContainText(USUARIOS.requisitoCumple)
    await expect(requisitos.getByRole('listitem').filter({ hasText: 'Una letra mayúscula' })).toContainText(USUARIOS.requisitoFalta)

    await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
    // No llega a pedir confirmación: marca la contraseña
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(ventana.getByLabel(USUARIOS.campos.contrasena, { exact: true })).toBeFocused()

    await ventana.getByRole('button', { name: USUARIOS.cancelar }).click()
    await confirmar(page, CONFIRMAR.descartar.confirmar)
  })

  test('no deja repetir el usuario ni la contraseña de otro', async ({ page }) => {
    const ventana = await abrirNuevo(page)
    await llenar(ventana, { ...NUEVO, usuario: 'marta_02' })
    await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
    // El usuario repetido se detecta antes de pedir confirmación
    await expect(ventana.getByText(USUARIOS.validacion.usuarioRepetido('Marta_02'))).toBeVisible()

    await llenar(ventana, { ...NUEVO, contrasena: CESAR.contrasena })
    await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
    await confirmar(page, CONFIRMAR.guardarCambios.confirmar)
    await expect(ventana.getByText(USUARIOS.validacion.contrasenaRepetida)).toBeVisible()
    await expect(ventana.getByLabel(USUARIOS.campos.contrasena, { exact: true })).toBeFocused()

    // Con datos escritos, cancelar pide descartar
    await ventana.getByRole('button', { name: USUARIOS.cancelar }).click()
    await confirmar(page, CONFIRMAR.descartar.confirmar)
    await expect(ventana).toBeHidden()
  })

  test('el Gestor de usuarios no se puede dar a otro usuario', async ({ page }) => {
    const ventana = await abrirNuevo(page)
    await expect(ventana.getByRole('checkbox', { name: /usuarios/i })).toHaveCount(0)
    await expect(ventana.getByText(USUARIOS.permisosNota)).toBeVisible()
  })

  test('un empleado registra compras pero no ve el Catálogo ni puede eliminarlas; César le da más y luego lo elimina', async ({ page }) => {
    // Crear: el rol Empleado viene elegido con sus pantallas y funciones
    const ventana = await abrirNuevo(page)
    await expect(ventana.getByRole('radio', { name: /Empleado/ })).toBeChecked()
    await expect(ventana.getByRole('checkbox', { name: /^Catálogo/ })).not.toBeChecked()
    await expect(ventana.getByRole('checkbox', { name: USUARIOS.funciones['compras.eliminar'] })).not.toBeChecked()
    await llenar(ventana, NUEVO)
    await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
    await confirmar(page, CONFIRMAR.guardarCambios.confirmar)
    await expect(page.getByText(USUARIOS.creado(NUEVO))).toBeVisible()
    await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /Luis_e2e/ }) }))
      .toContainText(USUARIOS.roles.empleado)

    // Entra: Agregar compra y Lista de compras, sin Catálogo
    await salir(page)
    await entrar(page, NUEVO)
    await expect(menu(page).getByRole('link', { name: 'Agregar compra' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Lista de compras' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Catálogo' })).toHaveCount(0)
    await page.goto('/catalogo')
    await expect(page.getByRole('heading', { name: 'Agregar compra', level: 1 })).toBeVisible()

    // Registra una compra
    const formulario = page.getByRole('form', { name: 'Detalle de compra' }).first()
    await formulario.getByRole('combobox', { name: 'Proveedor' }).fill('Pepsi')
    await page.keyboard.press('Escape')
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Gatorade')
    await page.keyboard.press('Escape')
    await formulario.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill('2')
    await formulario.getByRole('combobox', { name: 'Unidad, fila 1' }).selectOption('unidad')
    await formulario.getByRole('textbox', { name: 'Precio unitario, fila 1' }).fill('1.50')
    await page.getByRole('button', { name: 'Guardar compra' }).click()
    await confirmar(page, COMPRA.confirmarGuardar.confirmar)
    await expect(page.getByText(COMPRA.guardada)).toBeVisible()

    // En la lista la ve y la puede editar, pero no eliminar
    await menu(page).getByRole('link', { name: 'Lista de compras' }).click()
    await page.getByRole('button', { name: /Ver compra en Pepsi/ }).click()
    const detalle = page.getByRole('dialog', { name: 'Compra en Pepsi' })
    await expect(detalle).toContainText('Gatorade')
    await expect(detalle.getByRole('button', { name: 'Editar' })).toBeVisible()
    await expect(detalle.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    // César le da el Catálogo solo para consultar (sin agregar, editar ni eliminar) y le cambia la contraseña
    await salir(page)
    await entrar(page, CESAR)
    await irAlGestor(page)
    await page.getByRole('button', { name: USUARIOS.editar(NUEVO.usuario) }).click()
    const edicion = page.getByRole('dialog', { name: USUARIOS.tituloEditar(NUEVO.usuario) })
    await expect(edicion.getByLabel(USUARIOS.campos.usuario, { exact: true })).toBeDisabled()
    await edicion.getByLabel(USUARIOS.campos.contrasenaNueva, { exact: true }).fill('Cachito#7')
    await edicion.getByLabel(USUARIOS.campos.confirmar, { exact: true }).fill('Cachito#7')
    await edicion.getByRole('checkbox', { name: /^Catálogo/ }).check()
    for (const f of ['catalogo.agregar', 'catalogo.editar', 'catalogo.eliminar', 'catalogo.exportar', 'catalogo.cargar']) {
      await edicion.getByRole('checkbox', { name: USUARIOS.funciones[f], exact: true }).uncheck()
    }
    await edicion.getByRole('button', { name: USUARIOS.guardar }).click()
    await confirmar(page, CONFIRMAR.guardarCambios.confirmar)
    await expect(page.getByText(USUARIOS.editado(NUEVO))).toBeVisible()

    // Con la nueva contraseña ve el Catálogo, pero sin botones para cambiarlo
    await salir(page)
    await entrar(page, { ...NUEVO, contrasena: 'Cachito#7' })
    await menu(page).getByRole('link', { name: 'Catálogo' }).click()
    await page.goto('/catalogo/proveedores')
    await expect(page.getByRole('rowheader', { name: 'Pepsi' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Agregar proveedor/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Eliminar proveedor/ })).toHaveCount(0)

    // César elimina la compra y al usuario; ya no puede entrar
    await salir(page)
    await entrar(page, CESAR)
    await menu(page).getByRole('link', { name: 'Lista de compras' }).click()
    await page.getByRole('button', { name: /Ver compra en Pepsi/ }).click()
    await page.getByRole('dialog', { name: 'Compra en Pepsi' }).getByRole('button', { name: 'Eliminar' }).click()
    await confirmar(page, COMPRA.confirmarEliminar.confirmar)
    await expect(page.getByText(COMPRA.eliminada)).toBeVisible()

    await irAlGestor(page)
    await page.getByRole('button', { name: USUARIOS.eliminar(NUEVO.usuario) }).click()
    await confirmar(page, USUARIOS.confirmarEliminar.confirmar)
    await expect(page.getByText(USUARIOS.eliminado(NUEVO.usuario))).toBeVisible()
    await expect(page.getByRole('rowheader', { name: new RegExp(NUEVO.usuario) })).toHaveCount(0)
  })

  test('César cambia los requisitos de contraseña y se aplican al crear usuarios', async ({ page }) => {
    const R = USUARIOS.requisitos
    async function cambiarRequisitos(minimo, especial) {
      await page.getByRole('button', { name: R.editar }).click()
      const ventana = page.getByRole('dialog', { name: R.tituloEditor })
      await ventana.getByLabel(R.minimo, { exact: true }).fill(String(minimo))
      await ventana.getByRole('checkbox', { name: R.opciones.especial }).setChecked(especial)
      await ventana.getByRole('button', { name: USUARIOS.guardar }).click()
      await confirmar(page, CONFIRMAR.guardarCambios.confirmar)
      await expect(page.getByText(R.guardado)).toBeVisible()
    }

    await cambiarRequisitos(10, false)
    await expect(page.getByText('Al menos 10 caracteres')).toBeVisible()
    const ventana = await abrirNuevo(page)
    const requisitos = ventana.locator('#editor-usuario-requisitos')
    await expect(requisitos).toContainText('Al menos 10 caracteres')
    await expect(requisitos).not.toContainText('carácter especial')
    await ventana.getByRole('button', { name: USUARIOS.cancelar }).click()

    // Se dejan como estaban
    await cambiarRequisitos(8, true)
    await expect(page.getByText('Al menos 8 caracteres')).toBeVisible()
  })
})
