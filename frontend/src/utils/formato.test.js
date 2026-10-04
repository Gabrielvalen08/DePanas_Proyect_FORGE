import { fechaHoyISO, formatearFecha, formatearFechaTexto, formatearPrecio } from './formato'

describe('formato', () => {
  it('formatearPrecio usa $ y dos decimales', () => {
    expect(formatearPrecio(12.5)).toBe('$12.50')
    expect(formatearPrecio(1.2)).toBe('$1.20')
  })

  it('formatearFecha pasa de ISO a dd/mm/aaaa', () => {
    expect(formatearFecha('2026-09-28')).toBe('28/09/2026')
    expect(formatearFecha('')).toBe('—')
  })

  it('formatearFechaTexto escribe el mes', () => {
    expect(formatearFechaTexto('2026-09-28')).toBe('28 de septiembre de 2026')
  })

  it('fechaHoyISO usa la fecha local, no UTC', () => {
    expect(fechaHoyISO(new Date(2026, 9, 3, 23, 30))).toBe('2026-10-03')
    expect(fechaHoyISO(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05')
  })
})
