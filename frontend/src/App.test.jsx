import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import { apagarSistema, avisarCierrePestana, puedeApagar, registrarPestana } from './services/api'
import { ACCESO, APAGADO, CARGAR, CONFIRMAR } from './utils/mensajes'

vi.mock('./services/api', () => ({
  guardarLista: vi.fn(),
  fetchListas: () => Promise.resolve([]),
  actualizarLista: vi.fn(),
  eliminarLista: vi.fn(),
  totalLista: () => 0,
  detectarModo: () => Promise.resolve('local'),
  fijarTokenSesion: () => {},
  puedeApagar: vi.fn(() => false),
  apagarSistema: vi.fn(async () => {}),
  registrarPestana: vi.fn(async () => {}),
  avisarCierrePestana: vi.fn(),
  cerrarSesionServidor: async () => {},
  EVENTO_SESION_VENCIDA: 'depanas:sesion-vencida',
  exportarDB: vi.fn(),
  importarDB: vi.fn(),
  exportarJSON: vi.fn(),
  importarJSON: vi.fn(),
  analizarCompras: vi.fn(),
  getProveedores: () => ['Súper Selectos', 'Walmart'],
  getMateriales: () => ['Tocino La Rioja', 'Pechugas de Pollo'],
  getMaterialesPorProveedor: () => ['Tocino La Rioja', 'Pechugas de Pollo'],
  getCategoriasDeProveedor: () => [],
  getCategorias: () => ['Materia Prima', 'Bebidas'],
  getProductos: () => ['Cachitos', 'Todos'],
  getAsignacion: m => ({ existe: false, nombre: m, categoria: '', producto: '' }),
  necesitaAsignacion: () => false,
  getPrecioSugerido: () => null,
  getIvaPorProveedor: () => false,
  asignarMaterial: vi.fn(),
  fetchCatalogo: () => Promise.resolve({ proveedores: ['Selectos'], categorias: [], productos: [], materiales: [], uso: {}, fichas: {} }),
  iniciarSesion: async (usuario, contrasena) => {
    if (usuario === 'Cesar_01' && contrasena === 'DePanas#2026') return CESAR
    if (usuario === 'Marta_02' && contrasena === '5678') return MARTA
    throw new Error('Usuario o contraseña incorrectos')
  },
  fetchUsuarios: () => Promise.resolve([CESAR, MARTA]),
  crearUsuario: vi.fn(),
  editarUsuario: vi.fn(),
  eliminarUsuario: vi.fn(),
  fetchRequisitosContrasena: () => Promise.resolve({ minimo: 8, mayuscula: true, minuscula: true, numero: true, especial: true }),
  guardarRequisitosContrasena: vi.fn(),
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
  // Router de datos, como main.jsx: lo exige useBlocker (aviso de datos sin guardar)
  const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: [rutaInicial] })
  return render(<RouterProvider router={router} />)
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

  it('desbloquea el sistema completo al ingresar Cesar_01 con su contraseña', async () => {
    const usuario = userEvent.setup()
    renderizarApp()

    const inputUser = screen.getByLabelText(ACCESO.etiquetaUsuario)
    const inputPass = screen.getByLabelText(ACCESO.etiquetaContrasena)
    await usuario.type(inputUser, 'Cesar_01')
    await usuario.type(inputPass, 'DePanas#2026')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))

    // Ahora sí debe verse el contenido principal
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Detalle de compra' })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
    })
  })

  it('sin servidor apagable (desarrollo, modo local) no aparece «Apagar»', () => {
    iniciarComo({ usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'] })
    renderizarApp()
    expect(screen.queryByRole('button', { name: APAGADO.boton })).not.toBeInTheDocument()
  })

  it('en la versión del .zip, «Apagar De Panas SV» pide confirmar, apaga el servidor y deja la pantalla de apagado', async () => {
    vi.mocked(puedeApagar).mockReturnValue(true)
    const usuario = userEvent.setup()
    iniciarComo({ usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: ['/', '/compras'] })
    renderizarApp()

    await usuario.click(screen.getByRole('button', { name: APAGADO.boton }))
    const confirmacion = await screen.findByRole('alertdialog', { name: CONFIRMAR.apagar.titulo })
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))
    expect(apagarSistema).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: APAGADO.boton }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.apagar.confirmar }))
    expect(apagarSistema).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(APAGADO.titulo)).toBeInTheDocument()
    expect(screen.getByText(APAGADO.texto)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument()
    expect(sessionStorage.getItem('depanas_sesion')).toBeNull()
    vi.mocked(puedeApagar).mockReturnValue(false)
  })

  it('permite cerrar sesión y volver a pedir contraseña', async () => {
    const usuario = userEvent.setup()
    renderizarApp()

    // Desbloquear
    const inputUser = screen.getByLabelText(ACCESO.etiquetaUsuario)
    const inputPass = screen.getByLabelText(ACCESO.etiquetaContrasena)
    await usuario.type(inputUser, 'Cesar_01')
    await usuario.type(inputPass, 'DePanas#2026')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
    })

    // Hacer clic en Cerrar sesión
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    // Pide confirmar; «Cancelar» conserva la sesión
    const confirmacion = await screen.findByRole('alertdialog', { name: CONFIRMAR.cerrarSesion.titulo })
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.cerrarSesion.confirmar }))

    // Debe volver a la pantalla de contraseña
    expect(screen.getByRole('heading', { name: ACCESO.titulo })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de compra' })).not.toBeInTheDocument()
    expect(await screen.findByText(ACCESO.bloqueado)).toBeInTheDocument()
  })

  it('para Cesar_01: el menú tiene Catálogo justo debajo de Compras y puede navegar a /catalogo', async () => {
    const usuario = userEvent.setup()
    iniciarComo(CESAR)
    renderizarApp('/cargar')
    expect(screen.getByLabelText(CARGAR.archivo)).toBeInTheDocument()

    const menu = screen.getByRole('navigation', { name: 'Menú principal' })
    const enlaces = within(menu).getAllByRole('link').map(e => e.textContent)
    // Exportar y Cargar datos ya no salen en el menú, pero sus rutas siguen funcionando
    expect(enlaces).toEqual(['Agregar compra', 'Lista de compras', 'Catálogo'])
    await usuario.click(within(menu).getByRole('link', { name: 'Catálogo' }))
    expect(await screen.findByRole('heading', { name: 'Catálogo', level: 1 })).toBeInTheDocument()
  })

  it('Exportar y Cargar datos no están en el menú, pero se abren por su ruta', async () => {
    iniciarComo(CESAR)
    const { unmount } = renderizarApp('/exportar')
    expect(await screen.findByRole('heading', { name: 'Exportar datos', level: 1 })).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Menú principal' })
    expect(within(menu).queryByRole('link', { name: /exportar datos|cargar datos/i })).not.toBeInTheDocument()
    unmount()

    renderizarApp('/cargar')
    expect(await screen.findByRole('heading', { name: 'Cargar datos', level: 1 })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Lista de compras', level: 1 })).toBeInTheDocument()
  })
})

describe('App - versión del .zip: solo Apagar, y cerrar la pestaña apaga', () => {
  const pideConfirmar = () => {
    const e = new Event('beforeunload', { cancelable: true })
    act(() => { window.dispatchEvent(e) })
    return e.defaultPrevented
  }

  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(registrarPestana).mockClear()
    vi.mocked(avisarCierrePestana).mockClear()
    vi.mocked(puedeApagar).mockReturnValue(true)
  })
  afterEach(() => vi.mocked(puedeApagar).mockReturnValue(false))

  it('no hay «Cerrar sesión»: solo «Apagar De Panas SV»', async () => {
    iniciarComo(CESAR)
    renderizarApp()
    expect(await screen.findByRole('heading', { name: 'Agregar compra', level: 1 })).toBeInTheDocument()
    const lateral = screen.getByRole('complementary')
    expect(within(lateral).getByRole('button', { name: APAGADO.boton })).toBeInTheDocument()
    expect(within(lateral).queryByRole('button', { name: /Cerrar sesión/ })).not.toBeInTheDocument()
  })

  it('en el teléfono, un empleado sin ítems en «Más» igual puede apagar', async () => {
    const usuario = userEvent.setup()
    iniciarComo({ usuario: 'Ana_04', nombre: 'Ana', rol: 'empleado', permisos: ['/', '/compras'], funciones: [] })
    renderizarApp()
    await usuario.click(within(screen.getByRole('navigation', { name: 'Menú principal móvil' })).getByRole('button', { name: 'Más' }))
    const hoja = screen.getByRole('dialog', { name: 'Más opciones' })
    expect(within(hoja).getByRole('button', { name: APAGADO.boton })).toBeInTheDocument()
    expect(within(hoja).queryByRole('button', { name: /Cerrar sesión/ })).not.toBeInTheDocument()
  })

  it('con sesión: la pestaña se registra, cerrarla pide confirmar y avisa al servidor', async () => {
    iniciarComo(CESAR)
    renderizarApp()
    await waitFor(() => expect(registrarPestana).toHaveBeenCalledTimes(1))
    expect(pideConfirmar()).toBe(true)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(avisarCierrePestana).toHaveBeenCalledTimes(1)
  })

  it('en la pantalla de contraseña no hay aviso ni apagado', async () => {
    renderizarApp()
    expect(await screen.findByRole('heading', { name: ACCESO.titulo })).toBeInTheDocument()
    await act(async () => {})
    expect(pideConfirmar()).toBe(false)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(avisarCierrePestana).not.toHaveBeenCalled()
    expect(registrarPestana).not.toHaveBeenCalled()
  })

  it('después de «Apagar De Panas SV» ya no pide confirmar al cerrar', async () => {
    const usuario = userEvent.setup()
    iniciarComo(CESAR)
    renderizarApp()
    await usuario.click(within(screen.getByRole('complementary')).getByRole('button', { name: APAGADO.boton }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.apagar.confirmar }))
    expect(await screen.findByText(APAGADO.titulo)).toBeInTheDocument()
    expect(pideConfirmar()).toBe(false)
  })
})

describe('App - fuera del .zip', () => {
  it('sí hay «Cerrar sesión» y cerrar la pestaña sin datos no pide confirmar', async () => {
    sessionStorage.clear()
    iniciarComo(CESAR)
    renderizarApp()
    expect(await screen.findByRole('heading', { name: 'Agregar compra', level: 1 })).toBeInTheDocument()
    expect(within(screen.getByRole('complementary')).getByRole('button', { name: /Cerrar sesión/ })).toBeInTheDocument()
    const e = new Event('beforeunload', { cancelable: true })
    act(() => { window.dispatchEvent(e) })
    expect(e.defaultPrevented).toBe(false)
  })
})

describe('App - roles y funciones', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('un empleado (sin Catálogo) no lo ve en el menú y si lo abre a mano vuelve al inicio', async () => {
    iniciarComo({ usuario: 'Ana_04', nombre: 'Ana', rol: 'empleado', permisos: ['/', '/compras'], funciones: ['compras.editar'] })
    renderizarApp('/catalogo/proveedores')

    expect(await screen.findByRole('heading', { name: 'Agregar compra', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Lista de compras' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Catálogo' })).not.toBeInTheDocument()
  })

  it('un usuario sin funciones del Catálogo lo ve, pero sin Agregar, editar ni eliminar', async () => {
    iniciarComo({ usuario: 'Ana_04', nombre: 'Ana', rol: 'empleado', permisos: ['/catalogo'], funciones: [] })
    renderizarApp('/catalogo/proveedores')

    expect(await screen.findByRole('heading', { name: 'Catálogo', level: 1 })).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: 'Selectos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Agregar proveedor/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Eliminar proveedor/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar proveedor/ })).not.toBeInTheDocument()
  })
})

describe('App - barra inferior en móvil', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('la barra lleva Agregar, Compras, Catálogo y "Más"; el resto se abre en la hoja', async () => {
    const usuario = userEvent.setup()
    iniciarComo(CESAR)
    renderizarApp('/')

    const barra = await screen.findByRole('navigation', { name: 'Menú principal móvil' })
    const enBarra = within(barra).getAllByRole('listitem').map(li => li.textContent)
    expect(enBarra).toEqual(['Agregar', 'Lista', 'Catálogo', 'Más'])

    await usuario.click(within(barra).getByRole('button', { name: 'Más' }))
    const hoja = await screen.findByRole('dialog', { name: 'Más opciones' })
    const opciones = within(hoja).getAllByRole('listitem').map(li => li.textContent)
    expect(opciones).toEqual(['Gestor de usuarios', 'Cerrar sesión'])

    // Elegir una opción navega y cierra la hoja
    await usuario.click(within(hoja).getByRole('link', { name: 'Gestor de usuarios' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Más opciones' })).not.toBeInTheDocument())
    expect(await screen.findByRole('heading', { name: 'Gestor de usuarios', level: 1 })).toBeInTheDocument()
  })

  it('un operador solo ve en "Más" lo que tiene permitido, y siempre Cerrar sesión', async () => {
    const usuario = userEvent.setup()
    iniciarComo({ ...MARTA, permisos: ['/', '/compras'] })
    renderizarApp('/')

    const barra = await screen.findByRole('navigation', { name: 'Menú principal móvil' })
    expect(within(barra).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Agregar', 'Lista', 'Más'])

    await usuario.click(within(barra).getByRole('button', { name: 'Más' }))
    const hoja = await screen.findByRole('dialog', { name: 'Más opciones' })
    expect(within(hoja).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Cerrar sesión'])

    await usuario.click(within(hoja).getByRole('button', { name: 'Cerrar sesión' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.cerrarSesion.confirmar }))
    expect(await screen.findByRole('button', { name: /ingresar/i })).toBeInTheDocument()
  })
})
