import { useId } from 'react'
import { Link } from 'react-router-dom'
import estilos from './Tarjeta.module.css'

/**
 * Tarjeta
 * - Con titulo: <section> con encabezado (h2, icono y accion a la derecha).
 * - interactiva + a: toda la tarjeta es un enlace de React Router.
 * - interactiva + onClick: toda la tarjeta es un <button>.
 * - franja: franja superior de identidad en Naranja Sazón.
 */
export default function Tarjeta({
  titulo,
  icono,
  accion,
  sombra = false,
  franja = false,
  interactiva = false,
  a,
  onClick,
  className,
  children,
  ...resto
}) {
  const idTitulo = useId()
  const clases = [
    estilos.tarjeta,
    sombra && estilos.conSombra,
    franja && estilos.conFranja,
    interactiva && estilos.interactiva,
    className,
  ].filter(Boolean).join(' ')

  if (interactiva && a) {
    return <Link to={a} className={clases} {...resto}>{children}</Link>
  }

  if (interactiva && onClick) {
    return <button type="button" className={clases} onClick={onClick} {...resto}>{children}</button>
  }

  if (!titulo) {
    return <div className={clases} {...resto}>{children}</div>
  }

  return (
    <section className={clases} aria-labelledby={idTitulo} {...resto}>
      <header className={estilos.encabezado}>
        <div className={estilos.tituloGrupo}>
          {icono && <span className={estilos.icono} aria-hidden="true">{icono}</span>}
          <h2 id={idTitulo} className={estilos.titulo}>{titulo}</h2>
        </div>
        {accion && <div className={estilos.accion}>{accion}</div>}
      </header>
      {children}
    </section>
  )
}
