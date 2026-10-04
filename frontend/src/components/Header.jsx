import { Calendar } from 'lucide-react'
import { Insignia } from './common'
import { useScrollDetectado } from '../hooks/useScrollDetectado'
import { formatearFechaLarga } from '../utils/formato'
import estilos from './Header.module.css'

/** Header translúcido. Props: title (título de la página), badge (contexto). */
export default function Header({ title, badge }) {
  const [centinelaRef, hayScroll] = useScrollDetectado()
  const hoy = formatearFechaLarga(new Date())

  return (
    <>
      <div ref={centinelaRef} className={estilos.centinela} aria-hidden="true" />
      <header className={estilos.header} data-scroll={hayScroll}>
        <div className={estilos.izquierda}>
          <span className={estilos.logoMovil} aria-hidden="true">DE PANAS</span>
          <h1 className={estilos.titulo}>{title}</h1>
          {badge && <Insignia tono="marca">{badge}</Insignia>}
        </div>
        <p className={estilos.fecha}>
          <Calendar size={16} aria-hidden="true" />
          <span className={estilos.fechaTexto}>{hoy}</span>
        </p>
      </header>
    </>
  )
}
