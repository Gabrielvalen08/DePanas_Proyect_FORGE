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

// Fila de la lista de Súper Selectos del 29/09 (3 productos, $8.95)
const LISTA_SELECTOS = /Ver compra en Súper Selectos del 29\/09\/2026/

describe('PantallaMaestra', () => {
  it('muestra cada lista con proveedor, cantidad de productos, gasto total y fecha', async () => {
    renderizar()
    const tabla = await screen.findByRole('table', { name: /listas de compra/i })
    expect(within(tabla).getAllByRole('row')).toHaveLength(6) // encabezado + 5 listas
    const fila = within(tabla).getByRole('button', { name: LISTA_SELECTOS }).closest('tr')
    expect(within(fila).getByText('3')).toBeInTheDocument()
    expect(within(fila).getByText('$8.95')).toBeInTheDocument()
    expect(within(fila).getByText('29/09/2026')).toBeInTheDocument()
  })

  it('al abrir una lista muestra sus productos y el total', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await screen.findByRole('button', { name: LISTA_SELECTOS }))

    const detalle = screen.getByRole('dialog', { name: 'Compra en Súper Selectos' })
    expect(within(detalle).getByText('Arroz')).toBeInTheDocument()
    expect(within(detalle).getByText('Queso duro blando')).toBeInTheDocument()
    expect(within(detalle).getByText('$8.95')).toBeInTheDocument()
  })

  it('edita una lista desde el detalle y la tabla se actualiza', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await screen.findByRole('button', { name: LISTA_SELECTOS }))
    await usuario.click(screen.getByRole('button', { name: 'Editar' }))

    const edicion = screen.getByRole('dialog', { name: 'Editar compra' })
    const precio = within(edicion).getByLabelText('Precio, fila 2')
    expect(precio).toHaveValue(4.25)
    await usuario.clear(precio)
    await usuario.type(precio, '10')
    await usuario.click(within(edicion).getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByText('Compra actualizada')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('$14.70')).toBeInTheDocument()
  })

  it('elimina una lista con confirmación (foco en Cancelar)', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await screen.findByRole('button', { name: LISTA_SELECTOS }))
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    const confirmacion = screen.getByRole('alertdialog', { name: 'Eliminar compra' })
    expect(within(confirmacion).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('Compra eliminada')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: LISTA_SELECTOS })).not.toBeInTheDocument())
  })

  it('los filtros se despliegan junto al botón (sin ventana) y filtran en vivo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await screen.findByRole('table')
    const filtrar = screen.getByRole('button', { name: 'Filtrar' })
    expect(filtrar).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(filtrar)
    expect(filtrar).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Producto'), 'arroz')
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
    expect(screen.getByRole('button', { name: /Filtrar, 1 filtro activo/ })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar' }))
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(6))
  })
})
