import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./services/api', () => ({
  guardarLista: vi.fn(),
  detectarModo: () => Promise.resolve('local'),
  exportarDB: vi.fn(),
  importarDB: vi.fn(),
  exportarJSON: vi.fn(),
  importarJSON: vi.fn(),
  getProveedores: () => ['Súper Selectos', 'Walmart'],
  getMateriales: () => ['Tocino La Rioja', 'Pechugas de Pollo'],
  getCategorias: () => ['Materia Prima', 'Bebidas'],
  buscarEnCatalogo: () => null,
}))

function renderizarApp(rutaInicial = '/') {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <App />
    </MemoryRouter>
  )
}

describe('App - Flujo de seguridad con PantallaContrasena', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('muestra la pantalla de contraseña antes de cualquier otra pantalla', () => {
    renderizarApp()

    // Debe mostrarse la pantalla de contraseña
    expect(screen.getByRole('heading', { name: 'Acceso al sistema' })).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña de acceso')).toBeInTheDocument()

    // No debe mostrar la navegación ni el formulario de compras
    expect(screen.queryByRole('heading', { name: 'Detalle de compra' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument()
  })

  it('desbloquea el sistema completo al ingresar la contraseña correcta 1234', async () => {
    const usuario = userEvent.setup()
    renderizarApp()

    const input = screen.getByLabelText('Contraseña de acceso')
    await usuario.type(input, '1234')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar al sistema' }))

    // Ahora sí debe verse el contenido principal
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
    })
  })

  it('permite bloquear el sistema y volver a pedir contraseña', async () => {
    const usuario = userEvent.setup()
    renderizarApp()

    // Desbloquear
    const input = screen.getByLabelText('Contraseña de acceso')
    await usuario.type(input, '1234')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar al sistema' }))

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
    })

    // Hacer clic en Bloquear
    const botonBloquear = screen.getByRole('button', { name: 'Bloquear' })
    await usuario.click(botonBloquear)

    // Debe volver a la pantalla de contraseña
    expect(screen.getByRole('heading', { name: 'Acceso al sistema' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de compra' })).not.toBeInTheDocument()
  })
})
