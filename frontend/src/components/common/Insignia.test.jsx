import { render, screen } from '@testing-library/react'
import Insignia from './Insignia'

describe('Insignia', () => {
  it('renderiza el texto con la clase del tono', () => {
    render(<Insignia tono="marca">Compras</Insignia>)
    const insignia = screen.getByText('Compras')
    expect(insignia.className).toContain('marca')
  })
})
