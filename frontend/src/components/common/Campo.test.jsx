import { render, screen } from '@testing-library/react'
import Campo from './Campo'

describe('Campo', () => {
  it('enlaza el error con aria-describedby y marca aria-invalid', () => {
    render(<Campo id="precio" etiqueta="Precio" error="Ingresa un precio mayor a 0" />)
    const input = screen.getByLabelText('Precio')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Ingresa un precio mayor a 0')
  })

  it('sin error no marca aria-invalid', () => {
    render(<Campo id="producto" etiqueta="Producto" />)
    expect(screen.getByLabelText('Producto')).not.toHaveAttribute('aria-invalid')
  })

  it('la etiqueta oculta sigue dando nombre accesible', () => {
    render(<Campo id="p1" etiqueta="Proveedor, fila 1" etiquetaOculta />)
    expect(screen.getByRole('textbox', { name: 'Proveedor, fila 1' })).toBeInTheDocument()
  })
})
