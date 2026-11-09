import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResumenCompra from './ResumenCompra'
import { IVA } from '../utils/mensajes'
import { TASA_IVA, calcularIva } from '../../../shared/iva.js'

describe('ResumenCompra', () => {
  it('muestra subtotal, IVA y total, y la casilla refleja si lleva IVA', () => {
    render(<ResumenCompra subtotal={100} conIva iva={13} total={113} onCambiarIva={() => {}} />)
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$13.00')).toBeInTheDocument()
    expect(screen.getByText('$113.00')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: IVA.etiqueta(TASA_IVA) })).toBeChecked()
  })

  it('sin marcar, el IVA es $0.00 y la casilla avisa al cambiar', async () => {
    const onCambiarIva = vi.fn()
    render(<ResumenCompra subtotal={50} conIva={false} iva={0} total={50} onCambiarIva={onCambiarIva} />)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('checkbox', { name: IVA.etiqueta(TASA_IVA) }))
    expect(onCambiarIva).toHaveBeenCalledWith(true)
  })

  it('la tasa es 13 % y el IVA se redondea a centavos', () => {
    expect(IVA.etiqueta(TASA_IVA)).toBe('IVA (13 %)')
    expect(calcularIva(100)).toBe(13)
    expect(calcularIva(9.99)).toBe(1.3)
  })
})
