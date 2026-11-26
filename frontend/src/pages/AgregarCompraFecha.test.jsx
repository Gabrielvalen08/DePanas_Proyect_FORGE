import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import BloqueCompra from '../components/BloqueCompra'
import { asignarMaterial, fetchListas, reiniciarModo } from '../services/api'
import { fechaHoyISO } from '../utils/formato'
import { VALIDACION } from '../utils/mensajes'

// api.js real en modo local, sobre localStorage
function montar() {
  const alGuardar = vi.fn()
  render(
    <MemoryRouter>
      <ToastProvider>
        <BloqueCompra alGuardar={alGuardar} />
      </ToastProvider>
    </MemoryRouter>
  )
  return alGuardar
}

describe('Fecha de la compra: solo días ya pasados', () => {
  beforeEach(async () => {
    localStorage.clear()
    reiniciarModo()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
    await fetchListas()
    // La unidad de la fila sale del artículo: el de la prueba ya la tiene
    await asignarMaterial('Tocino La Rioja', { categoria: 'Materia Prima', productos: ['Cachitos'], unidad: 'lb' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('el calendario llega hasta hoy', () => {
    montar()
    expect(screen.getByLabelText('Fecha')).toHaveAttribute('max', fechaHoyISO())
  })

  it('una fecha escrita a mano posterior a hoy no deja guardar', async () => {
    const usuario = userEvent.setup()
    const alGuardar = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Proveedor' }), 'Tienda Nueva')
    await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
    await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
    await usuario.type(screen.getByLabelText('Precio unitario, fila 1'), '500')
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2099-01-01' } })

    await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
    expect(await screen.findByText(VALIDACION.fechaFutura)).toBeInTheDocument()
    expect(alGuardar).not.toHaveBeenCalled()
  })
})
