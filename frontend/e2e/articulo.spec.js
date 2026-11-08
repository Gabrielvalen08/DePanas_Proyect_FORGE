import { test, expect, entrar, confirmar, CESAR } from './ayudantes.js'
import { ASIGNACION, COMPRA, NOMBRE_PARECIDO, VALIDACION } from '../src/utils/mensajes.js'

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

  test('un error de dedo avisa que se parece a otro artículo, sin impedir seguir', async ({ page }) => {
    await entrar(page, CESAR)
    await elegirProveedor(page)
    const formulario = formularioCompra(page)
    await formulario.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Gatired')
    await page.keyboard.press('Escape')
    await formulario.getByRole('button', { name: COMPRA.agregarArticulo('Gatired') }).click()

    const ventana = page.getByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await expect(ventana.getByText(NOMBRE_PARECIDO.aviso('Gatired', 'Gatorade', 'material'))).toBeVisible()
    await ventana.getByRole('textbox', { name: ASIGNACION.nombreArticulo }).fill('Azucar morena')
    await expect(ventana.getByText(/se parece a/)).toHaveCount(0)
  })

  test('un proveedor parecido avisa al salir del campo', async ({ page }) => {
    await entrar(page, CESAR)
    const proveedor = formularioCompra(page).getByRole('combobox', { name: 'Proveedor' })
    await proveedor.fill('Selecto')
    await page.keyboard.press('Escape')
    await proveedor.blur()
    await expect(page.getByText(NOMBRE_PARECIDO.aviso('Selecto', 'Selectos', 'proveedor'))).toBeVisible()
  })

  test('sin producto: la primera compra pregunta y marca; la segunda ya no pide nada', async ({ page, request }, info) => {
    await entrar(page, CESAR)
    const articulo = `Sal e2e ${info.project.name}`

    /** Escribe el artículo y sale del campo: ahí es cuando se pregunta, si hay que preguntar */
    async function escribirArticulo() {
      await elegirProveedor(page)
      const formulario = formularioCompra(page)
      const fila = formulario.getByRole('combobox', { name: 'Artículo, fila 1' })
      await fila.fill(articulo)
      await page.keyboard.press('Escape')
      await fila.blur()
      return { formulario, fila }
    }

    async function llenarResto(formulario) {
      await formulario.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill('2')
      await formulario.getByRole('combobox', { name: 'Unidad, fila 1' }).selectOption('lb')
      await formulario.getByRole('textbox', { name: 'Precio unitario, fila 1' }).fill('3.00')
    }

    // Primera compra: pregunta; con «Ahora no» la fila queda en rojo y aun así se guarda
    const { formulario, fila } = await escribirArticulo()
    const ventana = page.getByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await ventana.getByRole('button', { name: ASIGNACION.ahoraNo }).click()
    await expect(ventana).toBeHidden()
    await expect(fila).toHaveAccessibleDescription(COMPRA.articuloIncompleto)
    await expect(formulario.getByTitle(COMPRA.articuloIncompleto)).toBeVisible()

    await formulario.getByRole('button', { name: COMPRA.agregarArticulo(articulo) }).click()
    await expect(ventana.getByText(ASIGNACION.faltaInformacion(true, true))).toBeVisible()
    await ventana.getByRole('button', { name: ASIGNACION.ahoraNo }).click()
    await expect(ventana).toBeHidden()

    await llenarResto(formulario)
    await formulario.getByRole('button', { name: 'Guardar compra' }).click()
    await confirmar(page, COMPRA.confirmarGuardar.confirmar)
    await expect(page.getByText(COMPRA.guardada)).toBeVisible()
    // La compra guardada sale con una animación: se sigue cuando ya solo queda el bloque nuevo
    await expect(page.getByRole('form', { name: 'Detalle de compra' })).toHaveCount(1)

    // Segunda compra del mismo artículo: ni formulario ni rojo
    const segunda = await escribirArticulo()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(segunda.formulario.getByTitle(COMPRA.articuloIncompleto)).toHaveCount(0)
    await llenarResto(segunda.formulario)
    await segunda.formulario.getByRole('button', { name: 'Guardar compra' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await confirmar(page, COMPRA.confirmarGuardar.confirmar)
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.getByRole('form', { name: 'Detalle de compra' })).toHaveCount(1)

    // Las pruebas comparten la base y las de Compras esperan terminar sin compras
    const { token } = await (await request.post('/api/sesion', { data: { usuario: CESAR.usuario, contrasena: CESAR.contrasena } })).json()
    const headers = { Authorization: `Bearer ${token}` }
    const compras = await (await request.get('/api/compras', { headers })).json()
    for (const compra of compras) {
      if (compra.materiales.some(m => m.material === articulo)) await request.delete(`/api/compras/${compra.id}`, { headers })
    }
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
