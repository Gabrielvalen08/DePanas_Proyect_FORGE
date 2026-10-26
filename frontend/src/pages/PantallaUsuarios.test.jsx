import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { AuthProvider } from '../context/AuthContext'
import { fetchRequisitosContrasena, iniciarSesion, reiniciarModo } from '../services/api'
import { CONFIRMAR, USUARIOS } from '../utils/mensajes'
import PantallaUsuarios from './PantallaUsuarios'

// Usa api.js real en modo local (sin servidor), sobre localStorage
function renderizar() {
  sessionStorage.setItem('depanas_sesion', JSON.stringify({ usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'], funciones: ['*'] }))
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

/** Los botones del gestor se activan cuando llegan los requisitos de contraseña */
async function boton(nombre) {
  const b = await screen.findByRole('button', { name: nombre })
  await waitFor(() => expect(b).toBeEnabled())
  return b
}

async function abrirNuevo(usuario) {
  await usuario.click(await boton(USUARIOS.agregar))
  return screen.getByRole('dialog', { name: USUARIOS.tituloNuevo })
}

async function llenar(usuario, ventana, { user = 'Luis_03', nombre = 'Luis', clave = 'Tequeño#1', confirmar = clave } = {}) {
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.usuario), user)
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.nombre), nombre)
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.contrasena), clave)
  await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.confirmar), confirmar)
}

async function guardarYConfirmar(usuario, ventana) {
  await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))
  await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))
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

  it('muestra los requisitos de contraseña vigentes', async () => {
    renderizar()
    const tarjeta = (await screen.findByRole('heading', { name: USUARIOS.requisitos.titulo })).closest('section')
    expect(await within(tarjeta).findByText('Al menos 8 caracteres')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Una letra mayúscula')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Un carácter especial (! @ # $ % & * …)')).toBeInTheDocument()
  })

  it('un usuario nuevo es empleado por defecto: Agregar compra y Lista de compras, sin eliminar compras', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    expect(within(ventana).getByRole('radio', { name: /Empleado/ })).toBeChecked()
    expect(within(ventana).getByRole('checkbox', { name: /^Agregar compra/ })).toBeChecked()
    expect(within(ventana).getByRole('checkbox', { name: /^Lista de compras/ })).toBeChecked()
    expect(within(ventana).getByRole('checkbox', { name: /^Catálogo/ })).not.toBeChecked()
    expect(within(ventana).getByRole('checkbox', { name: USUARIOS.funciones['compras.editar'] })).toBeChecked()
    expect(within(ventana).getByRole('checkbox', { name: USUARIOS.funciones['compras.eliminar'] })).not.toBeChecked()
    // Las funciones del Catálogo no se ven mientras no tenga la pantalla
    expect(within(ventana).queryByRole('checkbox', { name: USUARIOS.funciones['catalogo.agregar'] })).not.toBeInTheDocument()
  })

  it('elegir Operador aplica sus pantallas y funciones; después se pueden ajustar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await usuario.click(within(ventana).getByRole('radio', { name: /Operador/ }))
    for (const pantalla of [/^Agregar compra/, /^Lista de compras/, /^Catálogo/, /^Exportar datos/, /^Cargar datos/]) {
      expect(within(ventana).getByRole('checkbox', { name: pantalla })).toBeChecked()
    }
    expect(within(ventana).getByRole('checkbox', { name: USUARIOS.funciones['catalogo.eliminar'] })).toBeChecked()

    // Ajuste: sin eliminar en el Catálogo
    await llenar(usuario, ventana)
    await usuario.click(within(ventana).getByRole('checkbox', { name: USUARIOS.funciones['catalogo.eliminar'] }))
    await guardarYConfirmar(usuario, ventana)

    expect(await screen.findByText(USUARIOS.creado({ nombre: 'Luis', usuario: 'Luis_03' }))).toBeInTheDocument()
    const fila = (await screen.findByRole('rowheader', { name: /Luis_03/ })).closest('tr')
    expect(within(fila).getByText(USUARIOS.funcionesLimitadas(1))).toBeInTheDocument()
    const sesion = await iniciarSesion('Luis_03', 'Tequeño#1')
    expect(sesion.rol).toBe('operador')
    expect(sesion.funciones).not.toContain('catalogo.eliminar')
    expect(sesion.funciones).toContain('compras.eliminar')
  })

  it('crea un empleado que no puede eliminar compras y puede iniciar sesión', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await llenar(usuario, ventana)
    await guardarYConfirmar(usuario, ventana)

    expect(await screen.findByText(USUARIOS.creado({ nombre: 'Luis', usuario: 'Luis_03' }))).toBeInTheDocument()
    const fila = (await screen.findByRole('rowheader', { name: /Luis_03/ })).closest('tr')
    expect(within(fila).getByText(USUARIOS.roles.empleado)).toBeInTheDocument()
    expect(within(fila).getByText('2 de 5')).toBeInTheDocument()
    expect(await iniciarSesion('Luis_03', 'Tequeño#1')).toEqual({
      usuario: 'Luis_03', nombre: 'Luis', rol: 'empleado', permisos: ['/', '/compras'], funciones: ['compras.editar'],
    })
  })

  it('la contraseña muestra en vivo qué requisitos cumple y no se guarda si falta alguno', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    const requisitos = within(ventana).getByText(USUARIOS.requisitosLista).parentElement
    expect(within(requisitos).getAllByText(`: ${USUARIOS.requisitoFalta}`)).toHaveLength(5)

    await llenar(usuario, ventana, { clave: 'arepa99' })
    expect(within(requisitos).getByText('Un número').parentElement).toHaveTextContent(USUARIOS.requisitoCumple)
    expect(within(requisitos).getByText('Una letra mayúscula').parentElement).toHaveTextContent(USUARIOS.requisitoFalta)

    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))
    const campo = within(ventana).getByLabelText(USUARIOS.campos.contrasena)
    expect(campo).toHaveAccessibleDescription(expect.stringContaining('una letra mayúscula'))
    expect(campo).toHaveFocus()
    // No llega a pedir confirmación
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('el Gestor de usuarios no aparece entre las pantallas que se pueden dar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    expect(within(ventana).queryByRole('checkbox', { name: /usuarios/i })).not.toBeInTheDocument()
    expect(within(ventana).getByText(USUARIOS.permisosNota)).toBeInTheDocument()
  })

  it('no deja crear un usuario repetido y pide cambiarlo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await llenar(usuario, ventana, { user: 'marta_02' })
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))

    const campo = within(ventana).getByLabelText(USUARIOS.campos.usuario)
    expect(campo).toHaveAccessibleDescription(expect.stringContaining(USUARIOS.validacion.usuarioRepetido('Marta_02')))
    expect(campo).toHaveFocus()
  })

  it('no deja usar la contraseña de otro usuario y pide cambiarla', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await llenar(usuario, ventana, { clave: 'DePanas#2026' })
    await guardarYConfirmar(usuario, ventana)

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
    await usuario.click(within(ventana).getByRole('checkbox', { name: /^Agregar compra/ }))
    await usuario.click(within(ventana).getByRole('checkbox', { name: /^Lista de compras/ }))
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))
    expect(within(ventana).getByText(USUARIOS.validacion.noCoinciden)).toBeInTheDocument()
    expect(within(ventana).getByText(USUARIOS.validacion.permisos)).toBeInTheDocument()
  })

  it('al cancelar con datos escritos pide descartar; sin cambios se cierra solo (también al editar)', async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ventana = await abrirNuevo(usuario)
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.cancelar }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: USUARIOS.tituloNuevo })).not.toBeInTheDocument())

    const otra = await abrirNuevo(usuario)
    await usuario.type(within(otra).getByLabelText(USUARIOS.campos.nombre), 'Luis')
    await usuario.click(within(otra).getByRole('button', { name: USUARIOS.cancelar }))
    const descartar = await screen.findByRole('alertdialog', { name: CONFIRMAR.descartar.titulo })
    await usuario.click(within(descartar).getByRole('button', { name: CONFIRMAR.descartar.volver }))
    expect(within(otra).getByLabelText(USUARIOS.campos.nombre)).toHaveValue('Luis')

    await usuario.click(within(otra).getByRole('button', { name: USUARIOS.cancelar }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.descartar.confirmar }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: USUARIOS.tituloNuevo })).not.toBeInTheDocument())

    // Editar a Marta y cancelar sin tocar nada: no pregunta
    await usuario.click(await boton(USUARIOS.editar('Marta_02')))
    const edicion = screen.getByRole('dialog', { name: USUARIOS.tituloEditar('Marta_02') })
    await usuario.click(within(edicion).getByRole('button', { name: USUARIOS.cancelar }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: USUARIOS.tituloEditar('Marta_02') })).not.toBeInTheDocument())
  })

  it('edita la contraseña, el rol y las funciones de Marta', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await boton(USUARIOS.editar('Marta_02')))
    const ventana = screen.getByRole('dialog', { name: USUARIOS.tituloEditar('Marta_02') })
    expect(within(ventana).getByLabelText(USUARIOS.campos.usuario)).toBeDisabled()
    expect(within(ventana).getByRole('radio', { name: /Operador/ })).toBeChecked()
    await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.contrasenaNueva), 'Cachito#7')
    await usuario.type(within(ventana).getByLabelText(USUARIOS.campos.confirmar), 'Cachito#7')
    await usuario.click(within(ventana).getByRole('checkbox', { name: USUARIOS.funciones['compras.eliminar'] }))
    await guardarYConfirmar(usuario, ventana)

    expect(await screen.findByText(USUARIOS.editado({ usuario: 'Marta_02' }))).toBeInTheDocument()
    const sesion = await iniciarSesion('Marta_02', 'Cachito#7')
    expect(sesion.funciones).not.toContain('compras.eliminar')
    expect(sesion.funciones).toContain('compras.editar')
    await expect(iniciarSesion('Marta_02', '5678')).rejects.toThrow()
  })

  it('al editar al administrador no se eligen rol, pantallas ni funciones: entra a todo', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await boton(USUARIOS.editar('Cesar_01')))
    const ventana = screen.getByRole('dialog', { name: USUARIOS.tituloEditar('Cesar_01') })
    expect(within(ventana).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(ventana).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(ventana).getByText(content => content.includes(USUARIOS.permisosAdmin))).toBeInTheDocument()
  })

  it('el administrador cambia los requisitos de contraseña', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(await boton(USUARIOS.requisitos.editar))
    const ventana = screen.getByRole('dialog', { name: USUARIOS.requisitos.tituloEditor })
    const minimo = within(ventana).getByLabelText(USUARIOS.requisitos.minimo)
    await usuario.clear(minimo)
    await usuario.type(minimo, '2')
    await usuario.click(within(ventana).getByRole('button', { name: USUARIOS.guardar }))
    expect(minimo).toHaveAccessibleDescription(expect.stringContaining('De 4 a 64'))

    await usuario.clear(minimo)
    await usuario.type(minimo, '10')
    await usuario.click(within(ventana).getByRole('checkbox', { name: USUARIOS.requisitos.opciones.especial }))
    await guardarYConfirmar(usuario, ventana)

    expect(await screen.findByText(USUARIOS.requisitos.guardado)).toBeInTheDocument()
    expect(await fetchRequisitosContrasena()).toEqual({ minimo: 10, mayuscula: true, minuscula: true, numero: true, especial: false })
    expect(await screen.findByText('Al menos 10 caracteres')).toBeInTheDocument()
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
