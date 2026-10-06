import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { Campo } from './common'
import { springSuave, variantesDesplegable } from '../styles/movimiento'
import { textoBusqueda } from '../utils/formato'
import estilos from './AutocompleteInput.module.css'

/**
 * AutocompleteInput
 * Combobox con lista (WAI-ARIA APG) que funciona como el desplegable de Excel:
 * al hacer clic (o con la flecha) muestra todas las opciones, al escribir las
 * filtra y se elige una con clic o flechas + Enter. También acepta texto nuevo.
 * getSuggestions(texto) es síncrona; con texto vacío devuelve todas.
 * Props: id, value, onChange, onBlur, placeholder, getSuggestions,
 *        etiqueta, etiquetaOculta, error, ayuda,
 *        onSeleccionar(valor): se llama al elegir una opción de la lista
 */
export default function AutocompleteInput({
  id,
  value,
  onChange,
  onSeleccionar,
  onBlur,
  placeholder,
  getSuggestions,
  etiqueta,
  etiquetaOculta = false,
  error,
  ayuda,
}) {
  const [sugerencias, setSugerencias] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [resaltada, setResaltada] = useState(-1)
  const idLista = `${id}-lista`

  // La opción resaltada con el teclado siempre queda a la vista
  useEffect(() => {
    if (abierto && resaltada >= 0) {
      document.getElementById(`${id}-op-${resaltada}`)?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [abierto, resaltada, id])

  function mostrar(texto) {
    const lista = getSuggestions(texto)
    setSugerencias(lista)
    setAbierto(lista.length > 0)
    setResaltada(-1)
  }

  /** Lista completa, como al abrir el desplegable de Excel; resalta el valor actual */
  function mostrarTodas() {
    const lista = getSuggestions('')
    setSugerencias(lista)
    setAbierto(lista.length > 0)
    setResaltada(lista.findIndex(s => textoBusqueda(s) === textoBusqueda(value.trim())))
  }

  function cerrar() {
    setAbierto(false)
    setResaltada(-1)
  }

  function alternar() {
    if (abierto) cerrar()
    else mostrarTodas()
    document.getElementById(id)?.focus()
  }

  function alCambiar(e) {
    const texto = e.target.value
    onChange(texto)
    if (texto) mostrar(texto)
    else mostrarTodas()
  }

  function seleccionar(valor) {
    onChange(valor)
    cerrar()
    onSeleccionar?.(valor)
  }

  function alTeclear(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!abierto) mostrarTodas()
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
      ayuda={ayuda}
      value={value}
      placeholder={placeholder}
      autoComplete="off"
      role="combobox"
      aria-expanded={abierto}
      aria-controls={idLista}
      aria-autocomplete="list"
      aria-activedescendant={abierto && resaltada >= 0 ? `${id}-op-${resaltada}` : undefined}
      className={estilos.combo}
      onChange={alCambiar}
      onKeyDown={alTeclear}
      onClick={() => !abierto && mostrarTodas()}
      onBlur={alSalir}
    >
      {/* Flecha del desplegable: fuera del orden de tabulación (patrón APG) */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Mostrar opciones de ${etiqueta}`}
        aria-controls={idLista}
        aria-expanded={abierto}
        className={[estilos.flecha, abierto && estilos.flechaAbierta].filter(Boolean).join(' ')}
        onPointerDown={e => e.preventDefault()} // el input no pierde el foco
        onClick={alternar}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
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
        {abierto ? `${sugerencias.length} opci${sugerencias.length !== 1 ? 'ones' : 'ón'} disponible${sugerencias.length !== 1 ? 's' : ''}` : ''}
      </span>
    </Campo>
  )
}

/** Marca en negrita la parte que coincide con lo escrito (sin distinguir tildes) */
function Resaltado({ texto, busqueda }) {
  const buscado = textoBusqueda(busqueda?.trim())
  const indice = buscado ? textoBusqueda(texto).indexOf(buscado) : -1
  if (indice < 0) return texto
  return (
    <>
      {texto.slice(0, indice)}
      <mark className={estilos.coincidencia}>{texto.slice(indice, indice + buscado.length)}</mark>
      {texto.slice(indice + buscado.length)}
    </>
  )
}
