import { NavLink } from 'react-router-dom'
import { LogOut, Power } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { itemsNavegacion, itemsPie } from './navegacion'
import { APAGADO } from '../utils/mensajes'
import estilos from './Sidebar.module.css'

/** En la versión del .zip (el servidor corre oculto en la computadora) llega onApagar y no onCerrarSesion */
export default function Sidebar({ onCerrarSesion, onApagar }) {
  const { tienePermiso } = useAuth()
  const navegacionFiltrada = itemsNavegacion.filter(item => !item.oculto && tienePermiso(item.a))
  const pieFiltrado = itemsPie.filter(item => tienePermiso(item.a))

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
          {navegacionFiltrada.map(({ a, Icono, etiqueta }) => (
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
        {pieFiltrado.map(({ a, Icono, etiqueta }) => (
          <NavLink
            key={a}
            to={a}
            className={({ isActive }) => [estilos.item, isActive && estilos.activo].filter(Boolean).join(' ')}
          >
            <Icono size={20} aria-hidden="true" />
            <span className={estilos.etiqueta}>{etiqueta}</span>
          </NavLink>
        ))}
        {onCerrarSesion && (
          <button
            type="button"
            onClick={onCerrarSesion}
            className={estilos.botonBloquear}
            title="Cerrar sesión"
          >
            <LogOut size={18} aria-hidden="true" />
            <span className={estilos.etiqueta}>Cerrar sesión</span>
          </button>
        )}
        {onApagar && (
          <button type="button" onClick={onApagar} className={estilos.botonBloquear}>
            <Power size={18} aria-hidden="true" />
            <span className={estilos.etiqueta}>{APAGADO.boton}</span>
          </button>
        )}
      </div>
    </aside>
  )
}
