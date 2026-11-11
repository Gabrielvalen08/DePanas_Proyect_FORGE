import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AutocompleteInput from './AutocompleteInput'

const PROVEEDORES = ['Distribuidora Flores', 'La Colonia', 'Súper Selectos', 'Walmart']
const sinTildes = t => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function Prueba() {
  const [valor, setValor] = useState('')
  return (
    <AutocompleteInput
      id="proveedor"
      etiqueta="Proveedor"
      value={valor}
      onChange={setValor}
      getSuggestions={t => PROVEEDORES.filter(p => sinTildes(p).includes(sinTildes(t)))}
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

  it('al escribir, la opción que más coincide sube primero y queda marcada: Enter la completa', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })

    await usuario.type(combo, 'l')
    const opciones = screen.getAllByRole('option').map(o => o.textContent)
    // «La Colonia» empieza con l; las demás solo la contienen
    expect(opciones[0]).toBe('La Colonia')
    expect(screen.getByRole('option', { name: 'La Colonia' })).toHaveAttribute('aria-selected', 'true')
    expect(combo).toHaveAttribute('aria-activedescendant', 'proveedor-op-0')

    await usuario.keyboard('{Enter}')
    expect(combo).toHaveValue('La Colonia')
    expect(combo).toHaveAttribute('aria-expanded', 'false')
  })

  it('una palabra que empieza igual va antes que una coincidencia en medio', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })
    await usuario.type(combo, 'sel')
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Súper Selectos'])
    await usuario.clear(combo)
    await usuario.type(combo, 'or')
    // «Distribuidora Flores» lo contiene en medio; nada empieza con «or»: queda marcada igual la primera
    expect(screen.getByRole('option', { name: 'Distribuidora Flores' })).toHaveAttribute('aria-selected', 'true')
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

  it('como en Excel: un clic muestra todas las opciones y al escribir se filtran', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })
    await usuario.click(combo)
    expect(screen.getAllByRole('option')).toHaveLength(PROVEEDORES.length)
    await usuario.type(combo, 'super')
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Súper Selectos'])
  })

  it('la flecha abre y cierra el desplegable, y resalta el valor elegido', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })
    const flecha = screen.getByRole('button', { name: 'Mostrar opciones de Proveedor' })
    await usuario.click(flecha)
    await usuario.click(screen.getByRole('option', { name: 'La Colonia' }))
    expect(combo).toHaveValue('La Colonia')
    await usuario.click(flecha)
    expect(screen.getByRole('option', { name: 'La Colonia' })).toHaveAttribute('aria-selected', 'true')
    await usuario.click(flecha)
    expect(combo).toHaveAttribute('aria-expanded', 'false')
  })

  it('acepta un valor nuevo que no está en la lista', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const combo = screen.getByRole('combobox', { name: 'Proveedor' })
    await usuario.type(combo, 'Proveedor nuevo')
    expect(combo).toHaveAttribute('aria-expanded', 'false')
    expect(combo).toHaveValue('Proveedor nuevo')
  })
})
