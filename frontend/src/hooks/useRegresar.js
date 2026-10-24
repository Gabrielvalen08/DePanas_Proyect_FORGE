import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Función para el botón Regresar: vuelve a la pantalla anterior o, si esta se
 * abrió directo (recarga, enlace, pestaña nueva) y no hay a dónde volver dentro
 * de la app, va a `destino`. navigate(-1) a secas sacaría de la app.
 */
export function useRegresar(destino) {
  const navigate = useNavigate()
  const { key } = useLocation()
  // React Router marca con 'default' la primera entrada del historial de la app
  return () => (key === 'default' ? navigate(destino, { replace: true }) : navigate(-1))
}
