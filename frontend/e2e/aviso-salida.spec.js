import { test, expect, entrar, confirmar, CESAR } from './ayudantes.js'
import { AVISO_SALIDA, CARGAR, COMPRA, CONFIRMAR, EXPORTAR, LISTA_COMPRAS, PANTALLA_CATALOGO, USUARIOS, VALIDACION } from '../src/utils/mensajes.js'

// Corre en los dos proyectos (escritorio y movil): el menú cambia, el aviso es el mismo

const esMovil = page => page.viewportSize().width < 1100

/** Lleva a Lista de compras con el menú que haya: lateral o barra inferior */
function irALista(page) {
  return esMovil(page)
    ? page.getByRole('navigation', { name: 'Menú principal móvil' }).getByRole('link', { name: 'Lista' }).click()
    : page.getByRole('complementary').getByRole('link', { name: 'Lista de compras' }).click()
}

async function pulsarCerrarSesion(page) {
  if (esMovil(page)) {
    await page.getByRole('navigation', { name: 'Menú principal móvil' }).getByRole('button', { name: 'Más' }).click()
    await page.getByRole('dialog', { name: 'Más opciones' }).getByRole('button', { name: 'Cerrar sesión' }).click()
  } else {
    await page.getByRole('complementary').getByRole('button', { name: 'Cerrar sesión' }).click()
  }
}

const aviso = page => page.getByRole('alertdialog', { name: AVISO_SALIDA.titulo })
const tituloLista = page => page.getByRole('heading', { name: 'Lista de compras', level: 1 })
const tituloAgregar = page => page.getByRole('heading', { name: 'Agregar compra', level: 1 })
const formulario = page => page.getByRole('form', { name: 'Detalle de compra' }).first()

async function escribirProveedor(page, nombre) {
  await formulario(page).getByRole('combobox', { name: 'Proveedor' }).fill(nombre)
  await page.keyboard.press('Escape')
}

async function llenarCompra(page, proveedor) {
  await escribirProveedor(page, proveedor)
  const f = formulario(page)
  await f.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Azucar')
  await page.keyboard.press('Escape')
  await f.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill('2')
  await f.getByRole('combobox', { name: 'Unidad, fila 1' }).selectOption('lb')
  await f.getByRole('textbox', { name: 'Precio unitario, fila 1' }).fill('1.50')
}

test.describe('Aviso antes de perder datos sin guardar', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, CESAR)
  })

  test('sin cambios, cambiar de pantalla no avisa', async ({ page }) => {
    await irALista(page)
    await expect(tituloLista(page)).toBeVisible()
    await expect(aviso(page)).toHaveCount(0)
  })

  test('«Salir sin guardar» pierde los datos y sigue a donde iba', async ({ page }) => {
    await escribirProveedor(page, 'Selectos')
    await irALista(page)
    await expect(aviso(page)).toBeVisible()
    await expect(tituloAgregar(page)).toBeVisible()

    await aviso(page).getByRole('button', { name: AVISO_SALIDA.salir }).click()
    await expect(tituloLista(page)).toBeVisible()

    await page.goBack()
    await expect(tituloAgregar(page)).toBeVisible()
    await expect(formulario(page).getByRole('combobox', { name: 'Proveedor' })).toHaveValue('')
  })

  test('la X y Esc del aviso solo lo cierran y se sigue editando', async ({ page }) => {
    await escribirProveedor(page, 'Selectos')
    await irALista(page)
    await aviso(page).getByRole('button', { name: 'Cerrar' }).click()
    await expect(aviso(page)).toHaveCount(0)
    await expect(tituloAgregar(page)).toBeVisible()

    await irALista(page)
    await expect(aviso(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(aviso(page)).toHaveCount(0)
    await expect(formulario(page).getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Selectos')
  })

  test('«Registrar» con errores se queda en el formulario marcándolos', async ({ page }) => {
    await escribirProveedor(page, 'Selectos')
    await irALista(page)
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.registrar }).click()
    await expect(formulario(page).getByText(VALIDACION.material).first()).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(tituloAgregar(page)).toBeVisible()
  })

  test('«Registrar» que no se confirma se queda; si se confirma, guarda y sigue. Editar también avisa', async ({ page }) => {
    await llenarCompra(page, 'Desechables Diver.')
    await irALista(page)
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.registrar }).click()

    // Primero dice que no en «¿Guardamos…?»
    const guardar = page.getByRole('alertdialog', { name: COMPRA.confirmarGuardar.titulo })
    await guardar.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(tituloAgregar(page)).toBeVisible()

    // Ahora sí: guarda y sigue a donde iba, y después de guardar no vuelve a avisar
    await irALista(page)
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.registrar }).click()
    await confirmar(page, COMPRA.confirmarGuardar.confirmar)
    await expect(tituloLista(page)).toBeVisible()
    await expect(aviso(page)).toHaveCount(0)

    // Editar la compra sin cambiar nada: la X cierra sin avisar
    const abrir = () => page.getByRole('button', { name: /Ver compra en Desechables Diver/ }).click()
    await abrir()
    await page.getByRole('dialog').getByRole('button', { name: 'Editar' }).click()
    const edicion = page.getByRole('dialog', { name: 'Editar compra' })
    await edicion.getByRole('button', { name: 'Cerrar' }).click()
    await expect(aviso(page)).toHaveCount(0)
    await expect(edicion).toBeHidden()

    // Con un cambio: la X y Esc avisan, y «Registrar» lo guarda
    await abrir()
    await page.getByRole('dialog').getByRole('button', { name: 'Editar' }).click()
    await edicion.getByRole('spinbutton', { name: 'Cantidad, fila 1' }).fill('3')
    await edicion.getByRole('button', { name: 'Cerrar' }).click()
    await expect(aviso(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(aviso(page)).toHaveCount(0)
    await expect(edicion).toBeVisible()

    await page.keyboard.press('Escape')
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.registrar }).click()
    await confirmar(page, COMPRA.confirmarGuardar.confirmar)
    await expect(page.getByText(COMPRA.actualizada)).toBeVisible()
    await expect(edicion).toBeHidden()

    // Deja la base como estaba
    await abrir()
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
    await confirmar(page, COMPRA.confirmarEliminar.confirmar)
    await expect(page.getByText(COMPRA.eliminada)).toBeVisible()
  })

  test('el botón Atrás del navegador también avisa', async ({ page }) => {
    await irALista(page)
    await page.goBack()
    await expect(tituloAgregar(page)).toBeVisible()
    await page.goForward()
    await expect(tituloLista(page)).toBeVisible()
    await page.goBack()
    await escribirProveedor(page, 'Selectos')

    await page.goForward()
    await expect(aviso(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tituloAgregar(page)).toBeVisible()
    await expect(formulario(page).getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Selectos')
  })

  test('en el Catálogo: Esc, la X y el clic fuera avisan solo si hay cambios; Cancelar conserva su confirmación', async ({ page }) => {
    await page.goto('/catalogo/proveedores')
    const A = PANTALLA_CATALOGO
    await page.getByRole('button', { name: A.agregar('proveedor') }).click()
    const ventana = page.getByRole('dialog', { name: A.tituloNuevo('proveedor') })

    // Sin cambios se cierra sin preguntar
    await page.keyboard.press('Escape')
    await expect(ventana).toBeHidden()
    await expect(aviso(page)).toHaveCount(0)

    await page.getByRole('button', { name: A.agregar('proveedor') }).click()
    await ventana.getByLabel(A.nombre, { exact: true }).fill('Aviso proveedor e2e')
    await ventana.getByRole('button', { name: 'Cerrar' }).click()
    await expect(aviso(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(aviso(page)).toHaveCount(0)
    await expect(ventana.getByLabel(A.nombre, { exact: true })).toHaveValue('Aviso proveedor e2e')

    // Clic fuera de la ventana
    await page.mouse.click(4, 4)
    await expect(aviso(page)).toBeVisible()
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.salir }).click()
    await expect(ventana).toBeHidden()
    await expect(page.getByRole('rowheader', { name: 'Aviso proveedor e2e' })).toHaveCount(0)

    // El botón Cancelar sigue con su propia confirmación, no con el aviso
    await page.getByRole('button', { name: A.agregar('proveedor') }).click()
    await ventana.getByLabel(A.nombre, { exact: true }).fill('Aviso proveedor e2e')
    await ventana.getByRole('button', { name: A.cancelar }).click()
    await expect(aviso(page)).toHaveCount(0)
    await confirmar(page, CONFIRMAR.descartar.confirmar)
    await expect(ventana).toBeHidden()
  })

  test('el editor de usuarios y el de requisitos avisan al cerrarlos con cambios', async ({ page }) => {
    await page.goto('/usuarios')
    await page.getByRole('button', { name: USUARIOS.agregar }).click()
    const usuario = page.getByRole('dialog', { name: USUARIOS.tituloNuevo })
    await usuario.getByLabel(USUARIOS.campos.nombre, { exact: true }).fill('Alguien')
    await page.keyboard.press('Escape')
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.salir }).click()
    await expect(usuario).toBeHidden()

    await page.getByRole('button', { name: USUARIOS.requisitos.editar }).click()
    const requisitos = page.getByRole('dialog', { name: USUARIOS.requisitos.tituloEditor })
    await requisitos.getByLabel(USUARIOS.requisitos.minimo, { exact: true }).fill('12')
    await page.keyboard.press('Escape')
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.salir }).click()
    await expect(requisitos).toBeHidden()
  })

  test('Exportar: con el rango cambiado ofrece «Seguir aquí»; Regresar es una salida más', async ({ page }) => {
    await irALista(page)
    await page.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
    await page.getByRole('menuitem', { name: LISTA_COMPRAS.exportar }).click()
    await expect(page.getByRole('heading', { name: 'Exportar datos', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: EXPORTAR.rangos.ano }).click()
    await page.getByRole('button', { name: 'Regresar' }).click()
    await expect(aviso(page)).toBeVisible()
    await expect(aviso(page).getByRole('button', { name: AVISO_SALIDA.registrar })).toHaveCount(0)
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.seguir }).click()
    await expect(page.getByRole('heading', { name: 'Exportar datos', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Regresar' }).click()
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.salir }).click()
    await expect(tituloLista(page)).toBeVisible()
  })

  test('Cargar: con un archivo elegido sin aplicar, avisa', async ({ page }) => {
    await irALista(page)
    await page.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
    await page.getByRole('menuitem', { name: LISTA_COMPRAS.cargar }).click()
    await expect(page.getByRole('heading', { name: 'Cargar datos', level: 1 })).toBeVisible()

    // Sin archivo, regresar no avisa
    await page.getByRole('button', { name: 'Regresar' }).click()
    await expect(aviso(page)).toHaveCount(0)
    await expect(tituloLista(page)).toBeVisible()

    await page.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
    await page.getByRole('menuitem', { name: LISTA_COMPRAS.cargar }).click()
    const compras = [{
      id: 'archivo-e2e-1', proveedor: 'Archivo e2e', fecha: '2026-10-01', categoria: '',
      materiales: [{ material: 'Azucar', cantidad: 1, unidad: 'lb', monto: 2, categoria: 'Materia Prima', producto: 'Todos' }],
    }]
    await page.getByLabel(CARGAR.archivo).setInputFiles({
      name: 'compras.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(compras)),
    })
    await expect(page.getByText('Archivo e2e')).toBeVisible()

    await page.getByRole('button', { name: 'Regresar' }).click()
    await expect(aviso(page)).toBeVisible()
    await aviso(page).getByRole('button', { name: AVISO_SALIDA.salir }).click()
    await expect(tituloLista(page)).toBeVisible()
  })

  test('Cerrar sesión: el aviso sale antes de su propia confirmación', async ({ page }) => {
    await escribirProveedor(page, 'Selectos')
    await pulsarCerrarSesion(page)
    await expect(aviso(page)).toBeVisible()
    await expect(page.getByRole('alertdialog', { name: CONFIRMAR.cerrarSesion.titulo })).toHaveCount(0)

    await aviso(page).getByRole('button', { name: AVISO_SALIDA.salir }).click()
    await expect(page.getByRole('alertdialog', { name: CONFIRMAR.cerrarSesion.titulo })).toBeVisible()
  })

  test('recargar la página: solo con datos sale la ventana del navegador', async ({ page }) => {
    let ventanas = 0
    page.on('dialog', dialogo => {
      if (dialogo.type() === 'beforeunload') ventanas++
      dialogo.accept()
    })
    await page.reload()
    await expect(tituloAgregar(page)).toBeVisible()
    expect(ventanas).toBe(0)

    await escribirProveedor(page, 'Selectos')
    await page.reload()
    await expect(tituloAgregar(page)).toBeVisible()
    expect(ventanas).toBe(1)
  })
})
