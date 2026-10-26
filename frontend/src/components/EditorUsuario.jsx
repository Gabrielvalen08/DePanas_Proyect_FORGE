import { useRef, useState } from 'react'
import { AlertCircle, Check, Pencil, ShieldCheck, UserPlus, X } from 'lucide-react'
import { Boton, Campo, ConfirmDialog, CuerpoModal, Modal, PieModal } from './common'
import { tituloDeRuta } from './navegacion'
import { FUNCIONES, FUNCIONES_POR_PANTALLA, ROLES_ASIGNABLES, RUTAS_ASIGNABLES, permisosDeRol } from '../utils/permisos'
import { revisarContrasena } from '../../../shared/usuarios.js'
import { CONFIRMAR, USUARIOS } from '../utils/mensajes'
import estilos from './EditorUsuario.module.css'

const FORMATO_USUARIO = /^[A-Za-z0-9_.-]{3,30}$/
const V = USUARIOS.validacion

/** Lista ordenada y sin repetidos, para comparar si algo cambió */
const firma = lista => [...new Set(lista)].sort().join('\n')

/**
 * EditorUsuario
 * Ventana para crear un usuario o editar uno existente (Gestor de usuarios): nombre,
 * nombre de usuario para ingresar, contraseña (con confirmación y los requisitos a la
 * vista), rol, y las pantallas y funciones a las que entra. Elegir un rol aplica sus
 * pantallas y funciones de partida (shared/usuarios.js); después se pueden ajustar.
 * El administrador entra a todo: su rol, pantallas y funciones no se eligen.
 *
 * Props:
 *  - edicion: null (cerrado) | { registro: null } (crear) | { registro: { usuario, nombre, rol, permisos, funciones } }
 *  - usuarios: los que ya existen (para avisar de un usuario repetido sin ir al servidor)
 *  - requisitos: { minimo, mayuscula, minuscula, numero, especial } de las contraseñas
 *  - alGuardar(datos): async; si lanza un error con `campo`, se marca ese campo y la ventana sigue abierta
 *  - alCerrar()
 */
export default function EditorUsuario({ edicion, usuarios, requisitos, alGuardar, alCerrar }) {
  const primerCampoRef = useRef(null)
  const nuevo = !edicion?.registro
  return (
    <Modal
      abierto={Boolean(edicion)}
      alCerrar={alCerrar}
      titulo={nuevo ? USUARIOS.tituloNuevo : USUARIOS.tituloEditar(edicion.registro.usuario)}
      icono={nuevo ? <UserPlus /> : <Pencil />}
      focoInicial={primerCampoRef}
      anchoMax="lg"
    >
      {edicion && (
        <Formulario
          registro={edicion.registro}
          usuarios={usuarios}
          requisitos={requisitos}
          alGuardar={alGuardar}
          alCerrar={alCerrar}
          primerCampoRef={primerCampoRef}
        />
      )}
    </Modal>
  )
}

function Formulario({ registro, usuarios, requisitos, alGuardar, alCerrar, primerCampoRef }) {
  const nuevo = !registro
  const esAdmin = registro?.rol === 'admin'
  const [usuario, setUsuario] = useState(registro?.usuario ?? '')
  const [nombre, setNombre] = useState(registro?.nombre ?? '')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [rol, setRol] = useState(registro?.rol ?? 'empleado')
  const [permisos, setPermisos] = useState(() => registro?.permisos ?? permisosDeRol('empleado').permisos)
  const [funciones, setFunciones] = useState(() => registro?.funciones ?? permisosDeRol('empleado').funciones)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(null) // null | 'guardar' | 'descartar'
  const [inicial] = useState(() => ({ usuario, nombre, rol, permisos: firma(permisos), funciones: firma(funciones) }))
  const cambiado = Boolean(contrasena || confirmacion) || usuario !== inicial.usuario || nombre !== inicial.nombre ||
    rol !== inicial.rol || firma(permisos) !== inicial.permisos || firma(funciones) !== inicial.funciones
  // Al abrir, el foco va al nombre (el usuario para ingresar va debajo y, al editar, no se cambia)
  const nombreRef = primerCampoRef
  const usuarioRef = useRef(null)
  const contrasenaRef = useRef(null)
  const confirmacionRef = useRef(null)
  const permisosRef = useRef(null)
  const rolRef = useRef(null)

  const revision = revisarContrasena(contrasena.trim(), requisitos)

  function limpiarError(campo) {
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: undefined }))
  }

  /** El rol trae sus pantallas y funciones: elegirlo las reemplaza */
  function elegirRol(nuevoRol) {
    const base = permisosDeRol(nuevoRol)
    setRol(nuevoRol)
    setPermisos(base.permisos)
    setFunciones(base.funciones)
    limpiarError('permisos')
  }

  /** Quitar una pantalla no borra sus funciones: si se vuelve a dar, las recupera */
  function alternarPermiso(ruta) {
    setPermisos(prev => (prev.includes(ruta) ? prev.filter(p => p !== ruta) : [...prev, ruta]))
    limpiarError('permisos')
  }

  function alternarFuncion(funcion) {
    setFunciones(prev => (prev.includes(funcion) ? prev.filter(f => f !== funcion) : [...prev, funcion]))
  }

  /** Marca los errores y lleva el foco al primero */
  function mostrarErrores(nuevos) {
    setErrores(nuevos)
    const refs = {
      nombre: nombreRef, usuario: usuarioRef, contrasena: contrasenaRef, confirmacion: confirmacionRef,
      rol: rolRef, permisos: permisosRef, funciones: permisosRef,
    }
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
      const faltan = revision.filter(r => !r.cumple).map(r => r.texto)
      if (faltan.length) nuevos.contrasena = `${USUARIOS.requisitosLista} ${faltan.join(', ').toLowerCase()}`
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
      const pantallas = RUTAS_ASIGNABLES.filter(r => permisos.includes(r))
      await alGuardar({
        ...(nuevo ? { usuario: usuario.trim() } : {}),
        nombre: nombre.trim(),
        contrasena: contrasena.trim(),
        // Solo las funciones de las pantallas que tiene
        ...(esAdmin ? {} : {
          rol,
          permisos: pantallas,
          funciones: FUNCIONES.filter(f => funciones.includes(f) && pantallas.some(r => FUNCIONES_POR_PANTALLA[r]?.includes(f))),
        }),
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
          <div className={estilos.columnas}>
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
                  aria-describedby="editor-usuario-requisitos"
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
              <Requisitos revision={revision} />
            </div>

            <div className={estilos.permisosColumna}>
              {esAdmin ? (
                <>
                  <p className={estilos.leyenda}>{USUARIOS.rolTitulo}</p>
                  <p className={estilos.aviso}>
                    <ShieldCheck size={18} aria-hidden="true" />
                    <span>
                      <strong>{USUARIOS.roles.admin}.</strong> {USUARIOS.permisosAdmin}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <fieldset className={estilos.grupo} aria-describedby="editor-usuario-rol-ayuda">
                    <legend className={estilos.leyenda}>{USUARIOS.rolTitulo}</legend>
                    <div className={estilos.roles}>
                      {ROLES_ASIGNABLES.map((r, i) => (
                        <label key={r} className={estilos.opcion}>
                          <input
                            ref={i === 0 ? rolRef : undefined}
                            type="radio"
                            name="editor-usuario-rol"
                            className={estilos.casilla}
                            checked={rol === r}
                            onChange={() => elegirRol(r)}
                          />
                          <span className={estilos.opcionTitulo}>{USUARIOS.roles[r]}</span>
                          <span className={estilos.opcionDescripcion}>{USUARIOS.descripcionRol[r]}</span>
                        </label>
                      ))}
                    </div>
                    <p id="editor-usuario-rol-ayuda" className={estilos.nota}>{USUARIOS.rolAyuda}</p>
                    {errores.rol && <Error id="editor-usuario-rol-error" texto={errores.rol} />}
                  </fieldset>

                  <fieldset
                    className={estilos.grupo}
                    aria-describedby={errores.permisos ? 'editor-usuario-permisos-error' : undefined}
                  >
                    <legend className={estilos.leyenda}>{USUARIOS.permisosTitulo}</legend>
                    <ul className={estilos.opciones}>
                      {RUTAS_ASIGNABLES.map((ruta, i) => {
                        const tiene = permisos.includes(ruta)
                        const suyas = FUNCIONES_POR_PANTALLA[ruta] ?? []
                        return (
                          <li key={ruta}>
                            <label className={estilos.opcion}>
                              <input
                                ref={i === 0 ? permisosRef : undefined}
                                type="checkbox"
                                className={estilos.casilla}
                                checked={tiene}
                                onChange={() => alternarPermiso(ruta)}
                              />
                              <span className={estilos.opcionTitulo}>{tituloDeRuta(ruta)}</span>
                              <span className={estilos.opcionDescripcion}>{USUARIOS.pantallas[ruta]}</span>
                            </label>
                            {suyas.length > 0 && tiene && (
                              <fieldset className={estilos.funciones}>
                                <legend className="solo-lector">{USUARIOS.funcionesDe(tituloDeRuta(ruta))}</legend>
                                {suyas.map(f => (
                                  <label key={f} className={estilos.funcion}>
                                    <input
                                      type="checkbox"
                                      className={estilos.casilla}
                                      checked={funciones.includes(f)}
                                      onChange={() => alternarFuncion(f)}
                                    />
                                    <span>{USUARIOS.funciones[f]}</span>
                                  </label>
                                ))}
                              </fieldset>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    <p className={estilos.nota}>{USUARIOS.permisosNota}</p>
                    {errores.permisos && <Error id="editor-usuario-permisos-error" texto={errores.permisos} />}
                    {errores.funciones && <Error id="editor-usuario-funciones-error" texto={errores.funciones} />}
                  </fieldset>
                </>
              )}
            </div>
          </div>
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

/** Lo que pide la contraseña, marcando en vivo lo que ya cumple */
function Requisitos({ revision }) {
  return (
    <div id="editor-usuario-requisitos" className={estilos.requisitos}>
      <p className={estilos.requisitosTitulo}>{USUARIOS.requisitosLista}</p>
      <ul className={estilos.requisitosLista}>
        {revision.map(r => (
          <li key={r.clave} className={r.cumple ? estilos.cumple : estilos.falta}>
            {r.cumple ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
            <span>{r.texto}</span>
            <span className="solo-lector">: {r.cumple ? USUARIOS.requisitoCumple : USUARIOS.requisitoFalta}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Error({ id, texto }) {
  return (
    <p id={id} className={estilos.error}>
      <AlertCircle size={14} aria-hidden="true" />
      {texto}
    </p>
  )
}
