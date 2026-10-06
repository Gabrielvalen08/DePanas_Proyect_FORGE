import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { ACCESO } from './utils/mensajes'

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
  getProductos: () => ['Cachitos', 'Todos'],
  getAsignacion: m => ({ existe: false, nombre: m, categoria: '', producto: '' }),
  necesitaAsignacion: () => false,
  asignarMaterial: vi.fn(),
  fetchCatalogo: () => Promise.resolve({ proveedores: [], categorias: [], productos: [], materiales: [], uso: {} }),
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
    expect(screen.getByRole('heading', { name: ACCESO.titulo })).toBeInTheDocument()
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
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))

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
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
    })

    // Hacer clic en Bloquear
    const botonBloquear = screen.getByRole('button', { name: 'Bloquear' })
    await usuario.click(botonBloquear)

    // Debe volver a la pantalla de contraseña
    expect(screen.getByRole('heading', { name: ACCESO.titulo })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de compra' })).not.toBeInTheDocument()
    expect(await screen.findByText(ACCESO.bloqueado)).toBeInTheDocument()
  })

  it('el menú tiene Configuración justo arriba de Bloquear, y Cargar datos avisa que está en construcción', async () => {
    const usuario = userEvent.setup()
    sessionStorage.setItem('depanas_autenticado', 'true')
    renderizarApp('/cargar')
    expect(screen.getByText('Estamos trabajando en ello')).toBeInTheDocument()

    const configuracion = screen.getAllByRole('link', { name: 'Configuración' })[0]
    const bloquear = screen.getAllByRole('button', { name: /Bloquear/ })[0]
    // DOCUMENT_POSITION_FOLLOWING: Bloquear va después de Configuración
    expect(configuracion.compareDocumentPosition(bloquear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await usuario.click(configuracion)
    expect(await screen.findByRole('heading', { name: 'Configuración', level: 1 })).toBeInTheDocument()
  })
})
