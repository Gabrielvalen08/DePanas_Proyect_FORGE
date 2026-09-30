import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, Plus, Trash2, ShoppingCart } from 'lucide-react'
import Header from '../components/Header'
import FilterModal from '../components/FilterModal'
import ConfirmModal from '../components/ConfirmModal'
import { fetchCompras, eliminarCompra } from '../services/api'
import { useToast } from '../context/ToastContext'

const EMPTY_FILTERS = {
  proveedor: '',
  producto: '',
  fechaDesde: '',
  fechaHasta: '',
}

function hasActiveFilters(filters) {
  return Object.values(filters).some(v => v !== '')
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export default function PantallaMaestra() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadCompras = useCallback(async (f) => {
    setLoading(true)
    try {
      const data = await fetchCompras(f)
      setCompras(data)
    } catch (err) {
      addToast('Error al cargar las compras', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadCompras(filters)
  }, [filters, loadCompras])

  function handleApplyFilters(newFilters) {
    setFilters(newFilters)
  }

  async function handleDelete(id) {
    try {
      await eliminarCompra(id)
      addToast('Compra eliminada correctamente')
      loadCompras(filters)
    } catch {
      addToast('Error al eliminar la compra', 'error')
    }
  }

  const activeFilters = hasActiveFilters(filters)

  return (
    <>
      <Header title="Pantalla Maestra" badge="Compras" />

      <main className="content" id="pantalla-maestra-content">
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              id="open-filter-btn"
              className={`btn btn-sm ${activeFilters ? 'btn-brown' : 'btn-ghost'}`}
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal size={15} />
              Filtrar
              {activeFilters && (
                <span style={{
                  background: 'var(--gold)',
                  color: 'var(--brown)',
                  borderRadius: '999px',
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 800,
                  marginLeft: 2,
                }}>
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </button>

            {activeFilters && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setFilters(EMPTY_FILTERS)}
                id="clear-filters-btn"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <button
            id="go-agregar-compra-btn"
            className="btn btn-primary"
            onClick={() => navigate('/agregar-compra')}
          >
            <Plus size={16} />
            Agregar Compra
          </button>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShoppingCart size={18} color="var(--brown)" />
              <span className="card-title">Registro de Compras</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-500)' }}>
              {loading ? '...' : `${compras.length} registro${compras.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="table-wrapper" style={{ margin: '0', borderRadius: 0, border: 'none' }}>
            {loading ? (
              <div className="empty-state">
                <div style={{ fontSize: 32 }}>⏳</div>
                <p className="empty-state__title">Cargando...</p>
              </div>
            ) : compras.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🛒</div>
                <p className="empty-state__title">
                  {activeFilters ? 'Sin resultados' : 'No hay compras registradas'}
                </p>
                <p className="empty-state__sub">
                  {activeFilters
                    ? 'Intenta con otros filtros'
                    : 'Agrega tu primera compra con el botón de arriba'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" aria-label="Tabla de compras">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio al que se compró</th>
                      <th>Fecha en que se compró</th>
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map(compra => (
                      <tr key={compra.id}>
                        <td>
                          <span className="proveedor-chip">{compra.proveedor}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{compra.producto}</td>
                        <td className="qty">
                          <span className="qty-badge">
                            {compra.cantidad} {compra.unidad}
                          </span>
                        </td>
                        <td className="price">{formatPrice(compra.precio)}</td>
                        <td className="date">{formatDate(compra.fecha)}</td>
                        <td>
                          <button
                            className="remove-row-btn"
                            title="Eliminar compra"
                            aria-label={`Eliminar compra de ${compra.producto}`}
                            onClick={() => setDeleteTarget(compra.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modales */}
      <FilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Eliminar compra"
        message="¿Seguro que deseas eliminar este registro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
      />
    </>
  )
}
