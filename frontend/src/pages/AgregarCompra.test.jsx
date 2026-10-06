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

async function llenarCompraValida(usuario, bloque = document.body) {
  const en = within(bloque)
  await usuario.type(en.getByRole('combobox', { name: 'Proveedor' }), 'Walmart')
  await usuario.type(en.getByRole('combobox', { name: 'Material, fila 1' }), 'Tocino La Rioja')
  await usuario.type(en.getByLabelText('Cantidad, fila 1'), '2')
  await usuario.selectOptions(en.getByLabelText('Unidad, fila 1'), 'kg')
  await usuario.type(en.getByLabelText('Precio, fila 1'), '3.5')
}

describe('AgregarCompra', () => {
  beforeEach(() => {
    vi.mocked(guardarLista).mockClear()
    vi.mocked(asignarMaterial).mockClear()
    asignaciones.clear()
    ASIGNACIONES_INICIALES.forEach(([clave, valor]) => asignaciones.set(clave, valor))
  })

  it('proveedor y fecha van en el encabezado; la fecha arranca en hoy', () => {
    renderizar()
    expect(screen.getByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox', { name: 'Proveedor' })).toHaveLength(1)
    expect(screen.getByLabelText('Fecha')).toHaveValue(fechaHoyISO())
  })

  it('no muestra errores al salir de los campos ni al agregar filas antes de guardar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('combobox', { name: 'Material, fila 1' }))
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await usuario.tab()

    expect(screen.queryByRole('alert', { name: VALIDACION.resumen })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Material, fila 1' })).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('combobox', { name: 'Material, fila 2' })).not.toHaveAttribute('aria-invalid')
  })

  it('tras intentar guardar, el error queda enlazado al campo y desaparece al corregirlo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const precio = screen.getByLabelText('Precio, fila 1')
    expect(precio).toHaveAccessibleDescription(VALIDACION.precio)
    await usuario.type(precio, '5')
    expect(precio).not.toHaveAttribute('aria-invalid')
  })

  it('las filas que quedaron vacías se ignoran al guardar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales).toHaveLength(1)
    expect(screen.queryByRole('alert', { name: VALIDACION.resumen })).not.toBeInTheDocument()
  })

  it('guardar con errores muestra el resumen con foco y no guarda', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const resumen = await screen.findByRole('alert', { name: VALIDACION.resumen })
    await waitFor(() => expect(resumen).toHaveFocus())
    const enlace = within(resumen).getByRole('link', { name: `Proveedor: ${VALIDACION.proveedor}` })
    await usuario.click(enlace)
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveFocus()
    expect(guardarLista).not.toHaveBeenCalled()
  })

  it('el total suma los montos de las filas', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByLabelText('Precio, fila 1'), '3.5')
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    await usuario.type(screen.getByLabelText('Precio, fila 2'), '1.25')
    expect(screen.getByText('$4.75')).toBeInTheDocument()
  })

  it('guarda la lista, avisa y deja el formulario vacío', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(guardarLista).toHaveBeenCalledWith(expect.objectContaining({
      proveedor: 'Walmart',
      fecha: fechaHoyISO(),
    }))
    expect(await screen.findByText(COMPRA.guardada('Walmart', 1))).toBeInTheDocument()
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

  it('agregar fila lleva el foco a su Material; nunca quedan menos de 1', async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.getByRole('button', { name: 'Eliminar fila 1' })).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    expect(screen.getByRole('combobox', { name: 'Material, fila 2' })).toHaveFocus()
  })

  it('guarda la categoría y el producto de cada material y los muestra bajo el campo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    expect(screen.getByRole('combobox', { name: 'Material, fila 1' })).toHaveAccessibleDescription('Materia Prima · Cachitos')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({
      material: 'Tocino La Rioja', categoria: 'Materia Prima', producto: 'Cachitos',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('un material nuevo abre la ventana: se elige la categoría, se agrega un producto nuevo y se confirma', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Material, fila 1' }), 'Harina PAN')
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
    await usuario.type(screen.getByRole('combobox', { name: 'Material, fila 1' }), 'Mr Músculo Antigrasa')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloExistente })
    expect(within(ventana).queryByRole('group', { name: 'Categoría' })).not.toBeInTheDocument()
    expect(within(ventana).getByRole('group', { name: 'Producto' })).toBeInTheDocument()
    expect(within(ventana).getByText('Limpieza')).toBeInTheDocument()
  })

  it('pide elegir antes de guardar la asignación', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Material, fila 1' }), 'Sal')
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
    const material = screen.getByRole('combobox', { name: 'Material, fila 1' })
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

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ material: 'Queso', categoria: 'Bebidas', producto: 'Todos' })
  })
})
