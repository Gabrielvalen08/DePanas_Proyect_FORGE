import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth, puedeAcceder, USUARIOS } from './AuthContext'

function ComponentePrueba() {
  const { autenticado, usuario, tienePermiso, ingresar, salir } = useAuth()
  return (
    <div>
      <span data-testid="estado">{autenticado ? 'autenticado' : 'bloqueado'}</span>
      <span data-testid="usuario">{usuario || 'ninguno'}</span>
      <span data-testid="permiso-config">{tienePermiso('/configuracion') ? 'si' : 'no'}</span>
      <span data-testid="permiso-compras">{tienePermiso('/compras') ? 'si' : 'no'}</span>
      <button onClick={() => ingresar('Cesar_01', '1234')}>Ingresar Cesar</button>
      <button onClick={() => ingresar('Marta_02', '5678')}>Ingresar Marta</button>
      <button onClick={() => ingresar('Cesar_01', '0000')}>Ingresar Cesar Incorrecto</button>
      <button onClick={() => ingresar('Usuario_Invalido', '1234')}>Ingresar Invalido</button>
      <button onClick={() => salir()}>Salir</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('inicia bloqueado si no hay sesión previa', () => {
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
    expect(screen.getByTestId('usuario')).toHaveTextContent('ninguno')
    expect(screen.getByTestId('permiso-config')).toHaveTextContent('no')
  })

  it('rechaza contraseñas incorrectas para Cesar_01', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar Cesar Incorrecto'))
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
    expect(screen.getByTestId('usuario')).toHaveTextContent('ninguno')
  })

  it('rechaza usuarios no registrados', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar Invalido'))
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
  })

  it('permite el acceso a Cesar_01 con la contraseña 1234 y otorga permisos completos incluyendo configuración', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar Cesar'))
    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado')
    expect(screen.getByTestId('usuario')).toHaveTextContent('Cesar_01')
    expect(screen.getByTestId('permiso-config')).toHaveTextContent('si')
    expect(screen.getByTestId('permiso-compras')).toHaveTextContent('si')
    expect(sessionStorage.getItem('depanas_autenticado')).toBe('true')
    expect(sessionStorage.getItem('depanas_usuario')).toBe('Cesar_01')
  })

  it('permite el acceso a Marta_02 con 5678, con acceso a compras pero sin acceso a configuración', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar Marta'))
    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado')
    expect(screen.getByTestId('usuario')).toHaveTextContent('Marta_02')
    expect(screen.getByTestId('permiso-config')).toHaveTextContent('no')
    expect(screen.getByTestId('permiso-compras')).toHaveTextContent('si')
    expect(sessionStorage.getItem('depanas_autenticado')).toBe('true')
    expect(sessionStorage.getItem('depanas_usuario')).toBe('Marta_02')
  })

  it('puedeAcceder valida permisos de rutas individuales y subrutas', () => {
    expect(puedeAcceder('/configuracion', 'Cesar_01')).toBe(true)
    expect(puedeAcceder('/configuracion/proveedores', 'Cesar_01')).toBe(true)
    expect(puedeAcceder('/compras', 'Cesar_01')).toBe(true)

    expect(puedeAcceder('/configuracion', 'Marta_02')).toBe(false)
    expect(puedeAcceder('/configuracion/proveedores', 'Marta_02')).toBe(false)
    expect(puedeAcceder('/', 'Marta_02')).toBe(true)
    expect(puedeAcceder('/compras', 'Marta_02')).toBe(true)
    expect(puedeAcceder('/exportar', 'Marta_02')).toBe(true)
    expect(puedeAcceder('/cargar', 'Marta_02')).toBe(true)
  })

  it('permite cerrar sesión / bloquear de nuevo', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar Cesar'))
    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado')

    await usuario.click(screen.getByText('Salir'))
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
    expect(screen.getByTestId('usuario')).toHaveTextContent('ninguno')
    expect(sessionStorage.getItem('depanas_autenticado')).toBeNull()
    expect(sessionStorage.getItem('depanas_usuario')).toBeNull()
  })
})
