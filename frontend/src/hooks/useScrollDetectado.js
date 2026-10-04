import { useEffect, useRef, useState } from 'react'

/**
 * Devuelve [centinelaRef, hayScroll]. Coloca el centinela (1px) al inicio
 * del contenido: cuando sale de la vista, hayScroll pasa a true.
 * Usa IntersectionObserver en lugar de un listener de scroll.
 */
export function useScrollDetectado() {
  const centinelaRef = useRef(null)
  const [hayScroll, setHayScroll] = useState(false)

  useEffect(() => {
    const centinela = centinelaRef.current
    if (!centinela || typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(([entrada]) => {
      setHayScroll(!entrada.isIntersecting)
    })
    observador.observe(centinela)
    return () => observador.disconnect()
  }, [])

  return [centinelaRef, hayScroll]
}
