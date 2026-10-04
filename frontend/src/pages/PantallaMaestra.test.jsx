import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import PantallaMaestra from './PantallaMaestra'

function renderizar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PantallaMaestra />
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PantallaMaestra', () => {
  it('muestra las compras mock con precio en formato $0.00', async () => {
    renderizar()
    const tabla = await screen.findByRole('table', { name: 'Compras registradas' })
    expect(within(tabla).getByText('Camarón mediano')).toBeInTheDocument()
    expect(within(tabla).getByText('$12.50')).toBeInTheDocument()
  })

  it('eliminar abre la confirmación con foco en Cancelar y borra al confirmar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar compra de Tomate' }))

    const dialogo = screen.getByRole('alertdialog', { name: 'Eliminar compra' })
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByText('Tomate')).not.toBeInTheDocument())
    expect(await screen.findByText('Compra eliminada correctamente')).toBeInTheDocument()
  })

  it('tras "Limpiar filtros", el modal reabre con los campos vacíos', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await screen.findByRole('table')

    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }))
    await usuario.type(screen.getByLabelText('Proveedor'), 'Walmart')
    await usuario.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    const limpiar = await screen.findByRole('button', { name: 'Limpiar filtros' })
    await usuario.click(limpiar)
    await screen.findByRole('table')

    await usuario.click(screen.getByRole('button', { name: 'Filtrar' }))
    expect(screen.getByLabelText('Proveedor')).toHaveValue('')
  })
})
