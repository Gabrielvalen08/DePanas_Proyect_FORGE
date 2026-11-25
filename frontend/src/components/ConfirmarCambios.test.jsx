import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmarCambios from './ConfirmarCambios'
import { CONFIRMAR } from '../utils/mensajes'

const montar = props => render(<ConfirmarCambios isOpen onClose={() => {}} onConfirm={() => {}} {...props} />)

describe('ConfirmarCambios', () => {
  it('al cambiar el nombre avisa que se aplica en todas las compras registradas', () => {
    montar({ anterior: 'Pepsi', nombre: ' Pepsi SV ' })
    expect(screen.getByText(CONFIRMAR.guardarCambios.renombre('Pepsi', 'Pepsi SV'))).toBeInTheDocument()
    expect(screen.getByText(/se aplicarán automáticamente en todas las compras registradas/)).toBeInTheDocument()
  })

  it('sin cambio de nombre, o al agregar, es la confirmación de siempre', () => {
    const { unmount } = montar({ anterior: 'Pepsi', nombre: 'Pepsi ' })
    expect(screen.getByText(CONFIRMAR.guardarCambios.mensaje)).toBeInTheDocument()
    unmount()
    montar({ nombre: 'Proveedor nuevo' })
    expect(screen.getByText(CONFIRMAR.guardarCambios.mensaje)).toBeInTheDocument()
  })

  it('confirmar guarda', async () => {
    const onConfirm = vi.fn()
    montar({ anterior: 'Bebidas', nombre: 'Refrescos', onConfirm })
    await userEvent.setup().click(screen.getByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
