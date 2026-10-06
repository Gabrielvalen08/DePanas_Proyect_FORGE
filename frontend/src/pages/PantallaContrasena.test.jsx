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

  it('renderiza el título, el input y el teclado numérico', () => {
    renderizar()
    expect(screen.getByRole('heading', { name: ACCESO.titulo })).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña de acceso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ACCESO.boton })).toBeInTheDocument()
    // Teclas 0 a 9
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
    }
  })

  it('muestra error al enviar con campo vacío', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))
    expect(screen.getByRole('alert')).toHaveTextContent(ACCESO.faltaContrasena)
  })

  it('muestra error cuando la contraseña es incorrecta', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const input = screen.getByLabelText('Contraseña de acceso')
    await usuario.type(input, '9999')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))
    expect(screen.getByRole('alert')).toHaveTextContent(ACCESO.incorrecta)
  })

  it('permite ingresar usando el teclado numérico en pantalla', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const input = screen.getByLabelText('Contraseña de acceso')

    await usuario.click(screen.getByRole('button', { name: '1' }))
    await usuario.click(screen.getByRole('button', { name: '2' }))
    await usuario.click(screen.getByRole('button', { name: '3' }))
    await usuario.click(screen.getByRole('button', { name: '4' }))

    expect(input).toHaveValue('1234')
  })

  it('permite borrar y limpiar dígitos con los botones del teclado', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const input = screen.getByLabelText('Contraseña de acceso')

    await usuario.click(screen.getByRole('button', { name: '5' }))
    await usuario.click(screen.getByRole('button', { name: '6' }))
    expect(input).toHaveValue('56')

    await usuario.click(screen.getByTitle('Borrar'))
    expect(input).toHaveValue('5')

    await usuario.click(screen.getByTitle('Limpiar'))
    expect(input).toHaveValue('')
  })

  it('alterna la visibilidad de la contraseña con el botón de ojo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const input = screen.getByLabelText('Contraseña de acceso')
    const botonOjo = screen.getByRole('button', { name: 'Ver contraseña' })

    expect(input).toHaveAttribute('type', 'password')
    await usuario.click(botonOjo)
    expect(input).toHaveAttribute('type', 'text')
    await usuario.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('autentica con éxito al ingresar 1234', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const input = screen.getByLabelText('Contraseña de acceso')
    await usuario.type(input, '1234')
    await usuario.click(screen.getByRole('button', { name: ACCESO.boton }))

    await waitFor(() => {
      expect(sessionStorage.getItem('depanas_autenticado')).toBe('true')
    })
  })
})
