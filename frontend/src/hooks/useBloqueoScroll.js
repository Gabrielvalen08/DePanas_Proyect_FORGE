import { useEffect } from 'react'

/*
 * Un solo bloqueo para todas las ventanas abiertas. Antes cada ventana guardaba el
 * overflow que había al abrirse y lo restauraba al cerrarse: con dos a la vez (un
 * editor y su «¿Guardamos…?») la segunda guardaba 'hidden', y si el editor se
 * desmontaba primero, la confirmación dejaba la página sin poder bajar.
 * Ahora se cuentan: el scroll vuelve cuando se cierra la última, en cualquier orden.
 */
let abiertas = 0
let overflowOriginal = ''

export function bloquearScroll() {
  if (abiertas === 0) {
    overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  abiertas += 1
  let liberado = false
  return function liberar() {
    if (liberado) return
    liberado = true
    abiertas -= 1
    if (abiertas === 0) document.body.style.overflow = overflowOriginal
  }
}

/** Bloquea el scroll de la página mientras el componente está montado */
export function useBloqueoScroll() {
  useEffect(() => bloquearScroll(), [])
}
