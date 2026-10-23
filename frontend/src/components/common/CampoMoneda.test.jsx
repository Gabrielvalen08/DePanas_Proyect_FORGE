import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CampoMoneda, { montoDesdeDigitos, mostrarMonto } from './CampoMoneda'

function Prueba({ inicial = '' }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <CampoMoneda id="precio" etiqueta="Precio" prefijo="$" value={valor} onChange={setValor} />
      <output aria-label="Valor guardado">{valor}</output>
    </>
  )
}

describe('CampoMoneda (tipo cajero)', () => {
  it('los dígitos entran por la derecha empezando por los centavos', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const campo = screen.getByLabelText('Precio')
    expect(campo).toHaveValue('')

    await usuario.type(campo, '5')
    expect(campo).toHaveValue('0.05')
    await usuario.type(campo, '0')
    expect(campo).toHaveValue('0.50')
    await usuario.type(campo, '0')
    expect(campo).toHaveValue('5.00')
    expect(screen.getByLabelText('Valor guardado')).toHaveTextContent('5.00')
  })

  it('Borrar quita el último dígito y, sin dígitos, el campo queda en blanco', async () => {
    const usuario = userEvent.setup()
    render(<Prueba />)
    const campo = screen.getByLabelText('Precio')
    await usuario.type(campo, '125')
    expect(campo).toHaveValue('1.25')
    await usuario.type(campo, '{Backspace}')
    expect(campo).toHaveValue('0.12')
    await usuario.type(campo, '{Backspace}{Backspace}')
    expect(campo).toHaveValue('')
  })

  it('un valor con más decimales se muestra con dos y se sigue escribiendo desde ahí', async () => {
    const usuario = userEvent.setup()
    render(<Prueba inicial="1.2" />)
    const campo = screen.getByLabelText('Precio')
    expect(campo).toHaveValue('1.20')
    await usuario.type(campo, '5')
    expect(campo).toHaveValue('12.05')
  })

  it('ignora lo que no es dígito y limita la cantidad de dígitos', () => {
    expect(montoDesdeDigitos('12.5')).toBe('1.25')
    expect(montoDesdeDigitos('abc')).toBe('')
    expect(montoDesdeDigitos('000')).toBe('')
    expect(montoDesdeDigitos('12345678901')).toBe('1234567.89')
    expect(mostrarMonto('0.3333')).toBe('0.33')
    expect(mostrarMonto('')).toBe('')
  })
})
