import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

function ComponentePrueba() {
  const { autenticado, ingresar, salir } = useAuth()
  return (
    <div>
      <span data-testid="estado">{autenticado ? 'autenticado' : 'bloqueado'}</span>
      <button onClick={() => ingresar('1234')}>Ingresar correcto</button>
      <button onClick={() => ingresar('0000')}>Ingresar incorrecto</button>
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
  })

  it('rechaza contraseñas incorrectas', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar incorrecto'))
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
  })

  it('permite el acceso con la contraseña 1234', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar correcto'))
    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado')
    expect(sessionStorage.getItem('depanas_autenticado')).toBe('true')
  })

  it('permite cerrar sesión / bloquear de nuevo', async () => {
    const usuario = userEvent.setup()
    render(
      <AuthProvider>
        <ComponentePrueba />
      </AuthProvider>
    )
    await usuario.click(screen.getByText('Ingresar correcto'))
    expect(screen.getByTestId('estado')).toHaveTextContent('autenticado')

    await usuario.click(screen.getByText('Salir'))
    expect(screen.getByTestId('estado')).toHaveTextContent('bloqueado')
    expect(sessionStorage.getItem('depanas_autenticado')).toBeNull()
  })
})
