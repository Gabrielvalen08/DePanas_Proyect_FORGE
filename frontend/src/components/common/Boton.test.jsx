import { render, screen } from '@testing-library/react'
import { Trash2 } from 'lucide-react'
import Boton from './Boton'

describe('Boton', () => {
  it('cargando lo deshabilita y marca aria-busy', () => {
    render(<Boton cargando>Guardar</Boton>)
    const boton = screen.getByRole('button', { name: 'Guardar' })
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
  })

  it('la variante icono sin aria-label avisa por consola', () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Boton variante="icono" icono={<Trash2 />} />)
    expect(espia).toHaveBeenCalledWith(expect.stringContaining('aria-label'))
    espia.mockRestore()
  })

  it('la variante icono con aria-label tiene nombre accesible', () => {
    render(<Boton variante="icono" icono={<Trash2 />} aria-label="Eliminar" />)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })
})
