import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { ACCESO } from './utils/mensajes'

vi.mock('./services/api', () => ({
  guardarLista: vi.fn(),
  fetchListas: () => Promise.resolve([]),
  actualizarLista: vi.fn(),
  eliminarLista: vi.fn(),
  totalLista: () => 0,
  detectarModo: () => Promise.resolve('local'),
  exportarDB: vi.fn(),
  importarDB: vi.fn(),
  exportarJSON: vi.fn(),
  importarJSON: vi.fn(),
  analizarCompras: vi.fn(),
  getProveedores: () => ['Súper Selectos', 'Walmart'],
  getMateriales: () => ['Tocino La Rioja', 'Pechugas de Pollo'],
  getCategorias: () => ['Materia Prima', 'Bebidas'],
  getProductos: () => ['Cachitos', 'Todos'],
  getAsignacion: m => ({ existe: false, nombre: m, categoria: '', producto: '' }),
  necesitaAsignacion: () => false,
  asignarMaterial: vi.fn(),
  fetchCatalogo: () => Promise.resolve({ proveedores: [], categorias: [], productos: [], materiales: [], uso: {} }),
  iniciarSesion: async (usuario, contrasena) => {
    if (usuario === 'Cesar_01' && contrasena === '1234') return CESAR
    if (usuario === 'Marta_02' && contrasena === '5678') return MARTA
    throw new Error('Usuario o contraseña incorrectos')
  },
  fetchUsuarios: () => Promise.resolve([CESAR, MARTA]),
  crearUsuario: vi.fn(),
  editarUsuario: vi.fn(),
  eliminarUsuario: vi.fn(),
}))

// vi.mock se eleva al inicio del archivo: los datos van en vi.hoisted
const { CESAR, MARTA } = vi.hoisted(() => ({
  CESAR: { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'] },
  MARTA: { usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: ['/', '/compras', '/catalogo', '/exportar', '/cargar'] },
}))

function iniciarComo(sesion) {
  sessionStorage.setItem('depanas_sesion', JSON.stringify(sesion))
}

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

  it('para Cesar_01: el menú tiene Catálogo justo debajo de Compras y puede navegar a /catalogo', async () => {
    const usuario = userEvent.setup()
    iniciarComo(CESAR)
    renderizarApp('/cargar')
    expect(screen.getByLabelText('Seleccionar archivo JSON')).toBeInTheDocument()

    const menu = screen.getByRole('navigation', { name: 'Menú principal' })
    const enlaces = within(menu).getAllByRole('link').map(e => e.textContent)
    expect(enlaces).toEqual(['Agregar compra', 'Compras', 'Catálogo', 'Exportar datos', 'Cargar datos'])
    await usuario.click(within(menu).getByRole('link', { name: 'Catálogo' }))
    expect(await screen.findByRole('heading', { name: 'Catálogo', level: 1 })).toBeInTheDocument()
  })

  it('la ruta vieja /configuracion lleva al Catálogo', async () => {
    iniciarComo(CESAR)
    renderizarApp('/configuracion/proveedores')
    expect(await screen.findByRole('heading', { name: 'Catálogo', level: 1 })).toBeInTheDocument()
  })

  it('para Cesar_01: el menú tiene el Gestor de usuarios y lo abre', async () => {
    const usuario = userEvent.setup()
    iniciarComo(CESAR)
    renderizarApp()
    await usuario.click(screen.getAllByRole('link', { name: 'Gestor de usuarios' })[0])
    expect(await screen.findByRole('heading', { name: 'Gestor de usuarios', level: 1 })).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: /Marta_02/ })).toBeInTheDocument()
  })

  it('para Marta_02: ve el Catálogo, pero no el Gestor de usuarios, y si lo abre a mano vuelve al inicio', async () => {
    iniciarComo(MARTA)
    renderizarApp('/usuarios')

    expect(screen.getAllByRole('link', { name: 'Catálogo' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Gestor de usuarios' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Gestor de usuarios', level: 1 })).not.toBeInTheDocument()
  })

  it('un usuario sin una pantalla no la ve en el menú ni puede abrirla; sin Agregar compra empieza en la primera que tiene', async () => {
    iniciarComo({ usuario: 'Luis_03', nombre: 'Luis', rol: 'operador', permisos: ['/compras'] })
    renderizarApp('/catalogo')

    expect(screen.queryByRole('link', { name: 'Catálogo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Agregar compra' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Compras', level: 1 })).toBeInTheDocument()
  })
})
