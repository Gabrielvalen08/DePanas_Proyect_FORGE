import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../context/AuthContext'
import PantallaContrasena from './PantallaContrasena'
import { ACCESO } from '../utils/mensajes'

function renderizar() {
  return render(
    <AuthProvider>
      <PantallaContrasena />
    </AuthProvider>
  )
}

describe('PantallaContrasena', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('renderiza el título, los inputs de usuario y contraseña y los botones', () => {
    renderizar()
    expect(screen.getByRole('heading', { name: ACCESO.titulo })).toBeInTheDocument()
    expect(screen.getByLabelText(ACCESO.etiquetaUsuario)).toBeInTheDocument()
    expect(screen.getByLabelText(ACCESO.etiquetaContrasena)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ACCESO.boton })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ACCESO.olvideContrasena })).toBeInTheDocument()
  })

  it('muestra error al enviar con campos vacíos', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))
    expect(screen.getByRole('alert')).toHaveTextContent(ACCESO.faltaUsuario)

    const inputUsuario = screen.getByLabelText(ACCESO.etiquetaUsuario)
    await usuario.type(inputUsuario, 'Cesar_01')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))
    expect(screen.getByRole('alert')).toHaveTextContent(ACCESO.faltaContrasena)
  })

  it('muestra error cuando el usuario o la contraseña son incorrectos', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const inputUsuario = screen.getByLabelText(ACCESO.etiquetaUsuario)
    const inputContrasena = screen.getByLabelText(ACCESO.etiquetaContrasena)

    await usuario.type(inputUsuario, 'Cesar_01')
    await usuario.type(inputContrasena, '9999')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))
    expect(await screen.findByRole('alert')).toHaveTextContent(ACCESO.incorrecta)
    expect(sessionStorage.getItem('depanas_sesion')).toBeNull()
  })

  it('alterna la visibilidad de la contraseña con el botón de ojo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const inputContrasena = screen.getByLabelText(ACCESO.etiquetaContrasena)
    const botonOjo = screen.getByRole('button', { name: 'Ver contraseña' })

    expect(inputContrasena).toHaveAttribute('type', 'password')
    await usuario.click(botonOjo)
    expect(inputContrasena).toHaveAttribute('type', 'text')
    await usuario.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(inputContrasena).toHaveAttribute('type', 'password')
  })

  it('muestra el mensaje de ayuda al hacer clic en Olvidé mi contraseña', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const botonOlvide = screen.getByRole('button', { name: ACCESO.olvideContrasena })
    await usuario.click(botonOlvide)
    expect(screen.getByRole('status')).toHaveTextContent(ACCESO.ayudaOlvide)
  })

  it('autentica con éxito al ingresar Cesar_01 y 1234', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const inputUsuario = screen.getByLabelText(ACCESO.etiquetaUsuario)
    const inputContrasena = screen.getByLabelText(ACCESO.etiquetaContrasena)

    await usuario.type(inputUsuario, 'Cesar_01')
    await usuario.type(inputContrasena, '1234')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))

    await waitFor(() => {
      expect(JSON.parse(sessionStorage.getItem('depanas_sesion'))).toMatchObject({ usuario: 'Cesar_01', rol: 'admin' })
    })
  })

  it('autentica con éxito al ingresar Marta_02 y 5678', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const inputUsuario = screen.getByLabelText(ACCESO.etiquetaUsuario)
    const inputContrasena = screen.getByLabelText(ACCESO.etiquetaContrasena)

    await usuario.type(inputUsuario, 'Marta_02')
    await usuario.type(inputContrasena, '5678')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))

    await waitFor(() => {
      expect(JSON.parse(sessionStorage.getItem('depanas_sesion'))).toMatchObject({ usuario: 'Marta_02', rol: 'operador' })
    })
  })
})
