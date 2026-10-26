import { FUNCIONES, RUTAS_ASIGNABLES, migrarPermisos, permisosDeRol, puedeAcceder, puedeHacer, rutaInicio } from './permisos'

const ADMIN = { usuario: 'Cesar_01', rol: 'admin', permisos: ['*'] }
const MARTA = { usuario: 'Marta_02', rol: 'operador', permisos: [...RUTAS_ASIGNABLES] }

describe('permisos', () => {
  it('el administrador entra a todas las pantallas, también a las que se creen después', () => {
    for (const ruta of [...RUTAS_ASIGNABLES, '/usuarios', '/catalogo/proveedores', '/pantalla-futura']) {
      expect(puedeAcceder(ruta, ADMIN)).toBe(true)
    }
  })

  it('un operador entra solo a sus pantallas (y sus subrutas), nunca al Gestor de usuarios', () => {
    expect(puedeAcceder('/catalogo/proveedores', MARTA)).toBe(true)
    expect(puedeAcceder('/usuarios', MARTA)).toBe(false)
    // Aunque la lista lo traiga por error, el gestor sigue cerrado
    expect(puedeAcceder('/usuarios', { rol: 'operador', permisos: ['/usuarios', '*'] })).toBe(false)
    expect(puedeAcceder('/pantalla-futura', MARTA)).toBe(false)

    const soloCompras = { rol: 'operador', permisos: ['/compras'] }
    expect(puedeAcceder('/compras', soloCompras)).toBe(true)
    expect(puedeAcceder('/', soloCompras)).toBe(false)
    expect(puedeAcceder('/catalogo', soloCompras)).toBe(false)
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

describe('migrarPermisos', () => {
  it('pasa /configuracion a /catalogo sin repetir y deja lo demás igual', () => {
    expect(migrarPermisos(['/compras', '/configuracion'])).toEqual(['/compras', '/catalogo'])
    expect(migrarPermisos(['/configuracion', '/catalogo'])).toEqual(['/catalogo'])
    expect(migrarPermisos(['*'])).toEqual(['*'])
  })
})

describe('puedeHacer y los roles', () => {
  const EMPLEADO = { usuario: 'Ana_04', rol: 'empleado', ...permisosDeRol('empleado') }

  it('el administrador puede hacer todo', () => {
    for (const funcion of FUNCIONES) expect(puedeHacer(funcion, ADMIN)).toBe(true)
  })

  it('el empleado trae Agregar compra y Lista de compras: edita compras pero no las elimina ni entra al Catálogo', () => {
    expect(EMPLEADO.permisos).toEqual(['/', '/compras'])
    expect(puedeHacer('compras.editar', EMPLEADO)).toBe(true)
    expect(puedeHacer('compras.eliminar', EMPLEADO)).toBe(false)
    expect(puedeAcceder('/catalogo', EMPLEADO)).toBe(false)
    expect(puedeHacer('catalogo.agregar', EMPLEADO)).toBe(false)
  })

  it('una función sin su pantalla no sirve', () => {
    expect(puedeHacer('catalogo.agregar', { rol: 'operador', permisos: ['/compras'], funciones: ['catalogo.agregar'] })).toBe(false)
  })

  it('una sesión sin lista de funciones (de antes) las tiene todas en sus pantallas', () => {
    expect(puedeHacer('compras.eliminar', MARTA)).toBe(true)
    expect(puedeHacer('catalogo.eliminar', { rol: 'operador', permisos: ['/compras'] })).toBe(false)
  })

  it('sin sesión no hace nada', () => {
    expect(puedeHacer('compras.editar', null)).toBe(false)
  })
})
