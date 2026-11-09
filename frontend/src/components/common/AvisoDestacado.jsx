import { AlertTriangle } from 'lucide-react'
import estilos from './AvisoDestacado.module.css'

/**
 * AvisoDestacado
 * Advertencia llamativa que no impide seguir (p. ej. un nombre parecido a otro ya registrado).
 * La región viva queda siempre montada para que el lector de pantalla anuncie el aviso al aparecer;
 * sin `texto` no ocupa espacio. `id`: para enlazarlo a su campo con aria-describedby.
 */
export default function AvisoDestacado({ id, texto }) {
  return (
    <div role="status">
      {texto && (
        <p id={id} className={estilos.aviso}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{texto}</span>
        </p>
      )}
    </div>
  )
}
