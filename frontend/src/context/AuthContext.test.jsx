import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'
import { reiniciarModo } from '../services/api'

// Usa api.js real en modo local (sin servidor): los usuarios iniciales, con contraseñas en hash
function ComponentePrueba() {
  const { autenticado, usuario, esAdmin, tienePermiso, ingresar, salir } = useAuth()
  return (
    <div>
      <span data-testid="estado">{autenticado ? 'autenticado' : 'bloqueado'}</span>
      <span data-testid="usuario">{usuario || 'ninguno'}</span>
      <span data-testid="admin">{esAdmin ? 'si' : 'no'}</span>
      <span data-testid="permiso-config">{tienePermiso('/configuracion') ? 'si' : 'no'}</span>
      <span data-testid="permiso-compras">{tienePermiso('/compras') ? 'si' : 'no'}</span>
      <span data-testid="permiso-usuarios">{tienePermiso('/usuarios') ? 'si' : 'no'}</span>
      <button onClick={() => ingresar('Cesar_01', '1234')}>Ingresar Cesar</button>
      <button onClick={() => ingresar('Marta_02', '5678')}>Ingresar Marta</button>
      <button onClick={() => ingresar('Cesar_01', '0000')}>Ingresar Cesar Incorrecto</button>
      <button onClick={() => ingresar('Usuario_Invalido', '1234')}>Ingresar Invalido</button>
      <button onClick={() => ingresar('1234')}>Solo contraseña</button>
      <button onClick={() => salir()}>Salir</button>
    </div>
  )
}

function renderizar() {
  return render(
    <AuthProvider>
      <ComponentePrueba />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear()
    reiniciarModo()
  })

  it('inicia bloqueado si no hay sesión previa', () => {
    renderizar()
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
    expect(screen.getByTestId('usuario')).toHaveTextContent('ninguno')
    expect(screen.getByTestId('permiso-config')).toHaveTextContent('no')
  })

  it('rechaza contraseñas incorrectas, usuarios no registrados y la contraseña sin usuario', async () => {
    const usuario = userEvent.setup()
    renderizar()
    for (const boton of ['Ingresar Cesar Incorrecto', 'Ingresar Invalido', 'Solo contraseña']) {
      await usuario.click(screen.getByText(boton))
    }
    // Da tiempo a que terminen las verificaciones de contraseña
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
    expect(sessionStorage.getItem('depanas_sesion')).toBeNull()
  })

  it('Cesar_01 es el administrador: entra a todo, también al Gestor de usuarios', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByText('Ingresar Cesar'))
    expect(await screen.findByText('autenticado')).toBeInTheDocument()
    expect(screen.getByTestId('usuario')).toHaveTextContent('Cesar_01')
    expect(screen.getByTestId('admin')).toHaveTextContent('si')
    expect(screen.getByTestId('permiso-config')).toHaveTextContent('si')
    expect(screen.getByTestId('permiso-usuarios')).toHaveTextContent('si')
    expect(JSON.parse(sessionStorage.getItem('depanas_sesion'))).toEqual({
      usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'],
    })
  })

  it('Marta_02 entra a compras y configuración, pero no al Gestor de usuarios', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByText('Ingresar Marta'))
    expect(await screen.findByText('autenticado')).toBeInTheDocument()
    expect(screen.getByTestId('usuario')).toHaveTextContent('Marta_02')
    expect(screen.getByTestId('admin')).toHaveTextContent('no')
    expect(screen.getByTestId('permiso-compras')).toHaveTextContent('si')
    expect(screen.getByTestId('permiso-config')).toHaveTextContent('si')
    expect(screen.getByTestId('permiso-usuarios')).toHaveTextContent('no')
  })

  it('recupera la sesión guardada al recargar', () => {
    sessionStorage.setItem('depanas_sesion', JSON.stringify({ usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: ['/compras'] }))
    renderizar()
    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado')
    expect(screen.getByTestId('permiso-compras')).toHaveTextContent('si')
    expect(screen.getByTestId('permiso-config')).toHaveTextContent('no')
  })

  it('permite cerrar sesión / bloquear de nuevo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByText('Ingresar Cesar'))
    expect(await screen.findByText('autenticado')).toBeInTheDocument()

    await usuario.click(screen.getByText('Salir'))
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
    expect(screen.getByTestId('usuario')).toHaveTextContent('ninguno')
    expect(sessionStorage.getItem('depanas_sesion')).toBeNull()
  })
})
