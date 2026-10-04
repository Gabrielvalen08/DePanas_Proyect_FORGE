import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import estilos from './Boton.module.css'

/**
 * Boton
 * variante: primario | secundario | fantasma | peligro | icono
 * tamano: sm | md
 * a: si se pasa una ruta, se renderiza como enlace de React Router
 */
const Boton = forwardRef(function Boton(
  {
    variante = 'secundario',
    tamano = 'md',
    icono,
    cargando = false,
    sombra = false,
    ancho = false,
    a,
    type = 'button',
    disabled,
    className,
    children,
    ...resto
  },
  ref
) {
  if (import.meta.env.DEV && variante === 'icono' && !resto['aria-label']) {
    console.error('Boton: la variante "icono" necesita aria-label')
  }

  const clases = [
    estilos.boton,
    estilos[variante === 'icono' ? 'soloIcono' : variante],
    estilos[tamano],
    sombra && estilos.conSombra,
    ancho && estilos.ancho,
    className,
  ].filter(Boolean).join(' ')

  const contenido = (
    <>
      {cargando
        ? <Loader2 className={`${estilos.icono} ${estilos.girando}`} aria-hidden="true" />
        : icono && <span className={estilos.icono} aria-hidden="true">{icono}</span>}
      {children != null && children !== false && <span className={estilos.texto}>{children}</span>}
    </>
  )

  if (a) {
    return (
      <Link ref={ref} to={a} className={clases} {...resto}>
        {contenido}
      </Link>
    )
  }

  return (
    <button
      ref={ref}
      type={type}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {contenido}
    </button>
  )
})

export default Boton
