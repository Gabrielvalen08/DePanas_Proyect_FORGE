import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from './ConfirmDialog'

function montar(props = {}) {
  const onClose = vi.fn()
  const onConfirm = vi.fn()
  render(
    <ConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      title="¿Guardar compra?"
      message="Se guardará la compra."
      confirmLabel="Guardar"
      {...props}
    />
  )
  return { onClose, onConfirm }
}

describe('ConfirmDialog', () => {
  it('muestra el título, el mensaje y es un alertdialog', () => {
    montar()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('¿Guardar compra?')).toBeInTheDocument()
    expect(screen.getByText('Se guardará la compra.')).toBeInTheDocument()
  })

  it('el foco inicial va a Cancelar, no a la acción', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('confirmar llama a onConfirm y luego cierra', async () => {
    const { onConfirm, onClose } = montar()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cancelar solo cierra', async () => {
    const { onConfirm, onClose } = montar()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
