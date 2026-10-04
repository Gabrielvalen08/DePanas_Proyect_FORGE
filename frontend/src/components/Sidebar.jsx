import { NavLink } from 'react-router-dom'
import { itemsNavegacion } from './navegacion'
import estilos from './Sidebar.module.css'

export default function Sidebar() {
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
    </aside>
  )
}
