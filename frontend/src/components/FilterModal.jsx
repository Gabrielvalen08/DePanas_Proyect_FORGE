import React, { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'

/**
 * FilterModal
 * Modal para filtrar la pantalla maestra de compras.
 * Props:
 *  - isOpen, onClose
 *  - filters: { proveedor, producto, fechaDesde, fechaHasta }
 *  - onApply(filters)
 */
export default function FilterModal({ isOpen, onClose, filters, onApply }) {
  const [local, setLocal] = useState({ ...filters })

  if (!isOpen) return null

  function handleChange(field, value) {
    setLocal(prev => ({ ...prev, [field]: value }))
  }

  function handleApply() {
    onApply(local)
    onClose()
  }

  function handleClear() {
    const empty = { proveedor: '', producto: '', fechaDesde: '', fechaHasta: '' }
    setLocal(empty)
    onApply(empty)
    onClose()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="filter-modal-title">
      <div className="modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SlidersHorizontal size={20} color="var(--brown)" />
            <span className="modal-title" id="filter-modal-title">Filtrar Compras</span>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Cerrar filtros"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="filter-form">
            {/* Proveedor */}
            <div className="input-group">
              <label className="input-label" htmlFor="filter-proveedor">Proveedor</label>
              <input
                id="filter-proveedor"
                className="input"
                placeholder="Ej: Súper Selectos"
                value={local.proveedor}
                onChange={e => handleChange('proveedor', e.target.value)}
              />
            </div>

            {/* Producto */}
            <div className="input-group">
              <label className="input-label" htmlFor="filter-producto">Producto</label>
              <input
                id="filter-producto"
                className="input"
                placeholder="Ej: Pollo"
                value={local.producto}
                onChange={e => handleChange('producto', e.target.value)}
              />
            </div>

            {/* Fecha desde */}
            <div className="input-group">
              <label className="input-label" htmlFor="filter-fecha-desde">Fecha desde</label>
              <input
                id="filter-fecha-desde"
                type="date"
                className="input"
                value={local.fechaDesde}
                onChange={e => handleChange('fechaDesde', e.target.value)}
              />
            </div>

            {/* Fecha hasta */}
            <div className="input-group">
              <label className="input-label" htmlFor="filter-fecha-hasta">Fecha hasta</label>
              <input
                id="filter-fecha-hasta"
                type="date"
                className="input"
                value={local.fechaHasta}
                onChange={e => handleChange('fechaHasta', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={handleClear} id="filter-clear-btn">
            Limpiar
          </button>
          <button className="btn btn-brown btn-sm" onClick={handleApply} id="filter-apply-btn">
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  )
}
