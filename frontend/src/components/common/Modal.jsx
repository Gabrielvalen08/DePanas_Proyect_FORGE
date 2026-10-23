import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import Boton from './Boton'
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado'
import { fundido, springSuave, variantesModal, variantesScrim } from '../../styles/movimiento'
import estilos from './Modal.module.css'

/**
 * Modal
 * Se compone con <CuerpoModal> y <PieModal> como hijos.
 * rol="alertdialog": confirmaciones; el clic en el scrim no cierra.
 * focoInicial: ref del elemento que recibe el foco al abrir.
 * anchoMax: sm | md | lg
 * Se centra dentro del área del módulo abierto (el <main id="contenido"> de la página), no
 * de toda la pantalla; el velo sí cubre toda la pantalla para que el menú no se pueda tocar.
 */
export default function Modal({ abierto, ...props }) {
  return createPortal(
    <AnimatePresence>{abierto && <ContenidoModal key="modal" {...props} />}</AnimatePresence>,
    document.body
  )
}

function ContenidoModal({ alCerrar, titulo, icono, rol = 'dialog', anchoMax = 'md', focoInicial, children }) {
  const idTitulo = useId()
  const contenedorRef = useFocoAtrapado(true, alCerrar, focoInicial)
  const capaRef = useRef(null)

  // Antes de pintar: la capa ocupa solo el área del módulo (y se ajusta si cambia el tamaño)
  useLayoutEffect(() => {
    function ajustar() {
      const capa = capaRef.current
      const modulo = document.getElementById('contenido')
      if (!capa) return
      if (!modulo) {
        capa.style.left = ''
        capa.style.width = ''
        return
      }
      const caja = modulo.getBoundingClientRect()
      capa.style.left = `${caja.left}px`
      capa.style.width = `${caja.width}px`
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])

  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previo }
  }, [])

  return (
    <div ref={capaRef} className={estilos.capa}>
      <motion.div
        className={estilos.scrim}
        variants={variantesScrim}
        initial="oculto"
        animate="visible"
        exit="oculto"
        transition={fundido}
        onClick={rol === 'alertdialog' ? undefined : alCerrar}
        aria-hidden="true"
      />
      <motion.div
        ref={contenedorRef}
        role={rol}
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={[estilos.modal, estilos[anchoMax]].join(' ')}
        variants={variantesModal}
        initial="oculto"
        animate="visible"
        exit="oculto"
        transition={springSuave}
      >
        <header className={estilos.encabezado}>
          <div className={estilos.tituloGrupo}>
            {icono && <span className={estilos.icono} aria-hidden="true">{icono}</span>}
            <h2 id={idTitulo} className={estilos.titulo}>{titulo}</h2>
          </div>
          <Boton variante="icono" icono={<X />} aria-label="Cerrar" onClick={alCerrar} />
        </header>
        {children}
      </motion.div>
    </div>
  )
}

export function CuerpoModal({ children }) {
  return <div className={estilos.cuerpo}>{children}</div>
}

export function PieModal({ children }) {
  return <footer className={estilos.pie}>{children}</footer>
}
