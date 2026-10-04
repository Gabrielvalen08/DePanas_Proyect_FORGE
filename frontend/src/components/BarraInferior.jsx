import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { itemsNavegacion } from './navegacion'
import { springSuave } from '../styles/movimiento'
import estilos from './BarraInferior.module.css'

/** Navegación móvil (< 768px). La píldora activa se desliza entre ítems. */
export default function BarraInferior() {
  return (
    <nav className={estilos.barra} aria-label="Menú principal móvil">
      <ul className={estilos.lista}>
        {itemsNavegacion.map(({ a, Icono, etiquetaCorta }) => (
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
      </ul>
    </nav>
  )
}
