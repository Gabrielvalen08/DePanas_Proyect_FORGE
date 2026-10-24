import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { useRegresar } from './useRegresar'

function ConRegresar() {
  const regresar = useRegresar('/compras')
  return <button type="button" onClick={regresar}>Regresar</button>
}

function renderizar(entradas) {
  return render(
    <MemoryRouter initialEntries={entradas}>
      <Routes>
        <Route path="/compras" element={<h1>Lista</h1>} />
        <Route path="/otra" element={<><h1>Otra</h1><Link to="/exportar">Ir</Link></>} />
        <Route path="/exportar" element={<ConRegresar />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('useRegresar', () => {
  it('vuelve a la pantalla anterior si se llegó navegando', async () => {
    const usuario = userEvent.setup()
    renderizar(['/otra'])
    await usuario.click(screen.getByRole('link', { name: 'Ir' }))
    await usuario.click(screen.getByRole('button', { name: 'Regresar' }))
    expect(screen.getByRole('heading', { name: 'Otra' })).toBeInTheDocument()
  })

  it('si la pantalla se abrió directo, va al destino en vez de salir de la app', async () => {
    const usuario = userEvent.setup()
    renderizar(['/exportar'])
    await usuario.click(screen.getByRole('button', { name: 'Regresar' }))
    expect(screen.getByRole('heading', { name: 'Lista' })).toBeInTheDocument()
  })
})
