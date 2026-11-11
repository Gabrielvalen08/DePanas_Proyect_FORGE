import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { asignarMaterial, editarEnCatalogo, guardarLista } from '../services/api'
import { fechaHoyISO } from '../utils/formato'
import AgregarCompra from './AgregarCompra'
import BloqueCompra from '../components/BloqueCompra'
import { EVENTO_ARTICULO_RENOMBRADO } from '../utils/eventos'
import { ASIGNACION, COMPRA, CONFIRMAR, NOMBRE_PARECIDO, VALIDACION } from '../utils/mensajes'

// Catálogo de prueba: categoría y producto por material (como en el Excel)
const asignaciones = vi.hoisted(() => new Map())
// Precio unitario de la última compra de cada material (como lo calcula el backend)
const precios = vi.hoisted(() => new Map())
// En cuántas compras guardadas está cada artículo
const comprasPorArticulo = vi.hoisted(() => new Map())
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
  getIvaPorProveedor:   () => false,
  necesitaAsignacion:   m => Boolean((m || '').trim()) && (!asignacion(m).categoria || !asignacion(m).producto) && !comprasPorArticulo.get(m.trim().toLowerCase()),
  asignarMaterial:      vi.fn(async (nombre, { categoria, productos }) => {
    const previo = asignacion(nombre)
    const material = { nombre: previo.nombre, categoria, producto: productos.join(', ') }
    asignaciones.set(nombre.trim().toLowerCase(), material)
    const productosNuevos = productos.filter(p => p === 'Arepas Rellenas')
    return { material, materialNuevo: !previo.existe, categoriaNueva: categoria === 'Lácteos', productoNuevo: productosNuevos.length > 0, productosNuevos }
  }),
  getComprasDeMaterial: m => comprasPorArticulo.get((m || '').trim().toLowerCase()) ?? 0,
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

/** Fila 1 completa y una fila 2 vacía, para probar lo que pasa con una fila a medias */
async function llenarFilaYAgregarOtra(usuario) {
  await llenarFila(usuario, 1)
  await usuario.click(screen.getByRole('button', { name: COMPRA.agregarFila }))
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
    comprasPorArticulo.clear()
    comprasPorArticulo.set('tocino la rioja', 3)
    ASIGNACIONES_INICIALES.forEach(([clave, valor]) => asignaciones.set(clave, valor))
  })

  it('proveedor y fecha van en el encabezado; la fecha arranca en hoy y lo demás en blanco', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
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
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarFila }))
    await usuario.click(screen.getByRole('combobox', { name: 'Artículo, fila 2' }))
    await usuario.tab()

    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 2' })).not.toHaveAttribute('aria-invalid')
  })

  it('tras intentar guardar, el error queda enlazado al campo y desaparece al corregirlo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarFilaYAgregarOtra(usuario)
    await usuario.type(screen.getByLabelText('Cantidad, fila 2'), '2')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const precio = screen.getByLabelText('Precio unitario, fila 2')
    expect(precio).toHaveAccessibleDescription(VALIDACION.precio)
    await usuario.type(precio, '5')
    expect(precio).not.toHaveAttribute('aria-invalid')
  })

  it('las filas que quedaron vacías se ignoran al guardar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarFila }))
    await guardarYConfirmar(usuario)

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales).toHaveLength(1)
  })

  it('guardar con errores no muestra un cuadro: marca en rojo cada campo con su mensaje, enfoca el primero y no guarda', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarFilaYAgregarOtra(usuario)
    await usuario.type(screen.getByLabelText('Precio unitario, fila 2'), '5')
    await usuario.clear(screen.getByRole('combobox', { name: 'Proveedor' }))
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    expect(screen.queryByText(/revisa estos campos/i)).not.toBeInTheDocument()
    const proveedor = screen.getByRole('combobox', { name: 'Proveedor' })
    await waitFor(() => expect(proveedor).toHaveFocus())
    expect(proveedor).toHaveAttribute('aria-invalid', 'true')
    expect(proveedor).toHaveAccessibleDescription(VALIDACION.proveedor)
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 2' })).toHaveAccessibleDescription(VALIDACION.material)
    expect(guardarLista).not.toHaveBeenCalled()
  })

  it('el total suma los montos de las filas', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarFila(usuario, 1) // 2 × $3.50 = $7.00
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarFila }))
    await usuario.type(screen.getByLabelText('Cantidad, fila 2'), '4')
    await usuario.type(screen.getByLabelText('Precio unitario, fila 2'), '125') // cajero: 1-2-5 → $1.25; 4 × $1.25 = $5.00
    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('7.00')
    expect(screen.getByLabelText('Monto, fila 2')).toHaveValue('5.00')
    expect(screen.getAllByText('$12.00')).toHaveLength(2) // subtotal y total (sin IVA)
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
    await elegirProveedor(usuario)
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
    await elegirProveedor(usuario)
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
    await elegirProveedor(usuario)
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    await usuario.type(screen.getByLabelText('Monto, fila 1'), '800')
    await usuario.clear(screen.getByLabelText('Monto, fila 1'))

    expect(screen.getByLabelText('Monto, fila 1')).toHaveValue('')
    expect(screen.getByLabelText('Precio unitario, fila 1')).toHaveValue('')
  })

  it('el error de precio se quita al escribir un monto válido', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarFilaYAgregarOtra(usuario)
    await usuario.type(screen.getByLabelText('Cantidad, fila 2'), '2')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const precio = screen.getByLabelText('Precio unitario, fila 2')
    expect(precio).toHaveAccessibleDescription(VALIDACION.precio)

    await usuario.type(screen.getByLabelText('Monto, fila 2'), '800')
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

  it('por pasos: primero fecha y proveedor; con proveedor, la fila; con la fila completa, el resto (nada apagado en gris)', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const resto = () => [
      screen.queryByRole('button', { name: /guardar compra/i }),
      screen.queryByRole('button', { name: 'Cancelar' }),
      screen.queryByRole('button', { name: COMPRA.agregarFila }),
      screen.queryByRole('button', { name: /nueva compra/i }),
      screen.queryByText('Total'),
    ]
    expect(screen.queryByRole('combobox', { name: 'Artículo, fila 1' })).not.toBeInTheDocument()
    resto().forEach(e => expect(e).not.toBeInTheDocument())

    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'W')
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toBeInTheDocument()
    resto().forEach(e => expect(e).not.toBeInTheDocument())

    await llenarFila(usuario, 1)
    resto().forEach(e => expect(e).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /guardar compra/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
  })

  it('tras un error de datos, Guardar se apaga hasta que se cambie algo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await llenarFilaYAgregarOtra(usuario)
    await usuario.type(screen.getByLabelText('Cantidad, fila 2'), '1')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const guardar = screen.getByRole('button', { name: /guardar compra/i })
    expect(guardar).toBeDisabled()
    expect(guardar).toHaveAccessibleDescription(COMPRA.cambiaParaReintentar)

    await usuario.type(screen.getByLabelText('Cantidad, fila 2'), '2')
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
    await llenarFila(usuario, 1)
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
    await llenarFila(usuario, 1)
    await usuario.click(screen.getByRole('button', { name: /nueva compra/i }))

    const segundo = await screen.findByRole('form', { name: 'Detalle de compra 2' })
    expect(within(segundo).getByRole('combobox', { name: 'Proveedor' })).toHaveFocus()
    // La compra nueva aún no tiene Guardar (va por pasos), pero sí Cancelar para quitarla
    expect(within(segundo).queryByRole('button', { name: /guardar compra/i })).not.toBeInTheDocument()

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
    await llenarFilaYAgregarOtra(usuario)
    const proveedor = screen.getByRole('combobox', { name: 'Proveedor' })
    await usuario.clear(proveedor)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 2' }), 'T') // el foco pasa al proveedor

    expect(proveedor).toHaveFocus()
    expect(proveedor).toHaveAccessibleDescription(VALIDACION.proveedorPrimero)
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 2' })).toHaveValue('')

    await usuario.type(proveedor, 'Walmart')
    expect(proveedor).not.toHaveAttribute('aria-invalid')
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 2' }), 'T')
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 2' })).toHaveValue('T')
  })

  it('la fila «Agregar otro artículo» solo aparece cuando la última fila está completa', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    const agregar = () => screen.queryByRole('button', { name: COMPRA.agregarFila })
    expect(agregar()).not.toBeInTheDocument()

    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    await usuario.selectOptions(screen.getByLabelText('Unidad, fila 1'), 'kg')
    expect(agregar()).not.toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Precio unitario, fila 1'), '350')
    expect(agregar()).toBeEnabled()
    // Va dentro de la tabla, al final, como una fila más
    expect(agregar().closest('tfoot')).toBeInTheDocument()
    await usuario.click(agregar())
    expect(agregar()).not.toBeInTheDocument()
  })

  it('agregar fila lleva el foco a su Material; nunca quedan menos de 1', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    expect(screen.getByRole('button', { name: 'Eliminar fila 1' })).toBeDisabled()
    await llenarFila(usuario, 1)
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarFila }))
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

  /** Una compra lista para guardar, con un artículo nuevo al que aún no se le dijo nada */
  async function compraConArticuloNuevo(usuario, nombre = 'Queso') {
    await llenarCompraValida(usuario)
    const material = screen.getByRole('combobox', { name: 'Artículo, fila 1' })
    await usuario.clear(material)
    await usuario.type(material, nombre)
    await usuario.keyboard('{Escape}')
    return material
  }

  it('«Ahora no» al guardar: la compra se guarda igual, sin categoría ni producto', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await compraConArticuloNuevo(usuario)
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.ahoraNo }))
    const confirmar = await screen.findByRole('alertdialog', { name: COMPRA.confirmarGuardar.titulo })
    await usuario.click(within(confirmar).getByRole('button', { name: COMPRA.confirmarGuardar.confirmar }))

    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ material: 'Queso', categoria: '', producto: '' })
    expect(asignarMaterial).not.toHaveBeenCalled()
  })

  it('la X al guardar cierra la ventana sin guardar la compra, y la fila queda marcada', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await compraConArticuloNuevo(usuario)
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(guardarLista).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Artículo, fila 1' })).toHaveAccessibleDescription(COMPRA.articuloIncompleto)
  })

  it('con «Ahora no» la fila queda en rojo con la señal; el botón recuerda qué falta y, al completarlo, se quita', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    const material = screen.getByRole('combobox', { name: 'Artículo, fila 1' })
    await usuario.type(material, 'Harina Nueva')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    expect(within(ventana).queryByText(ASIGNACION.faltaInformacion(true, true))).not.toBeInTheDocument()
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.ahoraNo }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Marcada, sin mensaje de error debajo: no impide guardar
    expect(material).toHaveAccessibleDescription(COMPRA.articuloIncompleto)
    expect(material.className).toMatch(/conError/)
    expect(material).not.toHaveAttribute('aria-invalid')
    expect(screen.getByTitle(COMPRA.articuloIncompleto)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarArticulo('Harina Nueva') }))
    const otra = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    expect(within(otra).getByText(ASIGNACION.faltaInformacion(true, true))).toBeInTheDocument()

    await usuario.click(within(otra).getByRole('button', { name: 'Materia Prima' }))
    await usuario.click(within(otra).getByRole('button', { name: 'Cachitos' }))
    await guardarArticulo(usuario, otra)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(material.className).not.toMatch(/conError/)
    expect(screen.queryByTitle(COMPRA.articuloIncompleto)).not.toBeInTheDocument()
  })

  it('la categoría basta: el formulario guarda un artículo sin productos', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Sal de mar')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))
    expect(await screen.findByText('Se agregará «Sal de mar» al catálogo, en Materia Prima.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: ASIGNACION.confirmar.confirmar }))

    await waitFor(() => expect(asignarMaterial).toHaveBeenCalledWith('Sal de mar', { categoria: 'Materia Prima', productos: [], proveedor: 'Walmart', nuevo: true }))
    expect(await screen.findByText(/va a Materia Prima\. Ya quedó en el catálogo\./)).toBeInTheDocument()
  })

  it('guardar solo con categoría marca la fila de una vez; la compra se guarda sin volver a preguntar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const material = await compraConArticuloNuevo(usuario, 'Sal de mar')
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarArticulo('Sal de mar') }))

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await guardarArticulo(usuario, ventana)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // La señal sale al cerrar el formulario, antes de guardar la compra
    expect(material.className).toMatch(/conError/)
    expect(material).toHaveAccessibleDescription(COMPRA.articuloIncompleto)
    expect(screen.getByTitle(COMPRA.articuloIncompleto)).toBeInTheDocument()
    expect(guardarLista).not.toHaveBeenCalled()

    // Al guardar la compra ya no pregunta
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const confirmar = await screen.findByRole('alertdialog', { name: COMPRA.confirmarGuardar.titulo })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await usuario.click(within(confirmar).getByRole('button', { name: COMPRA.confirmarGuardar.confirmar }))
    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ material: 'Sal de mar', categoria: 'Materia Prima', producto: '' })
  })

  it('tras guardar solo con categoría, el botón dice que falta el producto y, al agregarlo, se quita la señal', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    const material = screen.getByRole('combobox', { name: 'Artículo, fila 1' })
    await usuario.type(material, 'Sal de mar')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await guardarArticulo(usuario, ventana)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByTitle(COMPRA.articuloIncompleto)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: COMPRA.editarArticulo('Sal de mar') }))
    const edicion = await screen.findByRole('dialog', { name: ASIGNACION.tituloEditar })
    expect(within(edicion).getByText(ASIGNACION.faltaInformacion(false, true))).toBeInTheDocument()
    await usuario.click(within(edicion).getByRole('button', { name: 'Cachitos' }))
    await guardarArticulo(usuario, edicion)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(material.className).not.toMatch(/conError/)
    expect(screen.queryByTitle(COMPRA.articuloIncompleto)).not.toBeInTheDocument()
  })

  it('de la segunda compra en adelante, un artículo sin producto ya no pide nada ni sale en rojo', async () => {
    // Ya se compró una vez sin producto
    comprasPorArticulo.set('mr músculo antigrasa', 1)
    const usuario = userEvent.setup()
    renderizar()
    await llenarCompraValida(usuario)
    const material = screen.getByRole('combobox', { name: 'Artículo, fila 1' })
    await usuario.clear(material)
    await usuario.type(material, 'Mr Músculo Antigrasa')
    await usuario.tab()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(material.className).not.toMatch(/conError/)
    expect(material).toHaveAccessibleDescription('Limpieza')

    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await usuario.click(await screen.findByRole('button', { name: COMPRA.confirmarGuardar.confirmar }))
    await waitFor(() => expect(guardarLista).toHaveBeenCalledTimes(1))
    expect(vi.mocked(guardarLista).mock.calls[0][0].materiales[0]).toMatchObject({ categoria: 'Limpieza', producto: '' })
  })

  it('un nombre parecido a otro registrado avisa en el formulario, sin impedir guardar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Riojo')
    await usuario.tab()

    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    const texto = NOMBRE_PARECIDO.aviso('Tocino La Riojo', 'Tocino La Rioja', 'material')
    expect(within(ventana).getByText(texto)).toBeInTheDocument()
    const nombre = within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    expect(nombre).toHaveAccessibleDescription(texto)

    await usuario.click(within(ventana).getByRole('button', { name: 'Materia Prima' }))
    await guardarArticulo(usuario, ventana)
    await waitFor(() => expect(asignarMaterial).toHaveBeenCalled())
  })

  it('al corregir el nombre parecido, el aviso se quita', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarArticulo('') }))
    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })
    const nombre = within(ventana).getByRole('textbox', { name: ASIGNACION.nombreArticulo })
    await usuario.type(nombre, 'Pechugas de Pollos')
    expect(within(ventana).getByText(NOMBRE_PARECIDO.aviso('Pechugas de Pollos', 'Pechugas de Pollo', 'material'))).toBeInTheDocument()
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Servilletas')
    expect(within(ventana).queryByText(/se parece a/)).not.toBeInTheDocument()
  })

  it('una categoría o un producto nuevos parecidos a otros también avisan', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await elegirProveedor(usuario)
    await usuario.click(screen.getByRole('button', { name: COMPRA.agregarArticulo('') }))
    const ventana = await screen.findByRole('dialog', { name: ASIGNACION.tituloNuevo })

    await usuario.type(within(ventana).getByRole('textbox', { name: 'Buscar o agregar categoría' }), 'Bebida')
    expect(within(ventana).getByText(NOMBRE_PARECIDO.aviso('Bebida', 'Bebidas', 'categoria'))).toBeInTheDocument()

    const producto = within(ventana).getByRole('textbox', { name: 'Buscar o agregar producto' })
    await usuario.type(producto, 'Cachito')
    expect(within(ventana).getByText(NOMBRE_PARECIDO.aviso('Cachito', 'Cachitos', 'producto'))).toBeInTheDocument()
    // Sigue visible al agregarlo como nuevo: solo es una sugerencia
    await usuario.click(within(ventana).getByRole('button', { name: 'Agregar «Cachito»' }))
    expect(within(ventana).getByText(NOMBRE_PARECIDO.aviso('Cachito', 'Cachitos', 'producto'))).toBeInTheDocument()
  })

  it('un proveedor parecido a otro avisa al salir del campo, no mientras se escribe', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const campo = screen.getByRole('combobox', { name: 'Proveedor' })
    await usuario.type(campo, 'Walmar')
    const texto = NOMBRE_PARECIDO.aviso('Walmar', 'Walmart', 'proveedor')
    expect(screen.queryByText(texto)).not.toBeInTheDocument()

    await usuario.tab()
    expect(await screen.findByText(texto)).toBeInTheDocument()
    expect(campo).toHaveAccessibleDescription(texto)

    await usuario.clear(campo)
    await usuario.type(campo, 'Walmart')
    await usuario.tab()
    expect(screen.queryByText(/se parece a/)).not.toBeInTheDocument()
  })

  it('al guardar la compra con un artículo nuevo, lo pide y después guarda la compra', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await compraConArticuloNuevo(usuario)
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
    await llenarFilaYAgregarOtra(usuario)
    await usuario.clear(screen.getByRole('combobox', { name: 'Proveedor' }))
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
    await llenarFila(usuario, 1, { material: 'Pechugas de Pollo' })
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
