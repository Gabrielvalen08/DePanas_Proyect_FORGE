import React from 'react'
import { Calendar } from 'lucide-react'

function formatDate(date) {
  return date.toLocaleDateString('es-SV', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Header({ title, badge }) {
  const today = formatDate(new Date())

  return (
    <header className="header" role="banner">
      <div className="header__left">
        <h1 className="header__title">{title}</h1>
        {badge && <span className="header__badge">{badge}</span>}
      </div>
      <div className="header__right">
        <div className="header__date">
          <Calendar size={14} />
          {today}
        </div>
      </div>
    </header>
  )
}
