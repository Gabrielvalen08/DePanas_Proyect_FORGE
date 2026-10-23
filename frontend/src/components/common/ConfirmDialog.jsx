import { useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import Boton from './Boton'
import Modal, { CuerpoModal, PieModal } from './Modal'
import estilos from './ConfirmDialog.module.css'

/**
 * ConfirmDialog
 * Confirmación (alertdialog). Al abrir, el foco va a "Cancelar", nunca a la
 * acción destructiva. Props: isOpen, onClose, onConfirm, title, message,
 * confirmLabel, cancelLabel, danger
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
}) {
  const cancelarRef = useRef(null)

  return (
    <Modal
      abierto={isOpen}
      alCerrar={onClose}
      titulo={title}
      icono={danger ? <AlertTriangle className={estilos.iconoPeligro} /> : undefined}
      rol="alertdialog"
      anchoMax="sm"
      focoInicial={cancelarRef}
    >
      <CuerpoModal>
        <p>{message}</p>
      </CuerpoModal>
      <PieModal>
        <Boton ref={cancelarRef} variante="fantasma" onClick={onClose} id="confirm-cancel-btn">
          {cancelLabel}
        </Boton>
        <Boton
          variante={danger ? 'peligro' : 'primario'}
          onClick={() => { onConfirm(); onClose() }}
          id="confirm-ok-btn"
        >
          {confirmLabel}
        </Boton>
      </PieModal>
    </Modal>
  )
}
