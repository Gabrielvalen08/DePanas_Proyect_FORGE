import { NavLink } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { itemsNavegacion } from './navegacion'
import estilos from './Sidebar.module.css'

export default function Sidebar({ onBloquear }) {
  return (
    <aside className={estilos.sidebar}>
      <div className={estilos.logo}>
        <span className={estilos.logoTexto}>DE PANAS</span>
        <span className={estilos.franja} aria-hidden="true" />
      </div>

      <nav aria-label="Menú principal">
        <ul className={estilos.lista}>
          {itemsNavegacion.map(({ a, Icono, etiqueta }) => (
            <li key={a}>
              <NavLink
                to={a}
                end={a === '/'}
                className={({ isActive }) => [estilos.item, isActive && estilos.activo].filter(Boolean).join(' ')}
              >
                <Icono size={20} aria-hidden="true" />
                <span className={estilos.etiqueta}>{etiqueta}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {onBloquear && (
        <div className={estilos.pie}>
          <button
            type="button"
            onClick={onBloquear}
            className={estilos.botonBloquear}
            title="Bloquear sistema"
          >
            <Lock size={18} aria-hidden="true" />
            <span className={estilos.etiqueta}>Bloquear</span>
          </button>
        </div>
      )}
    </aside>
  )
}

