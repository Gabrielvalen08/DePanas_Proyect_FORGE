import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { guardarCompras } from '../services/api'
import AgregarCompra from './AgregarCompra'

vi.mock('../services/api', () => ({
  guardarCompras: vi.fn(() => Promise.resolve([])),
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

describe('AgregarCompra', () => {
  beforeEach(() => vi.mocked(guardarCompras).mockClear())

  it('valida al salir del campo y enlaza el error', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const precio = screen.getByLabelText('Precio, fila 1')
    await usuario.click(precio)
    await usuario.tab()
    expect(precio).toHaveAccessibleDescription('Ingresa un precio mayor a 0')
  })

  it('el error desaparece en cuanto se corrige', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const precio = screen.getByLabelText('Precio, fila 1')
    await usuario.click(precio)
    await usuario.tab()
    await usuario.type(precio, '5')
    expect(precio).not.toHaveAttribute('aria-invalid')
  })

  it('guardar con errores muestra el resumen con foco y no guarda', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    const resumen = await screen.findByRole('alert', { name: /revisa estos campos/i })
    await waitFor(() => expect(resumen).toHaveFocus())
    const precio = screen.getByLabelText('Precio, fila 1')
    const enlace = screen.getByRole('link', { name: /Fila 1 · Precio/ })
    expect(enlace).toHaveAttribute('href', `#${precio.id}`)
    await usuario.click(enlace)
    expect(precio).toHaveFocus()
    expect(guardarCompras).not.toHaveBeenCalled()
  })

  it('con datos válidos guarda una vez con el payload correcto', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByLabelText('Proveedor, fila 1'), 'Walmart')
    await usuario.type(screen.getByLabelText('Producto, fila 1'), 'Tomate')
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    await usuario.selectOptions(screen.getByLabelText('Unidad, fila 1'), 'kg')
    await usuario.type(screen.getByLabelText('Precio, fila 1'), '3.5')
    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))

    await waitFor(() => expect(guardarCompras).toHaveBeenCalledTimes(1))
    expect(guardarCompras).toHaveBeenCalledWith([
      expect.objectContaining({ proveedor: 'Walmart', producto: 'Tomate', cantidad: 2, unidad: 'kg', precio: 3.5 }),
    ])
  })

  it('agregar fila lleva el foco a su Proveedor; nunca quedan menos de 1', async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.getByRole('button', { name: 'Eliminar fila 1' })).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: /agregar otra fila/i }))
    expect(screen.getByLabelText('Proveedor, fila 2')).toHaveFocus()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar fila 2' }))
    await waitFor(() => expect(screen.queryByLabelText('Proveedor, fila 2')).not.toBeInTheDocument())
  })
})
