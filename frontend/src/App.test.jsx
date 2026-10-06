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

describe('App - Flujo de seguridad con PantallaContrasena y Permisos', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('muestra la pantalla de contraseña antes de cualquier otra pantalla', () => {
    renderizarApp()

    // Debe mostrarse la pantalla de contraseña
    expect(screen.getByRole('heading', { name: ACCESO.titulo })).toBeInTheDocument()
    expect(screen.getByLabelText(ACCESO.etiquetaUsuario)).toBeInTheDocument()
    expect(screen.getByLabelText(ACCESO.etiquetaContrasena)).toBeInTheDocument()

    // No debe mostrar la navegación ni el formulario de compras
    expect(screen.queryByRole('heading', { name: 'Detalle de compra' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument()
  })

  it('desbloquea el sistema completo al ingresar Cesar_01 y 1234', async () => {
    const usuario = userEvent.setup()
    renderizarApp()

    const inputUser = screen.getByLabelText(ACCESO.etiquetaUsuario)
    const inputPass = screen.getByLabelText(ACCESO.etiquetaContrasena)
    await usuario.type(inputUser, 'Cesar_01')
    await usuario.type(inputPass, '1234')
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
    const inputUser = screen.getByLabelText(ACCESO.etiquetaUsuario)
    const inputPass = screen.getByLabelText(ACCESO.etiquetaContrasena)
    await usuario.type(inputUser, 'Cesar_01')
    await usuario.type(inputPass, '1234')
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

  it('para Cesar_01: el menú tiene Configuración y puede navegar a /configuracion', async () => {
    const usuario = userEvent.setup()
    sessionStorage.setItem('depanas_autenticado', 'true')
    sessionStorage.setItem('depanas_usuario', 'Cesar_01')
    renderizarApp('/cargar')
    expect(screen.getByText('Estamos trabajando en ello')).toBeInTheDocument()

    const configuracion = screen.getAllByRole('link', { name: 'Configuración' })[0]
    const bloquear = screen.getAllByRole('button', { name: /Bloquear/ })[0]
    // DOCUMENT_POSITION_FOLLOWING: Bloquear va después de Configuración
    expect(configuracion.compareDocumentPosition(bloquear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await usuario.click(configuracion)
    expect(await screen.findByRole('heading', { name: 'Configuración', level: 1 })).toBeInTheDocument()
  })

  it('para Marta_02: el menú NO muestra Configuración y redirige si intenta entrar a /configuracion', async () => {
    sessionStorage.setItem('depanas_autenticado', 'true')
    sessionStorage.setItem('depanas_usuario', 'Marta_02')
    renderizarApp('/configuracion')

    // No debe tener el enlace en el menú
    expect(screen.queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument()

    // Debe haber sido redirigido a la página principal (Detalle de compra)
    expect(await screen.findByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Configuración', level: 1 })).not.toBeInTheDocument()
  })
})
