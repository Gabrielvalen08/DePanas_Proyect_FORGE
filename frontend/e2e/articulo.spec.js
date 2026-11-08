import { test, expect, entrar, confirmar, CESAR } from './ayudantes.js'
import { ASIGNACION, COMPRA, VALIDACION } from '../src/utils/mensajes.js'

const formularioCompra = page => page.getByRole('form', { name: 'Detalle de compra' }).first()

async function elegirProveedor(page, nombre = 'Selectos') {
  await formularioCompra(page).getByRole('combobox', { name: 'Proveedor' }).fill(nombre)
  await page.keyboard.press('Escape')
}

/** Elige categoría y producto, guarda y confirma el resumen */
async function completarYGuardar(page, ventana) {
  await ventana.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Limpieza', exact: true }).click()
  await ventana.getByRole('group', { name: ASIGNACION.etiquetaProductos }).getByRole('button', { name: 'Cachitos', exact: true }).click()
  await ventana.getByRole('button', { name: ASIGNACION.guardar }).click()
  await confirmar(page, ASIGNACION.confirmar.confirmar)
  await expect(ventana).toBeHidden()
}

test.describe('Formulario de artículo en Agregar compra', () => {
  test('el «+» crea un artículo y el lápiz lo renombra en el catálogo', async ({ page }, info) => {
    await entrar(page, CESAR)
    const original = `Harina e2e ${info.project.name}`
    const renombrado = `Harina fina e2e ${info.project.name}`
    const formulario = formularioCompra(page)
    const fila = formulario.getByRole('combobox', { name: 'Artículo, fila 1' })

    // Sin proveedor, el «+» está activo pero lo pide primero
    await formulario.getByRole('button', { name: COMPRA.agregarArticulo('') }).click()
    await expect(formulario.getByText(VALIDACION.proveedorPrimero)).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await elegirProveedor(page)
    await formulario.getByRole('button', { name: COMPRA.agregarArticulo('') }).click()
    let ventana = page.getByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await ventana.getByRole('textbox', { name: ASIGNACION.nombreArticulo }).fill(original)
    await completarYGuardar(page, ventana)
    await expect(fila).toHaveValue(original)

    // Ya registrado: el botón es el lápiz y el formulario viene lleno
    await formulario.getByRole('button', { name: COMPRA.editarArticulo(original) }).click()
    ventana = page.getByRole('dialog', { name: ASIGNACION.tituloEditar })
    const nombre = ventana.getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    await expect(nombre).toHaveValue(original)
    await expect(ventana.getByRole('button', { name: 'Limpieza', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await nombre.fill(renombrado)
    await ventana.getByRole('button', { name: ASIGNACION.guardar }).click()
    await confirmar(page, ASIGNACION.confirmar.confirmar)
    await expect(ventana).toBeHidden()
    await expect(fila).toHaveValue(renombrado)
    await expect(formulario.getByRole('button', { name: COMPRA.editarArticulo(renombrado) })).toBeVisible()

    // Quedó en el catálogo con el nombre nuevo, y el viejo ya no existe
    await page.getByRole('button', { name: 'Cancelar' }).first().click()
    await confirmar(page, COMPRA.confirmarCancelar.confirmar)
    await page.goto('/catalogo/articulos')
    await expect(page.getByText(renombrado, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(original, { exact: true })).toHaveCount(0)
  })

  test('escribir un artículo no registrado abre el formulario con ese nombre, y no deja repetir otro', async ({ page }, info) => {
    await entrar(page, CESAR)
    const escrito = `Queso e2e ${info.project.name}`
    await elegirProveedor(page)
    const formulario = formularioCompra(page)
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill(escrito)
    await page.keyboard.press('Escape')
    await formulario.getByRole('button', { name: COMPRA.agregarArticulo(escrito) }).click()

    const ventana = page.getByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await expect(page.getByRole('dialog')).toHaveCount(1)
    const nombre = ventana.getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    await expect(nombre).toHaveValue(escrito)

    await nombre.fill('azucar')
    await ventana.getByRole('button', { name: ASIGNACION.guardar }).click()
    await expect(ventana.getByText(/Ya existe un artículo/)).toBeVisible()
  })

  test('sin permiso de editar el catálogo el lápiz sale apagado', async ({ page, request }, info) => {
    // Un empleado de esta corrida (el rol no trae Catálogo)
    const usuario = `Emp_${info.project.name}`
    const contrasena = 'Tequeño#9'
    const { token } = await (await request.post('/api/sesion', { data: { usuario: CESAR.usuario, contrasena: CESAR.contrasena } })).json()
    await request.post('/api/usuarios', {
      headers: { Authorization: `Bearer ${token}` },
      data: { usuario, nombre: 'Empleado', contrasena, rol: 'empleado' },
    })

    await entrar(page, { usuario, contrasena })
    await elegirProveedor(page)
    const formulario = formularioCompra(page)
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Azucar')
    await page.keyboard.press('Escape')
    await expect(formulario.getByRole('button', { name: COMPRA.sinPermisoEditarArticulo('Azucar') })).toBeDisabled()
  })
})
