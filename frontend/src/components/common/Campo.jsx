import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'
import estilos from './Campo.module.css'

/**
 * Campo
 * Input con label siempre presente, ayuda y error enlazados por aria-describedby.
 * children: contenido extra dentro del control (p. ej. la lista del autocompletado).
 */
const Campo = forwardRef(function Campo(
  {
    id,
    etiqueta,
    etiquetaOculta = false,
    tipo = 'text',
    prefijo,
    error,
    ayuda,
    className,
    children,
    'aria-describedby': describedByExterno,
    ...resto
  },
  ref
) {
  const idError = error ? `${id}-error` : null
  const idAyuda = ayuda ? `${id}-ayuda` : null
  const describedBy = [describedByExterno, idAyuda, idError].filter(Boolean).join(' ') || undefined

  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label
        htmlFor={id}
        className={etiquetaOculta ? 'solo-lector' : estilos.etiqueta}
        data-etiqueta-oculta={etiquetaOculta || undefined}
      >
        {etiqueta}
      </label>
      <div className={estilos.control}>
        {prefijo && <span className={estilos.prefijo} aria-hidden="true">{prefijo}</span>}
        <input
          ref={ref}
          id={id}
          type={tipo}
          className={[estilos.input, prefijo && estilos.conPrefijo, error && estilos.conError]
            .filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...resto}
        />
        {children}
      </div>
      {ayuda && <p id={idAyuda} className={estilos.ayuda}>{ayuda}</p>}
      {error && (
        <p id={idError} className={estilos.error}>
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
})

export default Campo
