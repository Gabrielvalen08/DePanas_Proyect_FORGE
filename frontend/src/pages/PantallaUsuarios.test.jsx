import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { AuthProvider } from '../context/AuthContext'
import { iniciarSesion, reiniciarModo } from '../services/api'
import { USUARIOS } from '../utils/mensajes'
import PantallaUsuarios from './PantallaUsuarios'

// Usa api.js real en modo local (sin servidor), sobre localStorage
function renderizar() {
  sessionStorage.setItem('depanas_sesion', JSON.stringify({ usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'] }))
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <PantallaUsuarios />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

async function abrirNuevo(usuario) {
  await usuario.click(await screen.findByRole('button', { name: USUARIOS.agregar }))
  return screen.getByRole('dialog', { name: USUARIOS.tituloNuevo })
}

async function llenar(usuario, ventana, { user = 'Luis_03', nombre = 'Luis', clave = 'tequeno1', confirmar = clave } = {}) {
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.usuario), user)
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.nombre), nombre)
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.contrasena), clave)
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.confirmar), confirmar)
}

describe('PantallaUsuarios', () => {
  beforeEach(() => {
    sessionStorage.clear()
    reiniciarModo()
  })

  it('lista a los usuarios: César es el administrador (todas las pantallas, sin eliminar) y Marta operadora', async () => {
    renderizar()
    const cesar = (await screen.findByRole('rowheader', { name: /Cesar_01/ })).closest('tr')
    expect(within(cesar).getByText(USUARIOS.roles.admin)).toBeInTheDocument()
    expect(within(cesar).getByText(USUARIOS.todas)).toBeInTheDocument()
    expect(within(cesar).getByText(USUARIOS.tu)).toBeInTheDocument()
    expect(within(cesar).queryByRole('button', { name: USUARIOS.eliminar('Cesar_01') })).not.toBeInTheDocument()

    const marta = screen.getByRole('rowheader', { name: /Marta_02/ }).closest('tr')
    expect(within(marta).getByText(USUARIOS.roles.operador)).toBeInTheDocument()
    expect(within(marta).getByText('5 de 5')).toBeInTheDocument()
    expect(within(marta).getByRole('button', { name: USUARIOS.eliminar('Marta_02') })).toBeInTheDocument()
  })

  it('crea un usuario con sus pantallas y puede iniciar sesión', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await llenar(usuario, ventana)
    await usuario.click(within(ventana).getByRole('checkbox', { name: /Compras/ }))
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))

    expect(await screen.findByText(USUARIOS.creado({ nombre: 'Luis', usuario: 'Luis_03' }))).toBeInTheDocument()
    const fila = (await screen.findByRole('rowheader', { name: /Luis_03/ })).closest('tr')
    expect(within(fila).getByText('1 de 5')).toBeInTheDocument()
    expect(await iniciarSesion('Luis_03', 'tequeno1')).toEqual({ usuario: 'Luis_03', nombre: 'Luis', rol: 'operador', permisos: ['/compras'] })
  })

  it('el Gestor de usuarios no aparece entre las pantallas que se pueden dar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    expect(within(ventana).getAllByRole('checkbox')).toHaveLength(5)
    expect(within(ventana).queryByRole('checkbox', { name: /usuarios/i })).not.toBeInTheDocument()
  })

  it('no deja crear un usuario repetido y pide cambiarlo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await llenar(usuario, ventana, { user: 'marta_02' })
    await usuario.click(within(ventana).getByRole('checkbox', { name: /Compras/ }))
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))

    const campo = within(ventana).getByLabelText(USUARIOS.campos.usuario)
    expect(campo).toHaveAccessibleDescription(expect.stringContaining(USUARIOS.validacion.usuarioRepetido('Marta_02')))
    expect(campo).toHaveFocus()
  })

  it('no deja usar la contraseña de otro usuario y pide cambiarla', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await llenar(usuario, ventana, { clave: '5678' })
    await usuario.click(within(ventana).getByRole('checkbox', { name: /Compras/ }))
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))

    const campo = within(ventana).getByLabelText(USUARIOS.campos.contrasena)
    expect(await within(ventana).findByText(USUARIOS.validacion.contrasenaRepetida)).toBeInTheDocument()
    expect(campo).toHaveFocus()
    expect(screen.getByRole('dialog', { name: USUARIOS.tituloNuevo })).toBeInTheDocument()
  })

  it('pide al menos una pantalla y que las contraseñas coincidan', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await llenar(usuario, ventana, { confirmar: 'otra' })
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))
    expect(within(ventana).getByText(USUARIOS.validacion.noCoinciden)).toBeInTheDocument()
    expect(within(ventana).getByText(USUARIOS.validacion.permisos)).toBeInTheDocument()
  })

  it('edita la contraseña y las pantallas de Marta', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await screen.findByRole('button', { name: USUARIOS.editar('Marta_02') }))
    const ventana = screen.getByRole('dialog', { name: USUARIOS.tituloEditar('Marta_02') })
    expect(within(ventana).getByLabelText(USUARIOS.campos.usuario)).toBeDisabled()
    await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.contrasenaNueva), 'cachito7')
    await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.confirmar), 'cachito7')
    await usuario.click(within(ventana).getByRole('checkbox', { name: /Configuración/ }))
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))

    expect(await screen.findByText(USUARIOS.editado({ usuario: 'Marta_02' }))).toBeInTheDocument()
    expect(await iniciarSesion('Marta_02', 'cachito7')).toMatchObject({ permisos: ['/', '/compras', '/exportar', '/cargar'] })
    await expect(iniciarSesion('Marta_02', '5678')).rejects.toThrow()
  })

  it('al editar al administrador no se eligen pantallas: entra a todas', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await screen.findByRole('button', { name: USUARIOS.editar('Cesar_01') }))
    const ventana = screen.getByRole('dialog', { name: USUARIOS.tituloEditar('Cesar_01') })
    expect(within(ventana).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(ventana).getByText(USUARIOS.permisosAdmin)).toBeInTheDocument()
  })

  it('elimina un usuario después de confirmar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await screen.findByRole('button', { name: USUARIOS.eliminar('Marta_02') }))
    await usuario.click(screen.getByRole('button', { name: USUARIOS.confirmarEliminar.confirmar }))

    expect(await screen.findByText(USUARIOS.eliminado('Marta_02'))).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: /Marta_02/ })).not.toBeInTheDocument()
    await expect(iniciarSesion('Marta_02', '5678')).rejects.toThrow()
  })
})
