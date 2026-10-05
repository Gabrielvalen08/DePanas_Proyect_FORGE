import { useState, useRef, useEffect } from 'react'
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, Delete, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Boton from '../components/common/Boton'
import estilos from './PantallaContrasena.module.css'

export default function PantallaContrasena() {
  const { ingresar } = useAuth()
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [error, setError] = useState('')
  const [animandoError, setAnimandoError] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!contrasena) {
      setError('Por favor escribe la contraseña')
      setAnimandoError(true)
      setTimeout(() => setAnimandoError(false), 500)
      inputRef.current?.focus()
      return
    }

    const res = ingresar(contrasena)
    if (!res.ok) {
      setError(res.error || 'Contraseña incorrecta')
      setAnimandoError(true)
      setTimeout(() => setAnimandoError(false), 500)
      setContrasena('')
      inputRef.current?.focus()
    } else {
      setError('')
    }
  }

  const manejarTecla = (valor) => {
    setError('')
    if (contrasena.length < 8) {
      setContrasena(prev => prev + valor)
    }
  }

  const borrarUltimo = () => {
    setError('')
    setContrasena(prev => prev.slice(0, -1))
  }

  const limpiar = () => {
    setError('')
    setContrasena('')
    inputRef.current?.focus()
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

        <h1 className={estilos.titulo}>Acceso al sistema</h1>
        <p className={estilos.descripcion}>
          Ingresa la contraseña para acceder al registro de compras y costos.
        </p>

        <form onSubmit={handleSubmit} className={estilos.formulario} noValidate>
          <div className={estilos.filaInput}>
            <label htmlFor="input-contrasena" className="solo-lector">
              Contraseña de acceso
            </label>
            <input
              ref={inputRef}
              id="input-contrasena"
              type={mostrarContrasena ? 'text' : 'password'}
              value={contrasena}
              onChange={(e) => {
                setError('')
                setContrasena(e.target.value)
              }}
              placeholder="••••"
              autoComplete="current-password"
              className={`${estilos.inputContrasena} ${error ? estilos.inputConError : ''}`}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'error-contrasena' : undefined}
            />
            <button
              type="button"
              className={estilos.botonOjo}
              onClick={() => setMostrarContrasena(prev => !prev)}
              aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
              title={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div id="error-contrasena" className={estilos.mensajeError} role="alert" aria-live="assertive">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Teclado numérico táctil para tablet / pantalla táctil */}
          <div className={estilos.tecladoNumerico} aria-label="Teclado numérico en pantalla">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                className={estilos.tecla}
                onClick={() => manejarTecla(String(num))}
                tabIndex={0}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className={`${estilos.tecla} ${estilos.teclaAccion}`}
              onClick={limpiar}
              aria-label="Limpiar entrada"
              title="Limpiar"
            >
              <RotateCcw size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={estilos.tecla}
              onClick={() => manejarTecla('0')}
              tabIndex={0}
            >
              0
            </button>
            <button
              type="button"
              className={`${estilos.tecla} ${estilos.teclaAccion}`}
              onClick={borrarUltimo}
              aria-label="Borrar último dígito"
              title="Borrar"
            >
              <Delete size={18} aria-hidden="true" />
            </button>
          </div>

          <div className={estilos.acciones}>
            <Boton
              type="submit"
              variante="primario"
              ancho={true}
              icono={<ArrowRight size={18} />}
            >
              Ingresar al sistema
            </Boton>
          </div>
        </form>

        <footer className={estilos.pie}>
          <span>De Panas SV · Control interno de insumos y costos</span>
        </footer>
      </div>
    </main>
  )
}
