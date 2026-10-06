import { NavLink } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { itemConfiguracion, itemsNavegacion } from './navegacion'
import estilos from './Sidebar.module.css'

export default function Sidebar({ onBloquear }) {
  return (
    <aside className={estilos.sidebar}>
      <div className={estilos.logo}>
        <div className={estilos.marca}>
          {/* Decorativo: el nombre ya está escrito al lado */}
          <img src="/brand/arepa.png" alt="" width="40" height="40" className={estilos.logoImagen} />
          <span className={estilos.logoTexto}>DE PANAS</span>
        </div>
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

      <div className={estilos.pie}>
        <NavLink
          to={itemConfiguracion.a}
          className={({ isActive }) => [estilos.item, isActive && estilos.activo].filter(Boolean).join(' ')}
        >
          <itemConfiguracion.Icono size={20} aria-hidden="true" />
          <span className={estilos.etiqueta}>{itemConfiguracion.etiqueta}</span>
        </NavLink>
        {onBloquear && (
          <button
            type="button"
            onClick={onBloquear}
            className={estilos.botonBloquear}
            title="Bloquear sistema"
          >
            <Lock size={18} aria-hidden="true" />
            <span className={estilos.etiqueta}>Bloquear</span>
          </button>
        )}
      </div>
    </aside>
  )
}

