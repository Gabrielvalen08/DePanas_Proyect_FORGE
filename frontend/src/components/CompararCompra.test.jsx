import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompararCompra from './CompararCompra'
import { CARGAR, IVA } from '../utils/mensajes'

const materiales = [{ material: 'Arroz', cantidad: 2, unidad: 'lb', monto: 100, categoria: 'Materia Prima', producto: 'Todos' }]
const compra = iva => ({ id: 1, proveedor: 'Selectos', fecha: '2026-10-01', categoria: '', iva, materiales })
const decision = { origen: '1', accion: 'combinar', existentes: [0], entrantes: [], proveedor: 'existente', fecha: 'existente', iva: 'existente' }

function montar(existente, entrante, alCambiar = () => {}) {
  render(<CompararCompra comparacion={{ origen: '1', existente, entrante }} decision={decision} alCambiar={alCambiar} />)
}

describe('CompararCompra: IVA', () => {
  it('si el IVA difiere se puede elegir cuál conservar, como el proveedor y la fecha', async () => {
    const alCambiar = vi.fn()
    montar(compra(0), compra(13), alCambiar)
    const grupo = screen.getByRole('group', { name: IVA.titulo })
    expect(within(grupo).getByRole('radio', { name: new RegExp(CARGAR.existente) })).toBeChecked()

    await userEvent.setup().click(within(grupo).getByRole('radio', { name: new RegExp(CARGAR.entrante) }))
    expect(alCambiar).toHaveBeenCalledWith({ iva: 'entrante' })
  })

  it('sin IVA en ninguna de las dos no pregunta por él', () => {
    montar(compra(0), compra(undefined))
    expect(screen.queryByRole('group', { name: IVA.titulo })).not.toBeInTheDocument()
  })
})
