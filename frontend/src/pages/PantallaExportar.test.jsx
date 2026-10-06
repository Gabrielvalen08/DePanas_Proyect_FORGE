import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { reiniciarModo } from '../services/api'
import { EXPORTAR, VALIDACION } from '../utils/mensajes'
import PantallaExportar from './PantallaExportar'

// api.js real en modo local, con las 5 compras de ejemplo ($57.50 en total)
function renderizar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PantallaExportar />
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PantallaExportar', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarModo()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sin fechas cuenta todas las compras y marca "Todo"', async () => {
    renderizar()
    expect(await screen.findByText(EXPORTAR.resumen(5, '$57.50'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('radio', { name: /Excel \(\.csv\)/ })).toBeChecked()
  })

  it('el rango cambia el resumen; un rango al revés muestra el error y no deja descargar', async () => {
    renderizar()
    await screen.findByText(EXPORTAR.resumen(5, '$57.50'))
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-29' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-29' } })
    expect(await screen.findByText(EXPORTAR.resumen(2, '$14.35'))).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-01' } })
    expect(screen.getByLabelText('Hasta')).toHaveAccessibleDescription(VALIDACION.rangoFechas)
    expect(screen.getByRole('button', { name: EXPORTAR.descargar })).toBeDisabled()
  })

  it('un rango sin compras lo dice y no deja descargar', async () => {
    renderizar()
    await screen.findByText(EXPORTAR.resumen(5, '$57.50'))
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2020-01-01' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-01-31' } })
    expect(await screen.findByText(EXPORTAR.sinCompras)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: EXPORTAR.descargar })).toBeDisabled()
  })

  it('un rango rápido llena las fechas y queda marcado', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Mes pasado' }))
    expect(screen.getByRole('button', { name: 'Mes pasado' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Desde').value).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('descarga el archivo y avisa', async () => {
    const usuario = userEvent.setup()
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderizar()
    await screen.findByText(EXPORTAR.resumen(5, '$57.50'))
    await usuario.click(screen.getByRole('radio', { name: /Respaldo \(\.json\)/ }))
    await usuario.click(screen.getByRole('button', { name: EXPORTAR.descargar }))
    expect(await screen.findByText(EXPORTAR.descargado(5))).toBeInTheDocument()
    expect(clic).toHaveBeenCalledTimes(1)
    clic.mockRestore()
  })
})
