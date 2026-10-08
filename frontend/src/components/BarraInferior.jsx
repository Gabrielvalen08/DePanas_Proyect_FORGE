import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { itemsNavegacion, itemsPie } from './navegacion'
import { springSuave } from '../styles/movimiento'
import estilos from './BarraInferior.module.css'

/** Navegación móvil (< 768px). La píldora activa se desliza entre ítems. */
export default function BarraInferior({ onBloquear }) {
  const { tienePermiso } = useAuth()
  const itemsVisibles = [...itemsNavegacion, ...itemsPie].filter(item => tienePermiso(item.a))

  return (
    <nav className={estilos.barra} aria-label="Menú principal móvil">
      <ul className={estilos.lista}>
        {itemsVisibles.map(({ a, Icono, etiquetaCorta }) => (
          <li key={a} className={estilos.celda}>
            <NavLink
              to={a}
              end={a === '/'}
              className={({ isActive }) => [estilos.item, isActive && estilos.activo].filter(Boolean).join(' ')}
            >
              {({ isActive }) => (
                <>
                  <span className={estilos.iconoCaja}>
                    {isActive && (
                      <motion.span layoutId="nav-activa" className={estilos.pildora} transition={springSuave} />
                    )}
                    <Icono size={22} aria-hidden="true" className={estilos.icono} />
                  </span>
                  <span className={estilos.etiqueta}>{etiquetaCorta}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}

        {onBloquear && (
          <li className={estilos.celda}>
            <button
              type="button"
              onClick={onBloquear}
              className={estilos.itemBoton}
              aria-label="Bloquear sistema"
              title="Bloquear"
            >
              <span className={estilos.iconoCaja}>
                <Lock size={20} aria-hidden="true" className={estilos.icono} />
              </span>
              <span className={estilos.etiqueta}>Bloquear</span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
