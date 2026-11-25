import { render, screen } from '@testing-library/react'
import FiltrosEnLinea, { FILTROS_VACIOS } from './FiltrosEnLinea'
import { fechaHoyISO } from '../utils/formato'
import { VALIDACION } from '../utils/mensajes'

const montar = filtros => render(<FiltrosEnLinea id="f" abierto filtros={{ ...FILTROS_VACIOS, ...filtros }} alCambiar={() => {}} />)

describe('FiltrosEnLinea: fechas', () => {
  it('Desde y Hasta llegan hasta hoy', () => {
    montar()
    expect(screen.getByLabelText('Desde')).toHaveAttribute('max', fechaHoyISO())
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('max', fechaHoyISO())
  })

  it('una fecha posterior a hoy escrita a mano avisa en su campo', () => {
    montar({ fechaDesde: '2099-01-01', fechaHasta: '2099-02-01' })
    expect(screen.getAllByText(VALIDACION.fechaFutura)).toHaveLength(2)
  })
})
