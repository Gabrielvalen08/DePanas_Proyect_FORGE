import { useEffect, useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, MemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { DatosSinGuardarProvider, useCierreConAviso, useDatosSinGuardar, usePedirSalida } from './DatosSinGuardarContext'
import { AVISO_SALIDA } from '../utils/mensajes'

/** Un formulario de mentira: escribir lo ensucia; registrar valida, pide confirmar y guarda */
function Formulario({ nombre, resultadoRef, sinRegistrar = false }) {
  const [texto, setTexto] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const registro = useDatosSinGuardar({
    sucio: Boolean(texto),
    registrar: sinRegistrar ? undefined : () => setConfirmando(true),
  })
  return (
    <div>
      <label>{nombre}<input value={texto} onChange={e => setTexto(e.target.value)} /></label>
      {confirmando && (
        <>
          <button onClick={() => {
            setConfirmando(false)
            registro.aceptar()
            if (resultadoRef?.current === false) {
              registro.terminar(false)
              return
            }
            setTexto('')
            registro.terminar(true)
          }}>{`Sí, guardar ${nombre}`}</button>
          <button onClick={() => { setConfirmando(false); registro.cerrar() }}>{`No guardar ${nombre}`}</button>
        </>
      )}
    </div>
  )
}

function Dondeestoy() {
  return <p data-testid="ruta">{useLocation().pathname}</p>
}

function Pagina({ resultadoRef, sinRegistrar, dos = false }) {
  const pedirSalida = usePedirSalida()
  const [salio, setSalio] = useState(false)
  return (
    <>
      <Dondeestoy />
      <Link to="/otra">Ir a otra</Link>
      <button onClick={() => pedirSalida(() => setSalio(true))}>Cerrar sesión</button>
      {salio && <p>Pidió confirmar la salida</p>}
      <Formulario nombre="Uno" resultadoRef={resultadoRef} sinRegistrar={sinRegistrar} />
      {dos && <Formulario nombre="Dos" resultadoRef={resultadoRef} />}
    </>
  )
}

function montar(props = {}) {
  const router = createMemoryRouter([
    { path: '/', element: <DatosSinGuardarProvider><Pagina {...props} /></DatosSinGuardarProvider> },
    { path: '/otra', element: <DatosSinGuardarProvider><Dondeestoy /></DatosSinGuardarProvider> },
  ])
  render(<RouterProvider router={router} />)
  return userEvent.setup()
}

const aviso = () => screen.queryByRole('alertdialog', { name: AVISO_SALIDA.titulo })
const ruta = () => screen.getByTestId('ruta').textContent

describe('DatosSinGuardarContext', () => {
  it('sin cambios, cambiar de pantalla no avisa', async () => {
    const usuario = montar()
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    expect(aviso()).not.toBeInTheDocument()
    await waitFor(() => expect(ruta()).toBe('/otra'))
  })

  it('con datos, «Salir sin guardar» sigue a donde iba', async () => {
    const usuario = montar()
    await usuario.type(screen.getByLabelText('Uno'), 'x')
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    expect(aviso()).toBeInTheDocument()
    expect(ruta()).toBe('/')

    await usuario.click(screen.getByRole('button', { name: AVISO_SALIDA.salir }))
    await waitFor(() => expect(ruta()).toBe('/otra'))
  })

  it('la X y Esc del aviso solo lo cierran: se sigue editando', async () => {
    const usuario = montar()
    await usuario.type(screen.getByLabelText('Uno'), 'x')

    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(aviso()).not.toBeInTheDocument())
    expect(ruta()).toBe('/')
    expect(screen.getByLabelText('Uno')).toHaveValue('x')

    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    await waitFor(() => expect(aviso()).toBeInTheDocument())
    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(aviso()).not.toBeInTheDocument())
    expect(ruta()).toBe('/')
    // El bloqueo se liberó: sin datos ya no vuelve a avisar
    await usuario.clear(screen.getByLabelText('Uno'))
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    await waitFor(() => expect(ruta()).toBe('/otra'))
  })

  it('«Registrar» que guarda bien sigue a donde iba', async () => {
    const usuario = montar()
    await usuario.type(screen.getByLabelText('Uno'), 'x')
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    await usuario.click(screen.getByRole('button', { name: AVISO_SALIDA.registrar }))
    await usuario.click(await screen.findByRole('button', { name: 'Sí, guardar Uno' }))
    await waitFor(() => expect(ruta()).toBe('/otra'))
    expect(aviso()).not.toBeInTheDocument()
  })

  it('«Registrar» sin confirmar o con errores se queda en el formulario', async () => {
    const resultadoRef = { current: false }
    const usuario = montar({ resultadoRef })
    await usuario.type(screen.getByLabelText('Uno'), 'x')

    // Dice que no en «¿Guardamos…?»
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    await usuario.click(screen.getByRole('button', { name: AVISO_SALIDA.registrar }))
    await usuario.click(await screen.findByRole('button', { name: 'No guardar Uno' }))
    await waitFor(() => expect(aviso()).not.toBeInTheDocument())
    expect(ruta()).toBe('/')
    expect(screen.getByLabelText('Uno')).toHaveValue('x')

    // Falló al guardar
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    await usuario.click(await screen.findByRole('button', { name: AVISO_SALIDA.registrar }))
    await usuario.click(await screen.findByRole('button', { name: 'Sí, guardar Uno' }))
    await waitFor(() => expect(aviso()).not.toBeInTheDocument())
    expect(ruta()).toBe('/')
  })

  it('con dos formularios con datos, «Registrar» guarda uno y el aviso vuelve a salir', async () => {
    const usuario = montar({ dos: true })
    await usuario.type(screen.getByLabelText('Uno'), 'x')
    await usuario.type(screen.getByLabelText('Dos'), 'y')
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))

    await usuario.click(screen.getByRole('button', { name: AVISO_SALIDA.registrar }))
    await usuario.click(await screen.findByRole('button', { name: 'Sí, guardar Uno' }))
    await waitFor(() => expect(aviso()).toBeInTheDocument())
    expect(ruta()).toBe('/')

    await usuario.click(screen.getByRole('button', { name: AVISO_SALIDA.registrar }))
    await usuario.click(await screen.findByRole('button', { name: 'Sí, guardar Dos' }))
    await waitFor(() => expect(ruta()).toBe('/otra'))
  })

  it('guardado por su botón pero aún montado (animación de salida): cambiar de pantalla no avisa ni se pierde', async () => {
    function Guardado() {
      const registro = useDatosSinGuardar({ sucio: true, registrar: () => {} })
      return <button onClick={() => registro.terminar(true)}>Guardar sin desmontar</button>
    }
    const router = createMemoryRouter([
      { path: '/', element: <DatosSinGuardarProvider><Dondeestoy /><Link to="/otra">Ir a otra</Link><Guardado /></DatosSinGuardarProvider> },
      { path: '/otra', element: <DatosSinGuardarProvider><Dondeestoy /></DatosSinGuardarProvider> },
    ])
    render(<RouterProvider router={router} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Guardar sin desmontar' }))
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    expect(aviso()).not.toBeInTheDocument()
    await waitFor(() => expect(ruta()).toBe('/otra'))
  })

  it('si el formulario desaparece con la navegación retenida, sigue a donde iba', async () => {
    const control = {}
    function Temporal() {
      const [visible, setVisible] = useState(true)
      useEffect(() => { control.quitar = () => setVisible(false) }, [])
      return visible ? <Sucio /> : null
    }
    function Sucio() {
      useDatosSinGuardar({ sucio: true })
      return null
    }
    const router = createMemoryRouter([
      { path: '/', element: <DatosSinGuardarProvider><Dondeestoy /><Link to="/otra">Ir a otra</Link><Temporal /></DatosSinGuardarProvider> },
      { path: '/otra', element: <DatosSinGuardarProvider><Dondeestoy /></DatosSinGuardarProvider> },
    ])
    render(<RouterProvider router={router} />)
    await userEvent.setup().click(screen.getByRole('link', { name: 'Ir a otra' }))
    expect(aviso()).toBeInTheDocument()
    act(() => control.quitar())
    await waitFor(() => expect(ruta()).toBe('/otra'))
  })

  it('sin nada que registrar, ofrece «Seguir aquí» y este se queda', async () => {
    const usuario = montar({ sinRegistrar: true })
    await usuario.type(screen.getByLabelText('Uno'), 'x')
    await usuario.click(screen.getByRole('link', { name: 'Ir a otra' }))
    expect(screen.getByText(AVISO_SALIDA.mensajeSinRegistrar)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: AVISO_SALIDA.registrar })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: AVISO_SALIDA.seguir }))
    await waitFor(() => expect(aviso()).not.toBeInTheDocument())
    expect(ruta()).toBe('/')
  })

  it('Cerrar sesión: sin cambios sigue de una vez; con datos, el aviso sale antes', async () => {
    const usuario = montar()
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByText('Pidió confirmar la salida')).toBeInTheDocument()
    expect(aviso()).not.toBeInTheDocument()
  })

  it('Cerrar sesión con datos: «Salir sin guardar» sigue con su confirmación', async () => {
    const usuario = montar()
    await usuario.type(screen.getByLabelText('Uno'), 'x')
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(aviso()).toBeInTheDocument()
    expect(screen.queryByText('Pidió confirmar la salida')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: AVISO_SALIDA.salir }))
    expect(screen.getByText('Pidió confirmar la salida')).toBeInTheDocument()
  })

  it('recargar o cerrar la pestaña pide confirmar solo con datos', async () => {
    const usuario = montar()
    const evento = () => {
      const e = new Event('beforeunload', { cancelable: true })
      act(() => { window.dispatchEvent(e) })
      return e.defaultPrevented
    }
    expect(evento()).toBe(false)
    await usuario.type(screen.getByLabelText('Uno'), 'x')
    expect(evento()).toBe(true)
    await usuario.clear(screen.getByLabelText('Uno'))
    expect(evento()).toBe(false)
  })

  it('sin provider el hook no hace nada: las pantallas se prueban solas', async () => {
    function Ventana() {
      const { intentarCerrar, cierreRef } = useCierreConAviso(() => { cerrada = true })
      useDatosSinGuardar({ sucio: true, cierreRef })
      return <button onClick={intentarCerrar}>Cerrar ventana</button>
    }
    let cerrada = false
    render(<MemoryRouter><Ventana /></MemoryRouter>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar ventana' }))
    expect(cerrada).toBe(true)
  })

  it('una ventana solo avisa por sus propios cambios', async () => {
    function Ventana({ sucio, alCerrar }) {
      const { intentarCerrar, cierreRef } = useCierreConAviso(alCerrar)
      return (
        <>
          <ContenidoVentana sucio={sucio} cierreRef={cierreRef} />
          <button onClick={intentarCerrar}>Cerrar ventana</button>
        </>
      )
    }
    function ContenidoVentana({ sucio, cierreRef }) {
      useDatosSinGuardar({ sucio, registrar: () => {}, cierreRef })
      return null
    }
    const alCerrar = vi.fn()
    const router = createMemoryRouter([{
      path: '/',
      element: (
        <DatosSinGuardarProvider>
          <Formulario nombre="Afuera" />
          <Ventana sucio={false} alCerrar={alCerrar} />
        </DatosSinGuardarProvider>
      ),
    }])
    render(<RouterProvider router={router} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Afuera'), 'x')
    await usuario.click(screen.getByRole('button', { name: 'Cerrar ventana' }))
    expect(alCerrar).toHaveBeenCalledTimes(1)
    expect(aviso()).not.toBeInTheDocument()
  })
})
