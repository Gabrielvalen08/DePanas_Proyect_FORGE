import { useEffect, useRef } from 'react'

const ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Atrapa el foco dentro de un contenedor mientras `activo` es true:
 * enfoca el primer elemento (o focoInicialRef), cicla con Tab/Shift+Tab,
 * cierra con Escape y devuelve el foco al elemento previo al desactivarse.
 */
export function useFocoAtrapado(activo, alCerrar, focoInicialRef) {
  const contenedorRef = useRef(null)
  // Guarda el último alCerrar sin reiniciar el efecto en cada render del padre
  const alCerrarRef = useRef(alCerrar)

  useEffect(() => {
    alCerrarRef.current = alCerrar
  }, [alCerrar])

  useEffect(() => {
    if (!activo) return
    const contenedor = contenedorRef.current
    if (!contenedor) return
    const anterior = document.activeElement
    const enfocables = () => [...contenedor.querySelectorAll(ENFOCABLES)]

    ;(focoInicialRef?.current ?? enfocables()[0] ?? contenedor).focus()

    function alTeclear(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        alCerrarRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const lista = enfocables()
      if (lista.length === 0) return
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    contenedor.addEventListener('keydown', alTeclear)
    return () => {
      contenedor.removeEventListener('keydown', alTeclear)
      anterior?.focus?.()
    }
  }, [activo, focoInicialRef])

  return contenedorRef
}
