import { useCallback, useSyncExternalStore } from 'react'

/** true mientras la media query se cumpla, p. ej. '(max-width: 767px)' */
export function useConsultaMedia(consulta) {
  const suscribir = useCallback(
    (avisar) => {
      const lista = window.matchMedia(consulta)
      lista.addEventListener('change', avisar)
      return () => lista.removeEventListener('change', avisar)
    },
    [consulta]
  )
  return useSyncExternalStore(suscribir, () => window.matchMedia(consulta).matches, () => false)
}
