import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * ConfirmModal
 * Modal de confirmación genérico.
 * Props: isOpen, onClose, onConfirm, title, message, confirmLabel, danger
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  danger = false,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {danger && <AlertTriangle size={20} color="var(--error)" />}
            <span className="modal-title" id="confirm-modal-title">{title}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--gray-700)', fontWeight: 500 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="confirm-cancel-btn">
            Cancelar
          </button>
          <button
            className={`btn btn-sm ${danger ? 'btn-brown' : 'btn-primary'}`}
            style={danger ? { background: 'var(--error)' } : {}}
            onClick={() => { onConfirm(); onClose() }}
            id="confirm-ok-btn"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
