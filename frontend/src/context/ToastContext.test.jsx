import { act, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'

function Disparadores() {
  const { addToast } = useToast()
  return (
    <>
      <button onClick={() => addToast('Hola')}>exito</button>
      <button onClick={() => addToast('Falló', 'error')}>error</button>
    </>
  )
}

function renderizar() {
  render(<ToastProvider><Disparadores /></ToastProvider>)
}

describe('ToastContext', () => {
  afterEach(() => vi.useRealTimers())

  it('los éxitos se anuncian en role="status"', () => {
    renderizar()
    act(() => screen.getByText('exito').click())
    expect(screen.getByRole('status')).toHaveTextContent('Hola')
  })

  it('los errores se anuncian en role="alert"', () => {
    renderizar()
    act(() => screen.getByText('error').click())
    expect(screen.getByRole('alert')).toHaveTextContent('Falló')
  })

  it('desaparece a los 3.5 s', async () => {
    // Solo se simulan los timeouts: la salida de Motion corre en frames reales
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderizar()
    act(() => screen.getByText('exito').click())
    expect(screen.getByText('Hola')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3600))
    vi.useRealTimers()
    await waitFor(() => expect(screen.queryByText('Hola')).not.toBeInTheDocument())
  })
})
