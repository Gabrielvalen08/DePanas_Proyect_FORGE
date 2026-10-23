import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { asignarMaterial, guardarLista } from '../services/api'
import { fechaHoyISO } from '../utils/formato'
import AgregarCompra from './AgregarCompra'
import { ASIGNACION, COMPRA, VALIDACION } from '../utils/mensajes'

// Catálogo de prueba: categoría y producto por material (como en el Excel)
const asignaciones = vi.hoisted(() => new Map())
// Precio unitario de la última compra de cada material (como lo calcula el backend)
const precios = vi.hoisted(() => new Map())
const ASIGNACIONES_INICIALES = [
  ['tocino la rioja', { nombre: 'Tocino La Rioja', categoria: 'Materia Prima', producto: 'Cachitos' }],
  ['pechugas de pollo', { nombre: 'Pechugas de Pollo', categoria: 'Materia Prima', producto: 'Arepas/Empanadas' }],
  ['mr músculo antigrasa', { nombre: 'Mr Músculo Antigrasa', categoria: 'Limpieza', producto: '' }],
]

vi.mock('../services/api', () => {
  const asignacion = m => {
    const a = asignaciones.get((m || '').trim().toLowerCase())
    return a ? { existe: true, ...a } : { existe: false, nombre: (m || '').trim(), categoria: '', producto: '' }
  }
  return {
  guardarLista:         vi.fn(lista => Promise.resolve({ id: 99, ...lista })),
  detectarModo:         () => Promise.resolve('local'),
  exportarDB:           vi.fn(() => Promise.resolve()),
  importarDB:           vi.fn(() => Promise.resolve({ ok: true, nuevas: 1 })),
  exportarJSON:         vi.fn(() => Promise.resolve()),
  importarJSON:         vi.fn(() => Promise.resolve()),
  getProveedores:       () => ['Súper Selectos', 'Walmart'],
  getMateriales:        () => ['Tocino La Rioja', 'Pechugas de Pollo'],
  getCategorias:        () => ['Materia Prima', 'Bebidas', 'Desechables'],
  getProductos:         () => ['Cachitos', 'Arepas/Empanadas', 'Todos'],
  getAsignacion:        asignacion,
  getPrecioSugerido:    m => precios.get((m || '').trim().toLowerCase()) ?? null,
  necesitaAsignacion:   m => Boolean((m || '').trim()) && (!asignacion(m).categoria || !asignacion(m).producto),
  asignarMaterial:      vi.fn(async (nombre, { categoria, producto }) => {
    const previo = asignacion(nombre)
    const material = { nombre: previo.nombre, categoria, producto }
    asignaciones.set(nombre.trim().toLowerCase(), material)
    return { material, materialNuevo: !previo.existe, categoriaNueva: categoria === 'Lácteos', productoNuevo: producto === 'Arepas Rellenas' }
  }),
  }
})

function renderizar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AgregarCompra />
      </ToastProvider>
    </MemoryRouter>
  )
}

const guardarYConfirmar = async usuario => {
  await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
  await usuario.click(await screen.findByRole('button', { name: COMPRA.confirmarGuardar.confirmar }))
}

// Los materiales se agregan después de elegir el proveedor
async function elegirProveedor(usuario, nombre = 'Walmart') {
  const campo = screen.getByRole('combobox', { name: 'Proveedor' })
  if (!campo.value) await usuario.type(campo, nombre)
}

async function llenarFila(usuario, n, { material = 'Tocino La Rioja', cantidad = '2', monto = '3.5' } = {}) {
  await elegirProveedor(usuario)
  await usuario.type(screen.getByRole('combobox', { name: `Artículo, fila ${n}` }), material)
  await usuario.type(screen.getByLabelText(`Cantidad, fila ${n}`), cantidad)
  await usuario.selectOptions(screen.getByLabelText(`Unidad, fila ${n}`), 'kg')
  await usuario.type(screen.getByLabelText(`Precio unitario, fila ${n}`), monto)
}

async function llenarCompraValida(usuario, bloque = document.body) {
  const en = within(bloque)
  await usuario.type(en.getByRole('combobox', { name: 'Proveedor' }), 'Walmart')
  await usuario.type(en.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
  await usuario.type(en.getByLabelText('Cantidad, fila 1'), '2')
  await usuario.selectOptions(en.getByLabelText('Unidad, fila 1'), 'kg')
  await usuario.type(en.getByLabelText('Precio unitario, fila 1'), '3.5')
}

describe('AgregarCompra', () => {
  beforeEach(() => {
    vi.mocked(guardarLista).mockClear()
    vi.mocked(asignarMaterial).mockClear()
    asignaciones.clear()
    precios.clear()
    ASIGNACIONES_INICIALES.forEach(([clave, valor]) => asignaciones.set(clave, valor))
  })

  it('proveedor y fecha van en el encabezado; la fecha arranca en hoy y lo demás en blanco', () => {
    renderizar()
    expect(screen.getByLabelText('Unidad, fila 1')).toHaveValue('')
    expect(screen.getByLabelText('Precio unitario, fila 1')).not.toHaveAttribute('placeholder')
    expect(screen.getByLabelText('Monto, fila 1')).not.toHaveAttribute('placeholder')
    expect(screen.getByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox', { name: 'Proveedor' })).toHaveLength(1)
    expect(screen.getByLabelText('Fecha')).toHaveValue(fechaHoyISO())
  })

  it('no muestra errores al salir de los campos ni al agregar filas antes de guardar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarFila(usuario, 1)
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await usuario.click(screen.getByRole('combobox', { name: 'Artículo, fila 2' }))
    await usuario.tab()

    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 2' })).not.toHaveAttribute('aria-invalid')
  })

  it('tras intentar guardar, el error queda enlazado al campo y desaparece al corregirlo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'Walmart')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const precio = screen.getByLabelText('Precio unitario, fila 1')
    expect(precio).toHaveAccessibleDescription(VALIDACION.precio)
    await usuario.type(precio, '5')
    expect(precio).not.toHaveAttribute('aria-invalid')
  })

  it('las filas que quedaron vacías se ignoran al guardar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await guardarYConfirmar(usuario)

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales).toHaveLength(1)
  })

  it('guardar con errores no muestra un cuadro: marca en rojo cada campo con su mensaje, enfoca el primero y no guarda', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByLabelText('Precio unitario, fila 1'), '5')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    expect(screen.queryByText(/revisa estos campos/i)).not.toBeInTheDocument()
    const proveedor = screen.getByRole('combobox', { name: 'Proveedor' })
    await waitFor(() => expect(proveedor).toHaveFocus())
    expect(proveedor).toHaveAttribute('aria-invalid', 'true')
    expect(proveedor).toHaveAccessibleDescription(VALIDACION.proveedor)
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveAccessibleDescription(VALIDACION.material)
    expect(guardarLista).not.toHaveBeenCalled()
  })

  it('el total suma los montos de las filas', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarFila(usuario, 1) // 2 × $3.50 = $7.00
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await usuario.type(screen.getByLabelText('Cantidad, fila 2'), '4')
    await usuario.type(screen.getByLabelText('Precio unitario, fila 2'), '1.25') // 4 × $1.25 = $5.00
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('7.00')
    expect(screen.getByLabelText('Monto, fila 2')).toHaveValue('5.00')
    expect(screen.getByText('$12.00')).toBeInTheDocument()
  })

  it('guarda la lista, avisa y deja el formulario vacío', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    await guardarYConfirmar(usuario)

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(guardarLista).toHaveBeenCalledWith(expect.objectContaining({
      proveedor: 'Walmart',
      fecha: fechaHoyISO(),
    }))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ cantidad: 2, monto: 7 })
    expect(await screen.findByText(COMPRA.guardada)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue(''))
  })

  it('sin proveedor ni filas con datos, Guardar y Cancelar están deshabilitados', async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.getByRole('button', { name: /guardar compra/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'W')
    expect(screen.getByRole('button', { name: /guardar compra/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
  })

  it('tras un error de datos, Guardar se apaga hasta que se cambie algo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'Walmart')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const guardar = screen.getByRole('button', { name: /guardar compra/i })
    expect(guardar).toBeDisabled()
    expect(guardar).toHaveAccessibleDescription(COMPRA.cambiaParaReintentar)

    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    expect(screen.getByRole('button', { name: /guardar compra/i })).toBeEnabled()
  })

  it('si el servidor rechaza la compra, Guardar se apaga hasta que se cambie algo', async () => {
    vi.mocked(guardarLista).mockRejectedValueOnce(new Error('Fila 1: el monto debe ser mayor a 0'))
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    await guardarYConfirmar(usuario)

    expect(await screen.findByText(COMPRA.errorGuardar('Fila 1: el monto debe ser mayor a 0'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar compra/i })).toBeDisabled()

    await usuario.selectOptions(screen.getByLabelText('Unidad, fila 1'), 'lb')
    expect(screen.getByRole('button', { name: /guardar compra/i })).toBeEnabled()
  })

  it('pide confirmar antes de guardar; Cancelar en la confirmación no guarda', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const confirmacion = await screen.findByRole('alertdialog', { name: COMPRA.confirmarGuardar.titulo })
    expect(within(confirmacion).getByText(COMPRA.confirmarGuardar.mensaje('Walmart', 1, '$7.00'))).toBeInTheDocument()
    expect(guardarLista).not.toHaveBeenCalled()

    await usuario.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))
    expect(guardarLista).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Walmart')
  })

  it('con datos, Cancelar pide confirmar; "Seguir editando" conserva todo y "Sí, cancelar" vacía el formulario', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'Walmart')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    const confirmacion = await screen.findByRole('alertdialog', { name: COMPRA.confirmarCancelar.titulo })
    await usuario.click(within(confirmacion).getByRole('button', { name: COMPRA.confirmarCancelar.volver }))
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue('Walmart')

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    await usuario.click(await screen.findByRole('button', { name: COMPRA.confirmarCancelar.confirmar }))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveValue(''))
  })

  it('"Nueva compra" agrega otro bloque con su propio guardar; cancelar lo quita', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: /nueva compra/i }))

    const segundo = await screen.findByRole('form', { name: 'Detalle de compra 2' })
    expect(within(segundo).getByRole('combobox', { name: 'Proveedor' })).toHaveFocus()
    expect(screen.getAllByRole('button', { name: /guardar compra/i })).toHaveLength(2)

    await usuario.click(within(segundo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Detalle de compra 2' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
  })

  it('al elegir un material trae el precio unitario y la unidad de su última compra, y calcula el monto', async () => {
    precios.set('tocino la rioja', { precio: 1, unidad: 'bolsa' })
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.tab()

    const precio = screen.getByLabelText('Precio unitario, fila 1')
    expect(precio).toHaveValue(1)
    expect(screen.getByLabelText('Unidad, fila 1')).toHaveValue('bolsa')
    expect(precio).toHaveAccessibleDescription(COMPRA.ultimoPrecio('$1.00', 'bolsa'))

    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '5')
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('5.00')
  })

  it('el precio sugerido se puede actualizar y la compra guarda el nuevo monto', async () => {
    precios.set('tocino la rioja', { precio: 1, unidad: 'bolsa' })
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'Walmart')
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.tab()
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '5')

    const precio = screen.getByLabelText('Precio unitario, fila 1')
    await usuario.clear(precio)
    await usuario.type(precio, '1.2') // subió 20 centavos
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('6.00')
    expect(precio).toHaveAccessibleDescription(COMPRA.ultimoPrecio('$1.00', 'bolsa')) // se sigue viendo el anterior

    await guardarYConfirmar(usuario)
    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({
      material: 'Tocino La Rioja', cantidad: 5, unidad: 'bolsa', monto: 6,
    })
  })

  it('un precio escrito a mano no se pisa al volver a salir del material', async () => {
    precios.set('tocino la rioja', { precio: 1, unidad: 'bolsa' })
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    const material = screen.getByRole('combobox', { name: 'Artículo, fila 1' })
    await usuario.type(material, 'Tocino La Rioja')
    await usuario.tab()
    const precio = screen.getByLabelText('Precio unitario, fila 1')
    await usuario.clear(precio)
    await usuario.type(precio, '3')
    await usuario.click(material)
    await usuario.tab()
    expect(precio).toHaveValue(3)
  })

  it('un material sin compras previas deja el precio vacío y sin sugerencia', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.tab()
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue(null)
    expect(screen.getByLabelText('Precio unitario, fila 1')).not.toHaveAccessibleDescription(/Última compra/)
  })

  it('sin proveedor, escribir un material avisa que primero se elige el proveedor y lo enfoca', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'T') // el foco pasa al proveedor

    const proveedor = screen.getByRole('combobox', { name: 'Proveedor' })
    expect(proveedor).toHaveFocus()
    expect(proveedor).toHaveAccessibleDescription(VALIDACION.proveedorPrimero)
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveValue('')

    await usuario.type(proveedor, 'Walmart')
    expect(proveedor).not.toHaveAttribute('aria-invalid')
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'T')
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveValue('T')
  })

  it('no deja agregar otra fila mientras la última esté incompleta, y explica por qué', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    const agregar = screen.getByRole('button', { name: /agregar otra fila/i })
    expect(agregar).toBeDisabled()
    expect(agregar).toHaveAccessibleDescription(VALIDACION.filaIncompleta)

    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    await usuario.selectOptions(screen.getByLabelText('Unidad, fila 1'), 'kg')
    expect(agregar).toBeDisabled()

    await usuario.type(screen.getByLabelText('Precio unitario, fila 1'), '3.5')
    expect(agregar).toBeEnabled()
    await usuario.click(agregar)
    expect(screen.getByRole('button', { name: /agregar otra fila/i })).toBeDisabled()
  })

  it('agregar fila lleva el foco a su Material; nunca quedan menos de 1', async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.getByRole('button', { name: 'Eliminar fila 1' })).toBeDisabled()
    await llenarFila(usuario, 1)
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 2' })).toHaveFocus()
  })

  it('guarda la categoría y el producto de cada material y los muestra bajo el campo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveAccessibleDescription('Materia Prima · Cachitos')
    await guardarYConfirmar(usuario)

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({
      material: 'Tocino La Rioja', categoria: 'Materia Prima', producto: 'Cachitos',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('un material nuevo abre la ventana: se elige la categoría, se agrega un producto nuevo y se confirma', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Harina PAN')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    expect(within(ventana).getByText(ASIGNACION.descripcionNuevo('Harina PAN'))).toBeInTheDocument()
    expect(within(ventana).getByRole('textbox', { name: 'Buscar o agregar categoría' })).toHaveFocus()

    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    expect(within(ventana).getByRole('button', { name: /Materia Prima/ })).toHaveAttribute('aria-pressed', 'true')

    await usuario.type(within(ventana).getByRole('textbox', { name: 'Buscar o agregar producto' }), 'Arepas Rellenas')
    expect(within(ventana).getByText(ASIGNACION.noExiste('Arepas Rellenas', false))).toBeInTheDocument()
    await usuario.click(within(ventana).getByRole('button', { name: 'Agregar «Arepas Rellenas»' }))
    expect(within(ventana).getByRole('button', { name: /Arepas Rellenas/ })).toHaveAttribute('aria-pressed', 'true')

    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(asignarMaterial).toHaveBeenCalledWith('Harina PAN', { categoria: 'Materia Prima', producto: 'Arepas Rellenas' })
    expect(await screen.findByText('¡Anotado! «Harina PAN» va a Materia Prima · Arepas Rellenas. Ya quedó en el catálogo. Y estrenamos el producto «Arepas Rellenas».')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('si el material ya tiene categoría, la ventana solo pide el producto', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Mr Músculo Antigrasa')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloExistente })
    expect(within(ventana).queryByRole('group', { name: 'Categoría' })).not.toBeInTheDocument()
    expect(within(ventana).getByRole('group', { name: 'Producto' })).toBeInTheDocument()
    expect(within(ventana).getByText('Limpieza')).toBeInTheDocument()
  })

  it('pide elegir antes de guardar la asignación', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Sal')
    await usuario.tab()
    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(within(ventana).getByText(ASIGNACION.faltaCategoria)).toBeInTheDocument()
    expect(asignarMaterial).not.toHaveBeenCalled()
  })

  it('al guardar la compra con un material sin asignar, lo pide y después guarda la compra', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    const material = screen.getByRole('combobox', { name: 'Artículo, fila 1' })
    await usuario.clear(material)
    await usuario.type(material, 'Queso')
    await usuario.keyboard('{Escape}')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(ventana).getByRole('button', { name: 'Ahora no' }))
    expect(await screen.findByText(COMPRA.faltaAsignacion('Queso'))).toBeInTheDocument()
    expect(guardarLista).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const otra = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(otra).getByRole('button', { name: 'Bebidas' }))
    await usuario.click(within(otra).getByRole('button', { name: 'Todos' }))
    await usuario.click(within(otra).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: COMPRA.confirmarGuardar.confirmar }))

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ material: 'Queso', categoria: 'Bebidas', producto: 'Todos' })
  })
})
