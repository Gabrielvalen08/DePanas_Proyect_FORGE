import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { asignarMaterial, editarEnCatalogo, guardarLista } from '../services/api'
import { fechaHoyISO } from '../utils/formato'
import AgregarCompra from './AgregarCompra'
import BloqueCompra from '../components/BloqueCompra'
import { EVENTO_ARTICULO_RENOMBRADO } from '../utils/eventos'
import { ASIGNACION, COMPRA, CONFIRMAR, VALIDACION } from '../utils/mensajes'

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
    // Un artículo puede ir en varios productos: «Arepas, Empanadas»
    return a
      ? { existe: true, ...a, productos: a.producto ? a.producto.split(', ') : [] }
      : { existe: false, nombre: (m || '').trim(), categoria: '', producto: '', productos: [] }
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
  getMaterialesPorProveedor: () => ['Tocino La Rioja', 'Pechugas de Pollo'],
  getCategoriasDeProveedor: proveedor => (proveedor === 'Walmart' ? ['Limpieza'] : []),
  getCategorias:        () => ['Materia Prima', 'Bebidas', 'Desechables'],
  getProductos:         () => ['Cachitos', 'Arepas/Empanadas', 'Todos'],
  getAsignacion:        asignacion,
  getPrecioSugerido:    m => precios.get((m || '').trim().toLowerCase()) ?? null,
  necesitaAsignacion:   m => Boolean((m || '').trim()) && (!asignacion(m).categoria || !asignacion(m).producto),
  asignarMaterial:      vi.fn(async (nombre, { categoria, productos }) => {
    const previo = asignacion(nombre)
    const material = { nombre: previo.nombre, categoria, producto: productos.join(', ') }
    asignaciones.set(nombre.trim().toLowerCase(), material)
    const productosNuevos = productos.filter(p => p === 'Arepas Rellenas')
    return { material, materialNuevo: !previo.existe, categoriaNueva: categoria === 'Lácteos', productoNuevo: productosNuevos.length > 0, productosNuevos }
  }),
  getComprasDeMaterial: m => ((m || '').trim().toLowerCase() === 'tocino la rioja' ? 3 : 0),
  editarEnCatalogo:     vi.fn(async (_tipo, anterior, { nombre, categoria, productos }) => {
    const producto = productos.join(', ')
    asignaciones.delete(anterior.trim().toLowerCase())
    asignaciones.set(nombre.trim().toLowerCase(), { nombre, categoria, producto })
    return { anterior, nombre, categoria, producto, productos, compras: 3, categoriaNueva: false, productosNuevos: [] }
  }),
  }
})

function renderizar(props) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AgregarCompra {...props} />
      </ToastProvider>
    </MemoryRouter>
  )
}

/** Guarda el formulario del artículo y confirma el resumen */
async function guardarArticulo(usuario, ventana) {
  await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))
  await usuario.click(await screen.findByRole('button', { name: ASIGNACION.confirmar.confirmar }))
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

async function llenarFila(usuario, n, { material = 'Tocino La Rioja', cantidad = '2', monto = '350' } = {}) {
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
  await usuario.type(en.getByLabelText('Precio unitario, fila 1'), '350')
}

describe('AgregarCompra', () => {
  beforeEach(() => {
    vi.mocked(guardarLista).mockClear()
    vi.mocked(asignarMaterial).mockClear()
    vi.mocked(editarEnCatalogo).mockClear()
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
    await usuario.type(screen.getByLabelText('Precio unitario, fila 2'), '125') // cajero: 1-2-5 → $1.25; 4 × $1.25 = $5.00
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('7.00')
    expect(screen.getByLabelText('Monto, fila 2')).toHaveValue('5.00')
    expect(screen.getByText('$12.00')).toBeInTheDocument()
  })

  it('al escribir el monto calcula el precio unitario y guarda el monto exacto', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '3')
    await usuario.selectOptions(screen.getByLabelText('Unidad, fila 1'), 'kg')
    await usuario.type(screen.getByLabelText('Monto, fila 1'), '1000') // cajero: $10.00

    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('3.33')
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('10.00')

    await guardarYConfirmar(usuario)
    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ cantidad: 3, monto: 10 })
  })

  it('al cambiar la cantidad se mantiene el último escrito: el monto o el precio', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const cantidad = screen.getByLabelText('Cantidad, fila 1')
    const precio = screen.getByLabelText('Precio unitario, fila 1')
    const monto = screen.getByLabelText('Monto, fila 1')
    await usuario.type(cantidad, '2')

    await usuario.type(monto, '1000') // $10.00: queda el monto y cambia el precio
    expect(precio).toHaveValue('5.00')
    await usuario.clear(cantidad)
    await usuario.type(cantidad, '4')
    expect(monto).toHaveValue('10.00')
    expect(precio).toHaveValue('2.50')

    await usuario.clear(precio)
    await usuario.type(precio, '300') // $3.00: queda el precio y cambia el monto
    expect(monto).toHaveValue('12.00')
    await usuario.clear(cantidad)
    await usuario.type(cantidad, '5')
    expect(precio).toHaveValue('3.00')
    expect(monto).toHaveValue('15.00')
  })

  it('un monto escrito antes de la cantidad se conserva y el precio sale al poner la cantidad', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const precio = screen.getByLabelText('Precio unitario, fila 1')
    await usuario.type(screen.getByLabelText('Monto, fila 1'), '800')
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('8.00')
    expect(precio).toHaveValue('')

    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    expect(precio).toHaveValue('4.00')
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('8.00')
  })

  it('borrar un monto escrito limpia también el precio', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    await usuario.type(screen.getByLabelText('Monto, fila 1'), '800')
    await usuario.clear(screen.getByLabelText('Monto, fila 1'))

    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('')
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('')
  })

  it('el error de precio se quita al escribir un monto válido', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'Walmart')
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const precio = screen.getByLabelText('Precio unitario, fila 1')
    expect(precio).toHaveAccessibleDescription(VALIDACION.precio)

    await usuario.type(screen.getByLabelText('Monto, fila 1'), '800')
    expect(precio).not.toHaveAttribute('aria-invalid')
  })

  it('el precio sugerido no reemplaza un monto escrito a mano', async () => {
    precios.set('tocino la rioja', { precio: 1, unidad: 'bolsa' })
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByLabelText('Monto, fila 1'), '800')
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.tab()

    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('8.00')
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('')
  })

  it('una compra guardada conserva su monto hasta que se toque, y su cantidad recalcula como antes', async () => {
    const usuario = userEvent.setup()
    render(
      <ToastProvider>
        <BloqueCompra
          inicial={{ proveedor: 'Walmart', fecha: '2026-10-01', materiales: [{ material: 'Tocino La Rioja', cantidad: 3, unidad: 'kg', monto: 10 }] }}
          alGuardar={vi.fn()}
        />
      </ToastProvider>
    )
    const monto = screen.getByLabelText('Monto, fila 1')
    expect(monto).toHaveValue('10.00')
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('3.33')

    const cantidad = screen.getByLabelText('Cantidad, fila 1')
    await usuario.clear(cantidad)
    await usuario.type(cantidad, '6')
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('3.33')
    expect(monto).toHaveValue('20.00') // 6 × 3.3333

    await usuario.clear(monto)
    await usuario.type(monto, '1800')
    expect(monto).toHaveValue('18.00')
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('3.00')
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
    expect(confirmacion).toHaveTextContent('Se guardará la compra en Walmart con 1 artículo por $7.00.')
    // La cantidad de artículos y el total van en negrita; el resto, no
    expect(within(confirmacion).getByText('1 artículo').tagName).toBe('STRONG')
    expect(within(confirmacion).getByText('$7.00').tagName).toBe('STRONG')
    expect(confirmacion.querySelectorAll('strong')).toHaveLength(2)
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
    expect(precio).toHaveValue('1.00')
    expect(screen.getByLabelText('Unidad, fila 1')).toHaveValue('bolsa')
    expect(precio).not.toHaveAccessibleDescription() // el precio ya se ve: sin mensaje debajo
    expect(screen.queryByText(/Última compra/)).not.toBeInTheDocument()

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
    await usuario.type(precio, '120') // subió 20 centavos: 1-2-0 → $1.20
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('6.00')

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
    await usuario.type(precio, '300')
    await usuario.click(material)
    await usuario.tab()
    expect(precio).toHaveValue('3.00')
  })

  it('un material sin compras previas deja el precio vacío y sin sugerencia', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.tab()
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('')
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

    await usuario.type(screen.getByLabelText('Precio unitario, fila 1'), '350')
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

  it('guarda la categoría y el producto de cada material y los deja en un tooltip, sin ocupar espacio en la fila', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveAccessibleDescription('Materia Prima · Cachitos')
    expect(screen.getByText('Materia Prima · Cachitos')).toHaveClass('solo-lector')
    expect(screen.getByTitle('Materia Prima · Cachitos')).toBeInTheDocument()
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
    // El nombre viene de lo escrito en la fila; sin los mensajes de antes
    expect(within(ventana).getByRole('group', { name: ASIGNACION.etiquetaArticulo })).toBeInTheDocument()
    expect(within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })).toHaveValue('Harina PAN')
    expect(within(ventana).queryByText(/es nuevo por aquí/)).not.toBeInTheDocument()
    expect(within(ventana).queryByText(/Primero van las categorías/)).not.toBeInTheDocument()
    expect(within(ventana).getByRole('textbox', { name: 'Buscar o agregar categoría' })).toHaveFocus()
    // Las categorías que ya surte el proveedor van primero
    const categorias = within(within(ventana).getByRole('group', { name: 'Categoría' })).getAllByRole('button')
    expect(categorias[0]).toHaveTextContent('Limpieza')

    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    expect(within(ventana).getByRole('button', { name: /Materia Prima/ })).toHaveAttribute('aria-pressed', 'true')

    await usuario.type(within(ventana).getByRole('textbox', { name: 'Buscar o agregar producto' }), 'Arepas Rellenas')
    expect(within(ventana).getByText(ASIGNACION.noExiste('Arepas Rellenas', false))).toBeInTheDocument()
    await usuario.click(within(ventana).getByRole('button', { name: 'Agregar «Arepas Rellenas»' }))
    expect(within(ventana).getByRole('button', { name: /Arepas Rellenas/ })).toHaveAttribute('aria-pressed', 'true')

    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))
    // Antes de guardar se confirma, con un resumen de lo que se va a hacer
    expect(asignarMaterial).not.toHaveBeenCalled()
    expect(await screen.findByText('Se agregará «Harina PAN» al catálogo, en Materia Prima · Arepas Rellenas.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: ASIGNACION.confirmar.confirmar }))
    await waitFor(() => expect(asignarMaterial).toHaveBeenCalledWith('Harina PAN', { categoria: 'Materia Prima', productos: ['Arepas Rellenas'], proveedor: 'Walmart', nuevo: true }))
    expect(await screen.findByText('¡Anotado! «Harina PAN» va a Materia Prima · Arepas Rellenas. Ya quedó en el catálogo. Y estrenamos el producto «Arepas Rellenas».')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('sin permiso de editar, la ventana solo pide lo que le falta al artículo', async () => {
    const usuario = userEvent.setup()
    renderizar({ puedeEditarArticulo: false })
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Mr Músculo Antigrasa')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloExistente })
    expect(within(ventana).queryByRole('textbox', { name: ASIGNACION.nombreArticulo })).not.toBeInTheDocument()
    expect(within(ventana).queryByRole('group', { name: 'Categoría' })).not.toBeInTheDocument()
    expect(within(ventana).getByRole('group', { name: 'Productos' })).toBeInTheDocument()
    expect(within(ventana).getByText('Limpieza')).toBeInTheDocument()

    await usuario.click(within(ventana).getByRole('button', { name: 'Cachitos' }))
    await guardarArticulo(usuario, ventana)
    await waitFor(() => expect(asignarMaterial).toHaveBeenCalledWith('Mr Músculo Antigrasa', { categoria: 'Limpieza', productos: ['Cachitos'], proveedor: 'Walmart' }))
    expect(editarEnCatalogo).not.toHaveBeenCalled()
  })

  it('con permiso, a un artículo incompleto se le ve todo lleno y se le puede cambiar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Mr Músculo Antigrasa')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloExistente })
    expect(within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })).toHaveValue('Mr Músculo Antigrasa')
    expect(within(ventana).getByRole('button', { name: /Limpieza/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('un artículo nuevo puede ir en varios productos: se eligen varios y la compra los guarda todos', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Harina PAN')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await usuario.click(within(ventana).getByRole('button', { name: 'Cachitos' }))
    await usuario.click(within(ventana).getByRole('button', { name: 'Arepas/Empanadas' }))
    expect(within(ventana).getByRole('button', { name: /Cachitos/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(ventana).getByRole('button', { name: /Arepas\/Empanadas/ })).toHaveAttribute('aria-pressed', 'true')
    // Un segundo clic lo quita
    await usuario.click(within(ventana).getByRole('button', { name: /Cachitos/ }))
    expect(within(ventana).getByRole('button', { name: 'Cachitos' })).toHaveAttribute('aria-pressed', 'false')
    await usuario.click(within(ventana).getByRole('button', { name: 'Cachitos' }))

    await guardarArticulo(usuario, ventana)
    await waitFor(() => expect(asignarMaterial).toHaveBeenCalledWith('Harina PAN', { categoria: 'Materia Prima', productos: ['Arepas/Empanadas', 'Cachitos'], proveedor: 'Walmart', nuevo: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveAccessibleDescription('Materia Prima · Arepas/Empanadas, Cachitos')
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
    await guardarArticulo(usuario, otra)
    // Al quedar asignado, sigue la confirmación de la compra
    const confirmarCompra = await screen.findByRole('alertdialog', { name: COMPRA.confirmarGuardar.titulo })
    await usuario.click(within(confirmarCompra).getByRole('button', { name: COMPRA.confirmarGuardar.confirmar }))

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ material: 'Queso', categoria: 'Bebidas', producto: 'Todos' })
  })

  it('con el campo vacío, el «+» abre un formulario en blanco y lo creado queda en la fila', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarArticulo('') }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    const nombre = within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    expect(nombre).toHaveValue('')
    expect(nombre).toHaveFocus()

    // Sin nombre no se guarda
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))
    expect(nombre).toHaveAccessibleDescription(ASIGNACION.faltaNombre)

    await usuario.type(nombre, 'Sal de mar')
    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await usuario.click(within(ventana).getByRole('button', { name: 'Cachitos' }))
    await guardarArticulo(usuario, ventana)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(asignarMaterial).toHaveBeenCalledWith('Sal de mar', { categoria: 'Materia Prima', productos: ['Cachitos'], proveedor: 'Walmart', nuevo: true })
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveValue('Sal de mar')
  })

  it('el «+» con el campo vacío y sin proveedor pide el proveedor primero', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const boton = screen.getByRole('button', { name: COMPRA.agregarArticulo('') })
    expect(boton).toBeEnabled()
    await usuario.click(boton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveAccessibleDescription(VALIDACION.proveedorPrimero)
  })

  it('con un artículo no registrado, el «+» abre una sola ventana con el nombre escrito, y se puede cambiar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Harina Nueva')

    const boton = screen.getByRole('button', { name: COMPRA.agregarArticulo('Harina Nueva') })
    expect(boton).toBeEnabled()
    await usuario.click(boton)

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const nombre = within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    expect(nombre).toHaveValue('Harina Nueva')

    await usuario.clear(nombre)
    await usuario.type(nombre, 'Harina Especial')
    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await usuario.click(within(ventana).getByRole('button', { name: 'Cachitos' }))
    await guardarArticulo(usuario, ventana)

    await waitFor(() => expect(asignarMaterial).toHaveBeenCalledWith('Harina Especial', { categoria: 'Materia Prima', productos: ['Cachitos'], proveedor: 'Walmart', nuevo: true }))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveValue('Harina Especial'))
  })

  it('no deja crear un artículo con el nombre de otro ya registrado', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarArticulo('') }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    const nombre = within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    await usuario.type(nombre, 'tocino la rioja')
    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await usuario.click(within(ventana).getByRole('button', { name: 'Cachitos' }))
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))

    expect(nombre).toHaveAccessibleDescription(ASIGNACION.yaExiste('Tocino La Rioja'))
    expect(asignarMaterial).not.toHaveBeenCalled()
  })

  it('con un artículo registrado sale el lápiz: todo viene lleno y renombrar actualiza la fila', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    expect(screen.queryByRole('button', { name: /Agregar artículo nuevo/ })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: COMPRA.editarArticulo('Tocino La Rioja') }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloEditar })
    const nombre = within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    expect(nombre).toHaveValue('Tocino La Rioja')
    expect(within(ventana).getByRole('button', { name: /Materia Prima/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(ventana).getByRole('button', { name: /Cachitos/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(ventana).getByRole('button', { name: ASIGNACION.cancelar })).toBeInTheDocument()

    await usuario.clear(nombre)
    await usuario.type(nombre, 'Tocino Ahumado')
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))
    // La confirmación dice qué va a pasar y cuántas compras toca
    expect(await screen.findByText('«Tocino La Rioja» pasará a llamarse «Tocino Ahumado». «Tocino Ahumado» quedará en Materia Prima · Cachitos. También se actualizará en 3 compras.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: ASIGNACION.confirmar.confirmar }))

    await waitFor(() => expect(editarEnCatalogo).toHaveBeenCalledWith('material', 'Tocino La Rioja', {
      nombre: 'Tocino Ahumado', categoria: 'Materia Prima', productos: ['Cachitos'], proveedor: 'Walmart',
    }))
    expect(await screen.findByText('¡Chévere! «Tocino La Rioja» ahora se llama «Tocino Ahumado» y va a Materia Prima · Cachitos. Se actualizó en 3 compras.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveValue('Tocino Ahumado')
    expect(asignarMaterial).not.toHaveBeenCalled()
  })

  it('con el lápiz y sin cambios, Guardar cierra sin confirmar ni guardar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.click(screen.getByRole('button', { name: COMPRA.editarArticulo('Tocino La Rioja') }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloEditar })
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(editarEnCatalogo).not.toHaveBeenCalled()
  })

  it('con el lápiz y con cambios, Cancelar pide confirmar antes de descartar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.click(screen.getByRole('button', { name: COMPRA.editarArticulo('Tocino La Rioja') }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloEditar })
    await usuario.type(within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo }), ' 2')
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.cancelar }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.descartar.confirmar }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(editarEnCatalogo).not.toHaveBeenCalled()
  })

  it('si el servidor rechaza el nombre, el error se marca en el campo y la ventana sigue abierta', async () => {
    vi.mocked(editarEnCatalogo).mockRejectedValueOnce(Object.assign(new Error('Ya existe un artículo llamado «Sal»'), { campo: 'nombre' }))
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.click(screen.getByRole('button', { name: COMPRA.editarArticulo('Tocino La Rioja') }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloEditar })
    const nombre = within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Sal')
    await guardarArticulo(usuario, ventana)

    await waitFor(() => expect(nombre).toHaveAccessibleDescription('Ya existe un artículo llamado «Sal»'))
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveValue('Tocino La Rioja')
  })

  it('al renombrar un artículo, las otras compras abiertas con ese artículo también cambian', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: /nueva compra/i }))
    const combos = screen.getAllByRole('combobox', { name: 'Proveedor' })
    await usuario.type(combos[1], 'Walmart')
    const otraFila = screen.getAllByRole('combobox', { name: 'Artículo, fila 1' })[1]
    await usuario.type(otraFila, 'Tocino La Rioja')

    window.dispatchEvent(new CustomEvent(EVENTO_ARTICULO_RENOMBRADO, { detail: { anterior: 'Tocino La Rioja', nombre: 'Tocino Ahumado' } }))
    await waitFor(() => expect(otraFila).toHaveValue('Tocino Ahumado'))
  })

  it('sin permiso de editar, el lápiz de un artículo completo sale apagado', async () => {
    const usuario = userEvent.setup()
    renderizar({ puedeEditarArticulo: false })
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    expect(screen.getByRole('button', { name: COMPRA.sinPermisoEditarArticulo('Tocino La Rioja') })).toBeDisabled()
  })

  it('sin permiso de editar, el «+» sigue creando artículos nuevos', async () => {
    const usuario = userEvent.setup()
    renderizar({ puedeEditarArticulo: false })
    await elegirProveedor(usuario)
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarArticulo('') }))
    expect(await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })).toBeInTheDocument()
  })

  it('si se descarta la asignación ("Ahora no"), aparece el botón "+" para reabrirla y muestra el proveedor', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    const material = screen.getByRole('combobox', { name: 'Artículo, fila 1' })
    await usuario.type(material, 'Harina Nueva')
    await usuario.tab()

    // Se abre la ventana emergente
    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    // Muestra el proveedor seleccionado
    expect(within(ventana).getByText(/Proveedor:/)).toBeInTheDocument()
    expect(within(ventana).getByText('Walmart')).toBeInTheDocument()

    // Omitimos la asignación ("Ahora no")
    await usuario.click(within(ventana).getByRole('button', { name: 'Ahora no' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Aparece el botón '+' al lado del material
    const botonReabrir = screen.getByRole('button', { name: COMPRA.agregarArticulo('Harina Nueva') })
    expect(botonReabrir).toBeInTheDocument()

    // Al hacer clic en '+', se vuelve a abrir la ventana emergente
    await usuario.click(botonReabrir)
    expect(await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })).toBeInTheDocument()
  })
})
