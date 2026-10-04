import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { guardarLista } from '../services/api'
import { fechaHoyISO } from '../utils/formato'
import AgregarCompra from './AgregarCompra'

vi.mock('../services/api', () => ({
  guardarLista: vi.fn(lista => Promise.resolve({ id: 99, ...lista })),
  getProveedores: () => ['Súper Selectos', 'Walmart'],
  getProductos: () => ['Pollo entero', 'Tomate'],
}))

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
  await usuario.type(en.getByRole('combobox', { name: 'Producto, fila 1' }), 'Tomate')
  await usuario.type(en.getByLabelText('Cantidad, fila 1'), '2')
  await usuario.selectOptions(en.getByLabelText('Unidad, fila 1'), 'kg')
  await usuario.type(en.getByLabelText('Precio, fila 1'), '3.5')
}

describe('AgregarCompra', () => {
  beforeEach(() => vi.mocked(guardarLista).mockClear())

  it('proveedor y fecha van una sola vez; la fecha arranca en hoy', () => {
    renderizar()
    expect(screen.getByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox', { name: 'Proveedor' })).toHaveLength(1)
    expect(screen.getByLabelText('Fecha')).toHaveValue(fechaHoyISO())
  })

  it('valida al salir del campo y enlaza el error', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const precio = screen.getByLabelText('Precio, fila 1')
    await usuario.click(precio)
    await usuario.tab()
    expect(precio).toHaveAccessibleDescription('Ingresa un precio mayor a 0')
  })

  it('guardar con errores muestra el resumen con foco y no guarda', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const resumen = await screen.findByRole('alert', { name: /revisa estos campos/i })
    await waitFor(() => expect(resumen).toHaveFocus())
    const enlace = within(resumen).getByRole('link', { name: /Proveedor: Escribe el proveedor/ })
    await usuario.click(enlace)
    expect(screen.getByRole('combobox', { name: 'Proveedor' })).toHaveFocus()
    expect(guardarLista).not.toHaveBeenCalled()
  })

  it('el total suma los precios de las filas', async () => {
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
    expect(guardarLista).toHaveBeenCalledWith({
      proveedor: 'Walmart',
      fecha: fechaHoyISO(),
      productos: [{ producto: 'Tomate', cantidad: '2', unidad: 'kg', precio: '3.5' }],
    })
    expect(await screen.findByText(/Compra en Walmart guardada/)).toBeInTheDocument()
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

  it('agregar fila lleva el foco a su Producto; nunca quedan menos de 1', async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.getByRole('button', { name: 'Eliminar fila 1' })).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    expect(screen.getByRole('combobox', { name: 'Producto, fila 2' })).toHaveFocus()
  })
})
