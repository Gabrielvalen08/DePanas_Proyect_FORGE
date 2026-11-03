import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FichaProveedor, { fichaInicial } from './FichaProveedor'
import { PANTALLA_CATALOGO } from '../utils/mensajes'

const T = PANTALLA_CATALOGO.ficha

function Ficha({ inicial }) {
  const [ficha, setFicha] = useState(() => fichaInicial(inicial))
  return <FichaProveedor ficha={ficha} onCambiar={setFicha} />
}

const agregar = () => screen.getByRole('button', { name: T.agregarTelefono })

describe('FichaProveedor', () => {
  it('«Agregar teléfono» arranca apagado y se activa al llenar el campo', async () => {
    const usuario = userEvent.setup()
    render(<Ficha />)
    expect(agregar()).toBeDisabled()

    await usuario.type(screen.getByLabelText(T.telefono(1)), '7123-4567')
    expect(agregar()).toBeEnabled()
  })

  it('solo espacios cuenta como campo en blanco', async () => {
    const usuario = userEvent.setup()
    render(<Ficha />)
    await usuario.type(screen.getByLabelText(T.telefono(1)), '   ')
    expect(agregar()).toBeDisabled()
  })

  it('la fila nueva en blanco lo apaga otra vez; al borrar un teléfono también', async () => {
    const usuario = userEvent.setup()
    render(<Ficha />)
    await usuario.type(screen.getByLabelText(T.telefono(1)), '7123-4567')
    await usuario.click(agregar())
    expect(screen.getByLabelText(T.telefono(2))).toHaveValue('')
    expect(agregar()).toBeDisabled()

    await usuario.type(screen.getByLabelText(T.telefono(2)), '2222-3333')
    expect(agregar()).toBeEnabled()

    await usuario.clear(screen.getByLabelText(T.telefono(1)))
    expect(agregar()).toBeDisabled()
  })

  it('quitar la fila en blanco lo vuelve a activar', async () => {
    const usuario = userEvent.setup()
    render(<Ficha />)
    await usuario.type(screen.getByLabelText(T.telefono(1)), '7123-4567')
    await usuario.click(agregar())
    await usuario.click(screen.getByRole('button', { name: T.quitarTelefono(2) }))
    expect(agregar()).toBeEnabled()
  })

  it('al editar un proveedor con teléfonos está activo; sin teléfonos, apagado', () => {
    const { unmount } = render(<Ficha inicial={{ telefonos: ['7123-4567', '2222-3333'] }} />)
    expect(agregar()).toBeEnabled()
    unmount()

    render(<Ficha inicial={{ telefonos: [] }} />)
    expect(agregar()).toBeDisabled()
  })

  it('quitar el único teléfono deja agregar otro', async () => {
    const usuario = userEvent.setup()
    render(<Ficha inicial={{ telefonos: ['7123-4567'] }} />)
    await usuario.click(screen.getByRole('button', { name: T.quitarTelefono(1) }))
    expect(screen.queryByLabelText(T.telefono(1))).not.toBeInTheDocument()
    expect(agregar()).toBeEnabled()
  })

  it('los contactos no cambian: «Agregar contacto» sigue activo con un teléfono en blanco', () => {
    render(<Ficha />)
    expect(screen.getByRole('button', { name: T.agregarContacto })).toBeEnabled()
  })
})
