import { RUTAS_ASIGNABLES, puedeAcceder, rutaInicio } from './permisos'

const ADMIN = { usuario: 'Cesar_01', rol: 'admin', permisos: ['*'] }
const MARTA = { usuario: 'Marta_02', rol: 'operador', permisos: [...RUTAS_ASIGNABLES] }

describe('permisos', () => {
  it('el administrador entra a todas las pantallas, también a las que se creen después', () => {
    for (const ruta of [...RUTAS_ASIGNABLES, '/usuarios', '/configuracion/proveedores', '/pantalla-futura']) {
      expect(puedeAcceder(ruta, ADMIN)).toBe(true)
    }
  })

  it('un operador entra solo a sus pantallas (y sus subrutas), nunca al Gestor de usuarios', () => {
    expect(puedeAcceder('/configuracion/proveedores', MARTA)).toBe(true)
    expect(puedeAcceder('/usuarios', MARTA)).toBe(false)
    // Aunque la lista lo traiga por error, el gestor sigue cerrado
    expect(puedeAcceder('/usuarios', { rol: 'operador', permisos: ['/usuarios', '*'] })).toBe(false)
    expect(puedeAcceder('/pantalla-futura', MARTA)).toBe(false)

    const soloCompras = { rol: 'operador', permisos: ['/compras'] }
    expect(puedeAcceder('/compras', soloCompras)).toBe(true)
    expect(puedeAcceder('/', soloCompras)).toBe(false)
    expect(puedeAcceder('/configuracion', soloCompras)).toBe(false)
  })

  it('sin sesión no entra a nada', () => {
    expect(puedeAcceder('/', null)).toBe(false)
  })

  it('la pantalla de inicio es Agregar compra o, si no la tiene, la primera de su lista', () => {
    expect(rutaInicio(ADMIN)).toBe('/')
    expect(rutaInicio(MARTA)).toBe('/')
    expect(rutaInicio({ rol: 'operador', permisos: ['/exportar', '/compras'] })).toBe('/compras')
  })
})
