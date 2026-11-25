import { ConfirmDialog } from './common'
import { CONFIRMAR } from '../utils/mensajes'

/**
 * ConfirmarCambios
 * La confirmación de «Guardar» de lo que se edita en el catálogo. Si el nombre cambió,
 * avisa que el nombre nuevo se aplica en todas las compras registradas (renombrar un
 * proveedor, categoría, artículo o producto también lo cambia en sus compras).
 *
 * Props: isOpen, onClose, onConfirm (como ConfirmDialog) y
 *  - anterior: el nombre guardado; vacío o ausente al agregar (no hay nada que renombrar)
 *  - nombre: el nombre escrito en el formulario
 */
export default function ConfirmarCambios({ isOpen, onClose, onConfirm, anterior = '', nombre = '' }) {
  const viejo = anterior.trim()
  const nuevo = nombre.trim()
  const renombra = Boolean(viejo) && Boolean(nuevo) && viejo !== nuevo
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={CONFIRMAR.guardarCambios.titulo}
      message={renombra ? CONFIRMAR.guardarCambios.renombre(viejo, nuevo) : CONFIRMAR.guardarCambios.mensaje}
      confirmLabel={CONFIRMAR.guardarCambios.confirmar}
    />
  )
}
