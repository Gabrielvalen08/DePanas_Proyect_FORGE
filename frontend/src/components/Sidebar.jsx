import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  BarChart2,
  Settings,
  UtensilsCrossed,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: <LayoutDashboard size={18} />, label: 'Inicio' },
  { to: '/compras', icon: <ShoppingCart size={18} />, label: 'Compras' },
  { to: '/agregar-compra', icon: <Package size={18} />, label: 'Agregar Compra' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar" role="navigation" aria-label="Menú principal">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">🍽️</div>
        <div>
          <div className="sidebar__logo-text">De Panas</div>
          <div className="sidebar__logo-sub">Gestión SV</div>
        </div>
      </div>

      {/* Nav */}
      <span className="sidebar__section-label">Menú</span>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </aside>
  )
}
