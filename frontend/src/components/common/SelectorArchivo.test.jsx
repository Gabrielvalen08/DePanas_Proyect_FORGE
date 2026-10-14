import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SelectorArchivo from './SelectorArchivo'

function montar(props = {}) {
  const onElegir = vi.fn()
  render(
    <SelectorArchivo id="archivo" etiqueta="Elegir archivo" ayuda="Solo .json" textoVacio="Sin archivo"
      textoSoltar="O suéltalo aquí" onElegir={onElegir} {...props} />
  )
  return onElegir
}

describe('SelectorArchivo', () => {
  it('el input se nombra con la etiqueta y describe el archivo elegido y la ayuda', () => {
    montar({ nombre: 'compras.json' })
    const input = screen.getByLabelText('Elegir archivo')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAccessibleDescription('compras.json Solo .json')
  })

  it('sin archivo muestra el texto vacío', () => {
    montar()
    expect(screen.getByText('Sin archivo')).toBeInTheDocument()
  })

  it('entrega el archivo al elegirlo o al soltarlo encima', async () => {
    const onElegir = montar()
    const archivo = new File(['[]'], 'datos.json', { type: 'application/json' })
    await userEvent.setup().upload(screen.getByLabelText('Elegir archivo'), archivo)
    expect(onElegir).toHaveBeenCalledWith(archivo)

    fireEvent.drop(screen.getByText('O suéltalo aquí'), { dataTransfer: { files: [archivo] } })
    expect(onElegir).toHaveBeenCalledTimes(2)
  })

  it('deshabilitado no acepta archivos soltados', () => {
    const onElegir = montar({ disabled: true })
    fireEvent.drop(screen.getByText('O suéltalo aquí'), { dataTransfer: { files: [new File([''], 'x.json')] } })
    expect(onElegir).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Elegir archivo')).toBeDisabled()
  })
})
