import { useRef, useState } from 'react'
import { AlertCircle, Check, Pencil, ShieldCheck, UserPlus } from 'lucide-react'
import { Boton, Campo, ConfirmDialog, CuerpoModal, Modal, PieModal } from './common'
import { tituloDeRuta } from './navegacion'
import { RUTAS_ASIGNABLES } from '../utils/permisos'
import { CONFIRMAR, USUARIOS } from '../utils/mensajes'
import estilos from './EditorUsuario.module.css'

const FORMATO_USUARIO = /^[A-Za-z0-9_.-]{3,30}$/
const V = USUARIOS.validacion

/**
 * EditorUsuario
 * Ventana para crear un usuario o editar uno existente (Gestor de usuarios):
 * nombre, nombre de usuario para ingresar, contraseña (con confirmación) y las pantallas a las que entra.
 * El administrador entra a todo: sus pantallas no se eligen.
 *
 * Props:
 *  - edicion: null (cerrado) | { registro: null } (crear) | { registro: { usuario, nombre, rol, permisos } }
 *  - usuarios: los que ya existen (para avisar de un usuario repetido sin ir al servidor)
 *  - alGuardar(datos): async; si lanza un error con `campo`, se marca ese campo y la ventana sigue abierta
 *  - alCerrar()
 */
export default function EditorUsuario({ edicion, usuarios, alGuardar, alCerrar }) {
  const primerCampoRef = useRef(null)
  const nuevo = !edicion?.registro
  return (
    <Modal
      abierto={Boolean(edicion)}
      alCerrar={alCerrar}
      titulo={nuevo ? USUARIOS.tituloNuevo : USUARIOS.tituloEditar(edicion.registro.usuario)}
      icono={nuevo ? <UserPlus /> : <Pencil />}
      focoInicial={primerCampoRef}
    >
      {edicion && (
        <Formulario
          registro={edicion.registro}
          usuarios={usuarios}
          alGuardar={alGuardar}
          alCerrar={alCerrar}
          primerCampoRef={primerCampoRef}
        />
      )}
    </Modal>
  )
}

function Formulario({ registro, usuarios, alGuardar, alCerrar, primerCampoRef }) {
  const nuevo = !registro
  const esAdmin = registro?.rol === 'admin'
  const [usuario, setUsuario] = useState(registro?.usuario ?? '')
  const [nombre, setNombre] = useState(registro?.nombre ?? '')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [permisos, setPermisos] = useState(registro?.permisos ?? [])
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(null) // null | 'guardar' | 'descartar'
  const [inicial] = useState(() => ({ nombre, permisos: [...permisos].sort().join('\n') }))
  const cambiado = Boolean(usuario || contrasena || confirmacion) || nombre !== inicial.nombre ||
    [...permisos].sort().join('\n') !== inicial.permisos
  const propioUsuarioRef = useRef(null)
  // Al abrir, el foco va al nombre (el usuario para ingresar va debajo y, al editar, no se cambia)
  const usuarioRef = propioUsuarioRef
  const nombreRef = primerCampoRef
  const contrasenaRef = useRef(null)
  const confirmacionRef = useRef(null)
  const permisosRef = useRef(null)

  function limpiarError(campo) {
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: undefined }))
  }

  function alternarPermiso(ruta) {
    setPermisos(prev => (prev.includes(ruta) ? prev.filter(p => p !== ruta) : [...prev, ruta]))
    limpiarError('permisos')
  }

  /** Marca los errores y lleva el foco al primero */
  function mostrarErrores(nuevos) {
    setErrores(nuevos)
    const refs = { nombre: nombreRef, usuario: usuarioRef, contrasena: contrasenaRef, confirmacion: confirmacionRef, permisos: permisosRef }
    const primero = Object.keys(refs).find(c => nuevos[c])
    refs[primero]?.current?.focus()
  }

  function validar() {
    const nuevos = {}
    if (nuevo) {
      const limpio = usuario.trim()
      if (!FORMATO_USUARIO.test(limpio)) nuevos.usuario = V.usuario
      else {
        const repetido = usuarios.find(u => u.usuario.toLowerCase() === limpio.toLowerCase())
        if (repetido) nuevos.usuario = V.usuarioRepetido(repetido.usuario)
      }
    }
    if (!nombre.trim()) nuevos.nombre = V.nombre
    else if (nombre.trim().length > 60) nuevos.nombre = V.nombreLargo
    const clave = contrasena.trim()
    if (nuevo || clave) {
      if (clave.length < 4) nuevos.contrasena = V.contrasena
      else if (clave !== confirmacion.trim()) nuevos.confirmacion = V.noCoinciden
    }
    if (!esAdmin && permisos.length === 0) nuevos.permisos = V.permisos
    return nuevos
  }

  // Sin cambios no hay nada que descartar: se cierra sin preguntar
  function pedirCancelar() {
    if (cambiado) setConfirmando('descartar')
    else alCerrar()
  }

  function guardar(e) {
    e.preventDefault()
    const nuevos = validar()
    if (Object.keys(nuevos).length > 0) {
      mostrarErrores(nuevos)
      return
    }
    setErrores({})
    setConfirmando('guardar')
  }

  async function guardarConfirmado() {
    setGuardando(true)
    try {
      await alGuardar({
        ...(nuevo ? { usuario: usuario.trim() } : {}),
        nombre: nombre.trim(),
        contrasena: contrasena.trim(),
        ...(esAdmin ? {} : { permisos: RUTAS_ASIGNABLES.filter(r => permisos.includes(r)) }),
      })
    } catch (error) {
      // Usuario o contraseña repetidos, etc.: se marca el campo para cambiarlo
      if (error?.campo) mostrarErrores({ [error.campo]: error.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <form onSubmit={guardar} noValidate>
        <CuerpoModal>
          <div className={estilos.campos}>
            <Campo
              ref={nombreRef}
              id="editor-usuario-nombre"
              etiqueta={USUARIOS.campos.nombre}
              value={nombre}
              autoComplete="off"
              onChange={e => {
                setNombre(e.target.value)
                limpiarError('nombre')
              }}
              error={errores.nombre}
            />
            <Campo
              ref={usuarioRef}
              id="editor-usuario-usuario"
              etiqueta={USUARIOS.campos.usuario}
              value={usuario}
              disabled={!nuevo}
              autoComplete="off"
              spellCheck={false}
              onChange={e => {
                setUsuario(e.target.value)
                limpiarError('usuario')
              }}
              error={errores.usuario}
              ayuda={nuevo ? USUARIOS.ayudas.usuario : USUARIOS.ayudas.usuarioFijo}
            />
            <div className={estilos.par}>
              <Campo
                ref={contrasenaRef}
                id="editor-usuario-contrasena"
                tipo="password"
                etiqueta={nuevo ? USUARIOS.campos.contrasena : USUARIOS.campos.contrasenaNueva}
                value={contrasena}
                autoComplete="new-password"
                onChange={e => {
                  setContrasena(e.target.value)
                  limpiarError('contrasena')
                }}
                error={errores.contrasena}
                ayuda={nuevo ? USUARIOS.ayudas.contrasena : USUARIOS.ayudas.contrasenaEditar}
              />
              <Campo
                ref={confirmacionRef}
                id="editor-usuario-confirmacion"
                tipo="password"
                etiqueta={USUARIOS.campos.confirmar}
                value={confirmacion}
                autoComplete="new-password"
                onChange={e => {
                  setConfirmacion(e.target.value)
                  limpiarError('confirmacion')
                }}
                error={errores.confirmacion}
              />
            </div>
          </div>

          <fieldset
            className={estilos.permisos}
            aria-describedby={errores.permisos ? 'editor-usuario-permisos-error' : undefined}
          >
            <legend className={estilos.leyenda}>{USUARIOS.permisosTitulo}</legend>
            {esAdmin ? (
              <p className={estilos.aviso}>
                <ShieldCheck size={18} aria-hidden="true" />
                {USUARIOS.permisosAdmin}
              </p>
            ) : (
              <>
                <ul className={estilos.opciones}>
                  {RUTAS_ASIGNABLES.map((ruta, i) => (
                    <li key={ruta}>
                      <label className={estilos.opcion}>
                        <input
                          ref={i === 0 ? permisosRef : undefined}
                          type="checkbox"
                          className={estilos.casilla}
                          checked={permisos.includes(ruta)}
                          onChange={() => alternarPermiso(ruta)}
                        />
                        <span className={estilos.opcionTitulo}>{tituloDeRuta(ruta)}</span>
                        <span className={estilos.opcionDescripcion}>{USUARIOS.pantallas[ruta]}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className={estilos.nota}>{USUARIOS.permisosNota}</p>
              </>
            )}
            {errores.permisos && (
              <p id="editor-usuario-permisos-error" className={estilos.error}>
                <AlertCircle size={14} aria-hidden="true" />
                {errores.permisos}
              </p>
            )}
          </fieldset>
        </CuerpoModal>
        <PieModal>
          <Boton variante="fantasma" onClick={pedirCancelar}>{USUARIOS.cancelar}</Boton>
          <Boton type="submit" variante="primario" icono={<Check />} cargando={guardando}>
            {guardando ? 'Guardando…' : USUARIOS.guardar}
          </Boton>
        </PieModal>
      </form>

      {/* Fuera del <form>: los eventos del portal no deben llegar a su onSubmit */}
      <ConfirmDialog
        isOpen={confirmando === 'guardar'}
        onClose={() => setConfirmando(null)}
        onConfirm={guardarConfirmado}
        title={CONFIRMAR.guardarCambios.titulo}
        message={CONFIRMAR.guardarCambios.mensaje}
        confirmLabel={CONFIRMAR.guardarCambios.confirmar}
      />
      <ConfirmDialog
        isOpen={confirmando === 'descartar'}
        onClose={() => setConfirmando(null)}
        onConfirm={alCerrar}
        title={CONFIRMAR.descartar.titulo}
        message={CONFIRMAR.descartar.mensaje}
        confirmLabel={CONFIRMAR.descartar.confirmar}
        cancelLabel={CONFIRMAR.descartar.volver}
        danger
      />
    </>
  )
}

