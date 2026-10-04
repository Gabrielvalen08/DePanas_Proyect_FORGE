import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal, { CuerpoModal, PieModal } from './Modal'

function Prueba({ alCerrarExtra = () => {} }) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = () => { alCerrarExtra(); setAbierto(false) }
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir</button>
      <Modal abierto={abierto} alCerrar={cerrar} titulo="Prueba">
        <CuerpoModal><input aria-label="Campo" /></CuerpoModal>
        <PieModal><button>Aceptar</button></PieModal>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('Escape llama a alCerrar', async () => {
    const alCerrar = vi.fn()
    const usuario = userEvent.setup()
    render(<Prueba alCerrarExtra={alCerrar} />)
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    await usuario.keyboard('{Escape}')
    expect(alCerrar).toHaveBeenCalledTimes(1)
  })

  it('al cerrar devuelve el foco al botón que lo abrió', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })
    await usuario.click(abrir)
    expect(screen.getByRole('dialog', { name: 'Prueba' })).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(abrir).toHaveFocus()
  })

  it('Tab desde el último elemento vuelve al primero', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    const cerrar = screen.getByRole('button', { name: 'Cerrar' })
    const aceptar = screen.getByRole('button', { name: 'Aceptar' })
    expect(cerrar).toHaveFocus()
    aceptar.focus()
    await usuario.tab()
    expect(cerrar).toHaveFocus()
  })
})
