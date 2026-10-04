import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { Boton } from '../components/common'
import { useConsultaMedia } from '../hooks/useConsultaMedia'
import { springSuave } from '../styles/movimiento'
import estilos from './Toast.module.css'

const DURACION_MS = 3500

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const siguienteId = useRef(1)
  const esMovil = useConsultaMedia('(max-width: 767px)')

  const quitarToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // API pública sin cambios: addToast(mensaje, 'success' | 'error')
  const addToast = useCallback((message, type = 'success') => {
    const id = siguienteId.current++
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const valor = useMemo(() => ({ addToast }), [addToast])

  // Entra y sale por el mismo borde: derecha en desktop, arriba en móvil
  const desplazamiento = esMovil ? { y: -16 } : { x: 24 }

  function renderLista(tipo) {
    return (
      <AnimatePresence initial={false}>
        {toasts.filter(t => t.type === tipo).map(t => (
          <Toast
            key={t.id}
            toast={t}
            alCerrar={quitarToast}
            desplazamiento={desplazamiento}
          />
        ))}
      </AnimatePresence>
    )
  }

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className={estilos.pila}>
        {/* Regiones vivas permanentes: los lectores anuncian lo que se agrega */}
        <div role="status" aria-live="polite" className={estilos.region}>
          {renderLista('success')}
        </div>
        <div role="alert" aria-live="assertive" className={estilos.region}>
          {renderLista('error')}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, alCerrar, desplazamiento }) {
  const [pausado, setPausado] = useState(false)
  const restante = useRef(DURACION_MS)
  const inicio = useRef(0)

  // Cierre automático; se pausa con hover o foco dentro del toast
  useEffect(() => {
    if (pausado) return
    inicio.current = Date.now()
    const temporizador = setTimeout(() => alCerrar(toast.id), restante.current)
    return () => {
      clearTimeout(temporizador)
      restante.current -= Date.now() - inicio.current
    }
  }, [pausado, alCerrar, toast.id])

  const esError = toast.type === 'error'
  const Icono = esError ? XCircle : CheckCircle2

  return (
    <motion.div
      layout
      className={[estilos.toast, esError ? estilos.error : estilos.exito].join(' ')}
      initial={{ opacity: 0, ...desplazamiento }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...desplazamiento }}
      transition={springSuave}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <Icono size={20} className={estilos.icono} aria-hidden="true" />
      <p className={estilos.mensaje}>{toast.message}</p>
      <Boton
        variante="icono"
        tamano="sm"
        icono={<X />}
        aria-label="Cerrar notificación"
        onClick={() => alCerrar(toast.id)}
        className={estilos.cerrar}
      />
    </motion.div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
