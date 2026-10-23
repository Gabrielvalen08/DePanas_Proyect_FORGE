import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { MoreVertical } from 'lucide-react'
import Boton from './Boton'
import { springSuave, variantesDesplegable } from '../../styles/movimiento'
import estilos from './MenuAcciones.module.css'

/**
 * MenuAcciones
 * Botón de tres puntos (⋮) que despliega un menú de acciones (patrón «menu button» de WAI-ARIA).
 * El menú va en un portal con posición fija bajo el botón, así no lo recorta una tarjeta.
 * Flechas, Inicio y Fin recorren las opciones; Escape o un clic fuera lo cierran.
 *
 * Props:
 *  - etiqueta: nombre accesible del botón (por defecto «Más acciones»)
 *  - opciones: [{ etiqueta, icono?, a? (ruta) | onClick? }]; las que no tienen ni una ni otra se omiten
 */
export default function MenuAcciones({ etiqueta = 'Más acciones', opciones }) {
  const id = useId().replace(/:/g, '')
  const botonRef = useRef(null)
  const menuRef = useRef(null)
  const [posicion, setPosicion] = useState(null) // null = cerrado; { top, right } al abrir
  const abierto = posicion !== null
  const visibles = opciones.filter(o => o.a || o.onClick)

  function abrir() {
    const caja = botonRef.current.getBoundingClientRect()
    setPosicion({ top: caja.bottom + 6, right: window.innerWidth - caja.right })
  }

  function cerrar({ devolverFoco = true } = {}) {
    setPosicion(null)
    if (devolverFoco) botonRef.current?.focus()
  }

  // Antes de pintar: el menú se ancla bajo el botón (posición fija, calculada al abrir)
  useLayoutEffect(() => {
    if (!posicion || !menuRef.current) return
    menuRef.current.style.top = `${posicion.top}px`
    menuRef.current.style.right = `${posicion.right}px`
  }, [posicion])

  // Al abrir, el foco va a la primera opción; un clic fuera, el scroll o un cambio de tamaño lo cierran
  useEffect(() => {
    if (!abierto) return undefined
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()
    const fuera = e => {
      if (!menuRef.current?.contains(e.target) && !botonRef.current?.contains(e.target)) setPosicion(null)
    }
    const soltar = () => setPosicion(null)
    document.addEventListener('pointerdown', fuera)
    window.addEventListener('resize', soltar)
    window.addEventListener('scroll', soltar, true)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      window.removeEventListener('resize', soltar)
      window.removeEventListener('scroll', soltar, true)
    }
  }, [abierto])

  function teclado(e) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const actual = items.indexOf(document.activeElement)
    const ir = i => items[(i + items.length) % items.length]?.focus()
    if (e.key === 'ArrowDown') { e.preventDefault(); ir(actual + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ir(actual - 1) }
    else if (e.key === 'Home') { e.preventDefault(); ir(0) }
    else if (e.key === 'End') { e.preventDefault(); ir(items.length - 1) }
    else if (e.key === 'Escape') { e.preventDefault(); cerrar() }
    else if (e.key === 'Tab') cerrar({ devolverFoco: false })
  }

  if (visibles.length === 0) return null

  return (
    <>
      <Boton
        ref={botonRef}
        variante="icono"
        icono={<MoreVertical />}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? `${id}-menu` : undefined}
        onClick={() => (abierto ? cerrar() : abrir())}
      />
      {createPortal(
        <AnimatePresence>
          {abierto && (
            <motion.ul
              ref={menuRef}
              id={`${id}-menu`}
              role="menu"
              aria-label={etiqueta}
              className={estilos.menu}
              variants={variantesDesplegable}
              initial="oculto"
              animate="visible"
              exit="oculto"
              transition={springSuave}
              onKeyDown={teclado}
            >
              {visibles.map(o => (
                <li key={o.etiqueta} role="none">
                  {o.a ? (
                    <Link role="menuitem" to={o.a} className={estilos.opcion} tabIndex={-1} onClick={() => cerrar({ devolverFoco: false })}>
                      {o.icono && <span className={estilos.icono} aria-hidden="true">{o.icono}</span>}
                      {o.etiqueta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className={estilos.opcion}
                      tabIndex={-1}
                      onClick={() => { cerrar(); o.onClick() }}
                    >
                      {o.icono && <span className={estilos.icono} aria-hidden="true">{o.icono}</span>}
                      {o.etiqueta}
                    </button>
                  )}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
