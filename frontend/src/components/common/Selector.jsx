import { forwardRef } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import estilos from './Selector.module.css'

/**
 * Selector
 * <select> nativo con el mismo contrato que Campo.
 * opciones: string[] | { valor, texto }[]
 */
const Selector = forwardRef(function Selector(
  { id, etiqueta, etiquetaOculta = false, opciones = [], error, className, ...resto },
  ref
) {
  const idError = error ? `${id}-error` : null

  return (
    <div className={[estilos.selector, className].filter(Boolean).join(' ')}>
      <label
        htmlFor={id}
        className={etiquetaOculta ? 'solo-lector' : estilos.etiqueta}
        data-etiqueta-oculta={etiquetaOculta || undefined}
      >
        {etiqueta}
      </label>
      <div className={estilos.control}>
        <select
          ref={ref}
          id={id}
          className={[estilos.select, error && estilos.conError].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={idError || undefined}
          {...resto}
        >
          {opciones.map(op => {
            const valor = typeof op === 'string' ? op : op.valor
            const texto = typeof op === 'string' ? op : op.texto
            return <option key={valor} value={valor}>{texto}</option>
          })}
        </select>
        <ChevronDown className={estilos.flecha} size={16} aria-hidden="true" />
      </div>
      {error && (
        <p id={idError} className={estilos.error}>
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
})

export default Selector
