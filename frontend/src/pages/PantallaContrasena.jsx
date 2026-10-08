import { useState, useRef, useEffect } from 'react'
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, HelpCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Boton from '../components/common/Boton'
import { ACCESO } from '../utils/mensajes'
import estilos from './PantallaContrasena.module.css'

export default function PantallaContrasena() {
  const { ingresar } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [error, setError] = useState('')
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const [animandoError, setAnimandoError] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const usuarioRef = useRef(null)
  const contrasenaRef = useRef(null)

  useEffect(() => {
    usuarioRef.current?.focus()
  }, [])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (enviando) return

    if (!usuario.trim()) {
      setError(ACCESO.faltaUsuario)
      setAnimandoError(true)
      setTimeout(() => setAnimandoError(false), 500)
      usuarioRef.current?.focus()
      return
    }

    if (!contrasena.trim()) {
      setError(ACCESO.faltaContrasena)
      setAnimandoError(true)
      setTimeout(() => setAnimandoError(false), 500)
      contrasenaRef.current?.focus()
      return
    }

    setEnviando(true)
    const res = await ingresar(usuario, contrasena)
    if (!res.ok) {
      setEnviando(false)
      setError(res.error || ACCESO.incorrecta)
      setAnimandoError(true)
      setTimeout(() => setAnimandoError(false), 500)
      setContrasena('')
      contrasenaRef.current?.focus()
    } else {
      setError('')
    }
  }

  const toggleAyuda = () => {
    setMostrarAyuda((prev) => !prev)
  }

  return (
    <main className={estilos.contenedor} id="contenido" tabIndex={-1}>
      <div className={estilos.fondoDecorativo} aria-hidden="true" />

      <div className={`${estilos.tarjeta} ${animandoError ? estilos.tarjetaError : ''}`}>
        <div className={estilos.logoContenedor}>
          <div className={estilos.logoBadge}>
            <span className={estilos.logoTexto}>DE PANAS</span>
          </div>
        </div>

        <div className={estilos.iconoCandado} aria-hidden="true">
          <Lock size={26} strokeWidth={2.2} />
        </div>

        <h1 className={estilos.titulo}>{ACCESO.titulo}</h1>
        <p className={estilos.descripcion}>{ACCESO.descripcion}</p>

        <form onSubmit={handleSubmit} className={estilos.formulario} noValidate>
          {/* Campo Usuario */}
          <div className={estilos.campoContenedor}>
            <label htmlFor="input-usuario" className={estilos.etiquetaCampo}>
              <User size={16} aria-hidden="true" />
              <span>{ACCESO.etiquetaUsuario}</span>
            </label>
            <div className={estilos.filaInput}>
              <input
                ref={usuarioRef}
                id="input-usuario"
                type="text"
                value={usuario}
                onChange={(e) => {
                  setError('')
                  setUsuario(e.target.value)
                }}
                placeholder={ACCESO.placeholderUsuario}
                autoComplete="username"
                className={`${estilos.inputTexto} ${error && !usuario ? estilos.inputConError : ''}`}
                aria-invalid={Boolean(error && !usuario)}
                aria-describedby={error ? 'error-acceso' : undefined}
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className={estilos.campoContenedor}>
            <label htmlFor="input-contrasena" className={estilos.etiquetaCampo}>
              <Lock size={16} aria-hidden="true" />
              <span>{ACCESO.etiquetaContrasena}</span>
            </label>
            <div className={estilos.filaInput}>
              <input
                ref={contrasenaRef}
                id="input-contrasena"
                type={mostrarContrasena ? 'text' : 'password'}
                value={contrasena}
                onChange={(e) => {
                  setError('')
                  setContrasena(e.target.value)
                }}
                placeholder={ACCESO.placeholderContrasena}
                autoComplete="current-password"
                className={`${estilos.inputTexto} ${error && !contrasena ? estilos.inputConError : ''}`}
                aria-invalid={Boolean(error && !contrasena)}
                aria-describedby={error ? 'error-acceso' : undefined}
              />
              <button
                type="button"
                className={estilos.botonOjo}
                onClick={() => setMostrarContrasena((prev) => !prev)}
                aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
                title={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div id="error-acceso" className={estilos.mensajeError} role="alert" aria-live="assertive">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {mostrarAyuda && (
            <div className={estilos.mensajeAyuda} role="status">
              <Info size={16} aria-hidden="true" />
              <span>{ACCESO.ayudaOlvide}</span>
            </div>
          )}

          <div className={estilos.acciones}>
            <Boton
              type="submit"
              variante="primario"
              ancho={true}
              cargando={enviando}
              icono={<ArrowRight size={18} />}
            >
              {ACCESO.boton}
            </Boton>

            <button
              type="button"
              className={estilos.botonOlvide}
              onClick={toggleAyuda}
            >
              <HelpCircle size={15} aria-hidden="true" />
              <span>{ACCESO.olvideContrasena}</span>
            </button>
          </div>
        </form>

        <footer className={estilos.pie}>
          <span>{ACCESO.pie}</span>
        </footer>
      </div>
    </main>
  )
}
