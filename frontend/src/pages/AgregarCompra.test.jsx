import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { guardarLista } from '../services/api'
import { fechaHoyISO } from '../utils/formato'
import AgregarCompra from './AgregarCompra'

vi.mock('../services/api', () => ({
  guardarLista:         vi.fn(lista => Promise.resolve({ id: 99, ...lista })),
  detectarModo:         () => Promise.resolve('local'),
  exportarDB:           vi.fn(() => Promise.resolve()),
  importarDB:           vi.fn(() => Promise.resolve({ ok: true, nuevas: 1 })),
  exportarJSON:         vi.fn(() => Promise.resolve()),
  importarJSON:         vi.fn(() => Promise.resolve()),
  getProveedores:       () => ['Súper Selectos', 'Walmart'],
  getMateriales:        () => ['Tocino La Rioja', 'Pechugas de Pollo'],
  getCategorias:        () => ['Materia Prima', 'Bebidas', 'Desechables'],
  buscarEnCatalogo:     () => null,
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
  await usuario.type(en.getByRole('combobox', { name: 'Material, fila 1' }), 'Tocino La Rioja')
  await usuario.type(en.getByLabelText('Cantidad, fila 1'), '2')
  await usuario.selectOptions(en.getByLabelText('Unidad, fila 1'), 'kg')
  await usuario.type(en.getByLabelText('Precio, fila 1'), '3.5')
}

describe('AgregarCompra', () => {
  beforeEach(() => vi.mocked(guardarLista).mockClear())

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

    expect(screen.queryByRole('alert', { name: /revisa estos campos/i })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Material, fila 1' })).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('combobox', { name: 'Material, fila 2' })).not.toHaveAttribute('aria-invalid')
  })

  it('tras intentar guardar, el error queda enlazado al campo y desaparece al corregirlo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    const precio = screen.getByLabelText('Precio, fila 1')
    expect(precio).toHaveAccessibleDescription('Ingresa un precio mayor a 0')
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
    expect(screen.queryByRole('alert', { name: /revisa estos campos/i })).not.toBeInTheDocument()
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

  it('agregar fila lleva el foco a su Material; nunca quedan menos de 1', async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.getByRole('button', { name: 'Eliminar fila 1' })).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    expect(screen.getByRole('combobox', { name: 'Material, fila 2' })).toHaveFocus()
  })
})
