import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AutocompleteInput from './AutocompleteInput'

const PROVEEDORES = ['Distribuidora Flores', 'La Colonia', 'Súper Selectos', 'Walmart']

function Prueba() {
  const [valor, setValor] = useState('')
  return (
    <AutocompleteInput
      id="proveedor"
      etiqueta="Proveedor"
      value={valor}
      onChange={setValor}
      getSuggestions={t => PROVEEDORES.filter(p => p.toLowerCase().includes(t.toLowerCase()))}
    />
  )
}

describe('AutocompleteInput', () => {
  it('sugiere mientras se escribe y selecciona con flechas + Enter', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })

    await usuario.type(combo, 'Sú')
    expect(combo).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: 'Súper Selectos' })).toBeInTheDocument()

    await usuario.keyboard('{ArrowDown}')
    expect(combo).toHaveAttribute('aria-activedescendant', 'proveedor-op-0')
    await usuario.keyboard('{Enter}')
    expect(combo).toHaveValue('Súper Selectos')
    expect(combo).toHaveAttribute('aria-expanded', 'false')
  })

  it('Escape cierra la lista sin borrar lo escrito', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })
    await usuario.type(combo, 'La')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    expect(combo).toHaveAttribute('aria-expanded', 'false')
    expect(combo).toHaveValue('La')
  })

  it('un clic en una opción la selecciona', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })
    await usuario.type(combo, 'wal')
    await usuario.click(screen.getByRole('option', { name: 'Walmart' }))
    expect(combo).toHaveValue('Walmart')
  })
})
