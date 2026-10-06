import { Calendar } from 'lucide-react'
import { Insignia } from './common'
import { useScrollDetectado } from '../hooks/useScrollDetectado'
import { formatearFechaLarga } from '../utils/formato'
import estilos from './Header.module.css'

/**
 * Header fijo: transparente sobre el collage y crema sólido al hacer scroll. Props: title (título de la página), badge (contexto),
 * frase (frase de la voz de marca bajo el título; ver utils/mensajes.js).
 */
export default function Header({ title, badge, frase }) {
  const [centinelaRef, hayScroll] = useScrollDetectado()
  const hoy = formatearFechaLarga(new Date())

  return (
    <>
      <div ref={centinelaRef} className={estilos.centinela} aria-hidden="true" />
      <header className={estilos.header} data-scroll={hayScroll}>
        <div className={estilos.izquierda}>
          <span className={estilos.logoMovil} aria-hidden="true">DE PANAS</span>
          <div className={estilos.textos}>
            <h1 className={estilos.titulo}>{title}</h1>
            {frase && <p className={estilos.frase}>{frase}</p>}
          </div>
          {badge && <Insignia tono="marca" className={estilos.insignia}>{badge}</Insignia>}
        </div>
        <p className={estilos.fecha}>
          <Calendar size={16} aria-hidden="true" />
          <span className={estilos.fechaTexto}>{hoy}</span>
        </p>
      </header>
    </>
  )
}
