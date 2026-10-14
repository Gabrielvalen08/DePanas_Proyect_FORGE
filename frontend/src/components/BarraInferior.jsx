import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Lock, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFocoAtrapado } from '../hooks/useFocoAtrapado'
import { itemsNavegacion, itemsPie } from './navegacion'
import { fundido, springSuave, variantesHoja, variantesScrim } from '../styles/movimiento'
import estilos from './BarraInferior.module.css'

/**
 * Navegación móvil (< 768px). La píldora activa se desliza entre ítems.
 * Solo los ítems con `enBarra` van en la barra; el resto, el Gestor de usuarios
 * y Bloquear se abren desde "Más", así nada queda fuera de la pantalla.
 */
export default function BarraInferior({ onBloquear }) {
  const { tienePermiso } = useAuth()
  const { pathname } = useLocation()
  const [masAbierto, setMasAbierto] = useState(false)
  const visibles = [...itemsNavegacion, ...itemsPie].filter(item => tienePermiso(item.a))
  const enBarra = visibles.filter(item => item.enBarra)
  const enMas = visibles.filter(item => !item.enBarra)
  const masActivo = enMas.some(({ a }) => pathname === a || pathname.startsWith(`${a}/`))

  return (
    <nav className={estilos.barra} aria-label="Menú principal móvil">
      <ul className={estilos.lista}>
        {enBarra.map(({ a, Icono, etiquetaCorta }) => (
          <li key={a} className={estilos.celda}>
            <NavLink
              to={a}
              end={a === '/'}
              className={({ isActive }) => [estilos.item, isActive && estilos.activo].filter(Boolean).join(' ')}
            >
              {({ isActive }) => <Contenido Icono={Icono} etiqueta={etiquetaCorta} activo={isActive} />}
            </NavLink>
          </li>
        ))}

        {(enMas.length > 0 || onBloquear) && (
          <li className={estilos.celda}>
            <button
              type="button"
              onClick={() => setMasAbierto(true)}
              className={[estilos.itemBoton, masActivo && estilos.activo].filter(Boolean).join(' ')}
              aria-haspopup="dialog"
              aria-expanded={masAbierto}
            >
              <Contenido Icono={Menu} etiqueta="Más" activo={masActivo} />
            </button>
          </li>
        )}
      </ul>

      {createPortal(
        <AnimatePresence>
          {masAbierto && (
            <HojaMas
              key="hoja"
              items={enMas}
              alCerrar={() => setMasAbierto(false)}
              onBloquear={onBloquear}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </nav>
  )
}

function Contenido({ Icono, etiqueta, activo }) {
  return (
    <>
      <span className={estilos.iconoCaja}>
        {activo && <motion.span layoutId="nav-activa" className={estilos.pildora} transition={springSuave} />}
        <Icono size={22} aria-hidden="true" className={estilos.icono} />
      </span>
      <span className={estilos.etiqueta}>{etiqueta}</span>
    </>
  )
}

/** Hoja desde abajo con los ítems que no caben en la barra */
function HojaMas({ items, alCerrar, onBloquear }) {
  const idTitulo = useId()
  const contenedorRef = useFocoAtrapado(true, alCerrar)

  useEffect(() => {
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previo }
  }, [])

  return (
    <div className={estilos.capaHoja}>
      <motion.div
        className={estilos.scrim}
        variants={variantesScrim}
        initial="oculto"
        animate="visible"
        exit="oculto"
        transition={fundido}
        onClick={alCerrar}
        aria-hidden="true"
      />
      <motion.div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={estilos.hoja}
        variants={variantesHoja}
        initial="oculto"
        animate="visible"
        exit="oculto"
        transition={springSuave}
      >
        <span className={estilos.agarradera} aria-hidden="true" />
        <h2 id={idTitulo} className={estilos.tituloHoja}>Más opciones</h2>
        <ul className={estilos.listaHoja}>
          {items.map(({ a, Icono, etiqueta }) => (
            <li key={a}>
              <NavLink
                to={a}
                onClick={alCerrar}
                className={({ isActive }) => [estilos.opcion, isActive && estilos.opcionActiva].filter(Boolean).join(' ')}
              >
                <Icono size={20} aria-hidden="true" />
                {etiqueta}
              </NavLink>
            </li>
          ))}
          {onBloquear && (
            <li>
              <button
                type="button"
                className={estilos.opcion}
                onClick={() => { alCerrar(); onBloquear() }}
              >
                <Lock size={20} aria-hidden="true" />
                Bloquear
              </button>
            </li>
          )}
        </ul>
      </motion.div>
    </div>
  )
}
