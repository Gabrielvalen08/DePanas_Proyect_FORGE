import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Campo } from './common'
import { springSuave, variantesDesplegable } from '../styles/movimiento'
import estilos from './AutocompleteInput.module.css'

const MAX_SUGERENCIAS = 8

/**
 * AutocompleteInput
 * Combobox con lista (WAI-ARIA APG). getSuggestions(texto) es síncrona.
 * Props: id, value, onChange, onBlur, placeholder, getSuggestions,
 *        etiqueta, etiquetaOculta, error
 */
export default function AutocompleteInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  getSuggestions,
  etiqueta,
  etiquetaOculta = false,
  error,
}) {
  const [sugerencias, setSugerencias] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [resaltada, setResaltada] = useState(-1)
  const idLista = `${id}-lista`

  function mostrar(texto) {
    const lista = getSuggestions(texto).slice(0, MAX_SUGERENCIAS)
    setSugerencias(lista)
    setAbierto(lista.length > 0)
    setResaltada(-1)
  }

  function cerrar() {
    setAbierto(false)
    setResaltada(-1)
  }

  function alCambiar(e) {
    const texto = e.target.value
    onChange(texto)
    if (texto) mostrar(texto)
    else cerrar()
  }

  function seleccionar(valor) {
    onChange(valor)
    cerrar()
  }

  function alTeclear(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!abierto) mostrar(value)
      else setResaltada(i => Math.min(i + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (abierto) setResaltada(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && abierto && resaltada >= 0) {
      e.preventDefault()
      seleccionar(sugerencias[resaltada])
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault()
      e.stopPropagation()
      cerrar()
    } else if (e.key === 'Tab') {
      cerrar()
    }
  }

  function alSalir(e) {
    cerrar()
    onBlur?.(e)
  }

  return (
    <Campo
      id={id}
      etiqueta={etiqueta}
      etiquetaOculta={etiquetaOculta}
      error={error}
      value={value}
      placeholder={placeholder}
      autoComplete="off"
      role="combobox"
      aria-expanded={abierto}
      aria-controls={idLista}
      aria-autocomplete="list"
      aria-activedescendant={abierto && resaltada >= 0 ? `${id}-op-${resaltada}` : undefined}
      onChange={alCambiar}
      onKeyDown={alTeclear}
      onBlur={alSalir}
    >
      <AnimatePresence>
        {abierto && (
          <motion.div
            key="lista"
            id={idLista}
            role="listbox"
            aria-label={etiqueta}
            className={estilos.lista}
            variants={variantesDesplegable}
            initial="oculto"
            animate="visible"
            exit="oculto"
            transition={springSuave}
          >
            {sugerencias.map((s, i) => (
              // El teclado se maneja desde el input (aria-activedescendant), patrón WAI-ARIA combobox
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <div
                key={s}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={i === resaltada}
                tabIndex={-1}
                className={[estilos.opcion, i === resaltada && estilos.resaltada].filter(Boolean).join(' ')}
                onPointerDown={e => e.preventDefault()} // el input no pierde el foco
                onClick={() => seleccionar(s)}
              >
                <span><Resaltado texto={s} busqueda={value} /></span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <span className="solo-lector" aria-live="polite">
        {abierto ? `${sugerencias.length} sugerencia${sugerencias.length !== 1 ? 's' : ''} disponible${sugerencias.length !== 1 ? 's' : ''}` : ''}
      </span>
    </Campo>
  )
}

/** Marca en negrita la parte que coincide con lo escrito */
function Resaltado({ texto, busqueda }) {
  const indice = busqueda ? texto.toLowerCase().indexOf(busqueda.toLowerCase()) : -1
  if (indice < 0) return texto
  return (
    <>
      {texto.slice(0, indice)}
      <mark className={estilos.coincidencia}>{texto.slice(indice, indice + busqueda.length)}</mark>
      {texto.slice(indice + busqueda.length)}
    </>
  )
}
