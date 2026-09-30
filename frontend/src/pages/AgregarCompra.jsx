import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Save, ArrowLeft, CalendarDays } from 'lucide-react'
import Header from '../components/Header'
import AutocompleteInput from '../components/AutocompleteInput'
import { guardarCompras, getProveedores, getProductos } from '../services/api'
import { useToast } from '../context/ToastContext'

const UNIDADES = ['lb', 'kg', 'g', 'oz', 'galon', 'litro', 'ml', 'unidad', 'caja', 'bolsa']

function getTodayISO() {
  return new Date().toISOString().split('T')[0]
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  const meses = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre',
  ]
  return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`
}

function emptyFila() {
  return {
    id: Date.now() + Math.random(),
    proveedor: '',
    producto: '',
    cantidad: '',
    unidad: 'lb',
    precio: '',
    fecha: getTodayISO(),
  }
}

function validateFila(fila) {
  const errors = {}
  if (!fila.proveedor.trim()) errors.proveedor = 'Requerido'
  if (!fila.producto.trim()) errors.producto = 'Requerido'
  if (!fila.cantidad || isNaN(fila.cantidad) || Number(fila.cantidad) <= 0)
    errors.cantidad = 'Inválido'
  if (!fila.precio || isNaN(fila.precio) || Number(fila.precio) <= 0)
    errors.precio = 'Inválido'
  return errors
}

export default function AgregarCompra() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const today = getTodayISO()

  const [filas, setFilas] = useState([emptyFila()])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Sugerencias para autocompletado
  const suggestProveedores = useCallback((text) => {
    const lista = getProveedores()
    return lista.filter(p => p.toLowerCase().includes(text.toLowerCase()))
  }, [])

  const suggestProductos = useCallback((text) => {
    const lista = getProductos()
    return lista.filter(p => p.toLowerCase().includes(text.toLowerCase()))
  }, [])

  function updateFila(id, field, value) {
    setFilas(prev =>
      prev.map(f => f.id === id ? { ...f, [field]: value } : f)
    )
    // Limpiar error del campo
    setErrors(prev => {
      const next = { ...prev }
      delete next[`${id}-${field}`]
      return next
    })
  }

  function addFila() {
    setFilas(prev => [...prev, emptyFila()])
  }

  function removeFila(id) {
    if (filas.length === 1) return // siempre al menos 1 fila
    setFilas(prev => prev.filter(f => f.id !== id))
  }

  async function handleGuardar() {
    // Validar todas las filas
    const newErrors = {}
    let hasErrors = false
    filas.forEach(f => {
      const ferrors = validateFila(f)
      if (Object.keys(ferrors).length > 0) {
        hasErrors = true
        Object.entries(ferrors).forEach(([field, msg]) => {
          newErrors[`${f.id}-${field}`] = msg
        })
      }
    })

    if (hasErrors) {
      setErrors(newErrors)
      addToast('Corrige los campos en rojo antes de guardar', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = filas.map(f => ({
        proveedor: f.proveedor.trim(),
        producto: f.producto.trim(),
        cantidad: parseFloat(f.cantidad),
        unidad: f.unidad,
        precio: parseFloat(f.precio),
        fecha: f.fecha || today,
      }))
      await guardarCompras(payload)
      addToast(`${filas.length} compra${filas.length > 1 ? 's' : ''} guardada${filas.length > 1 ? 's' : ''} correctamente`)
      navigate('/compras')
    } catch {
      addToast('Error al guardar las compras', 'error')
    } finally {
      setSaving(false)
    }
  }

  function fieldError(filaId, field) {
    return errors[`${filaId}-${field}`]
  }

  return (
    <>
      <Header title="Agregar Compra" />

      <main className="content" id="agregar-compra-content">
        {/* Page header con fecha */}
        <div className="page-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/compras')}
              id="back-to-maestra-btn"
              style={{ alignSelf: 'flex-start', marginBottom: 4 }}
            >
              <ArrowLeft size={14} />
              Volver
            </button>
            <h2 className="page-title">Agregar Compra</h2>
          </div>

          {/* Indicador de fecha */}
          <div className="date-indicator">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={14} color="var(--brown)" />
              <span className="date-indicator__label">Fecha del día de hoy</span>
            </div>
            <div className="date-indicator__value">{formatDateDisplay(today)}</div>
            <div className="date-indicator__note">
              Esta fecha aparece en todo lo que se agregue en esta compra.
            </div>
          </div>
        </div>

        {/* Tabla editable */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Detalle de compras</span>
            <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
              {filas.length} fila{filas.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="editable-table" aria-label="Tabla de ingreso de compras">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Proveedor</th>
                  <th style={{ minWidth: 180 }}>Producto</th>
                  <th style={{ minWidth: 160 }}>Cantidad</th>
                  <th style={{ minWidth: 130 }}>Precio al que se compró</th>
                  <th style={{ minWidth: 150 }}>Fecha en que se compró</th>
                  <th style={{ width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id}>
                    {/* Proveedor */}
                    <td>
                      <AutocompleteInput
                        id={`proveedor-${fila.id}`}
                        value={fila.proveedor}
                        onChange={val => updateFila(fila.id, 'proveedor', val)}
                        placeholder="Súper Selectos..."
                        getSuggestions={suggestProveedores}
                        className={fieldError(fila.id, 'proveedor') ? 'error' : ''}
                      />
                      {fieldError(fila.id, 'proveedor') && (
                        <span style={{ color: 'var(--error)', fontSize: 11, fontWeight: 600 }}>
                          {fieldError(fila.id, 'proveedor')}
                        </span>
                      )}
                    </td>

                    {/* Producto */}
                    <td>
                      <AutocompleteInput
                        id={`producto-${fila.id}`}
                        value={fila.producto}
                        onChange={val => updateFila(fila.id, 'producto', val)}
                        placeholder="Pollo, arroz..."
                        getSuggestions={suggestProductos}
                        className={fieldError(fila.id, 'producto') ? 'error' : ''}
                      />
                      {fieldError(fila.id, 'producto') && (
                        <span style={{ color: 'var(--error)', fontSize: 11, fontWeight: 600 }}>
                          {fieldError(fila.id, 'producto')}
                        </span>
                      )}
                    </td>

                    {/* Cantidad + Unidad */}
                    <td>
                      <div
                        className={`input-with-unit ${fieldError(fila.id, 'cantidad') ? 'error' : ''}`}
                        style={fieldError(fila.id, 'cantidad') ? { borderColor: 'var(--error)' } : {}}
                      >
                        <input
                          id={`cantidad-${fila.id}`}
                          className="input"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="3"
                          value={fila.cantidad}
                          onChange={e => updateFila(fila.id, 'cantidad', e.target.value)}
                        />
                        <select
                          id={`unidad-${fila.id}`}
                          className="unit-select"
                          value={fila.unidad}
                          onChange={e => updateFila(fila.id, 'unidad', e.target.value)}
                          aria-label="Unidad de medida"
                        >
                          {UNIDADES.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      {fieldError(fila.id, 'cantidad') && (
                        <span style={{ color: 'var(--error)', fontSize: 11, fontWeight: 600 }}>
                          {fieldError(fila.id, 'cantidad')}
                        </span>
                      )}
                    </td>

                    {/* Precio */}
                    <td>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 13, fontWeight: 700, color: 'var(--gray-500)',
                        }}>$</span>
                        <input
                          id={`precio-${fila.id}`}
                          className={`input ${fieldError(fila.id, 'precio') ? 'error' : ''}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={fila.precio}
                          onChange={e => updateFila(fila.id, 'precio', e.target.value)}
                          style={{ paddingLeft: 26 }}
                        />
                      </div>
                      {fieldError(fila.id, 'precio') && (
                        <span style={{ color: 'var(--error)', fontSize: 11, fontWeight: 600 }}>
                          {fieldError(fila.id, 'precio')}
                        </span>
                      )}
                    </td>

                    {/* Fecha — autocompleta con hoy */}
                    <td>
                      <input
                        id={`fecha-${fila.id}`}
                        className="input"
                        type="date"
                        value={fila.fecha}
                        onChange={e => updateFila(fila.id, 'fecha', e.target.value)}
                        aria-label="Fecha de compra (autocompleta con hoy)"
                      />
                    </td>

                    {/* Eliminar fila */}
                    <td>
                      <button
                        className="remove-row-btn"
                        onClick={() => removeFila(fila.id)}
                        disabled={filas.length === 1}
                        title="Eliminar fila"
                        aria-label="Eliminar esta fila"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Agregar fila */}
          <div style={{ padding: '12px 16px 16px' }}>
            <button
              className="add-row-btn"
              onClick={addFila}
              id="add-row-btn"
            >
              <Plus size={16} />
              Agregar otra fila
            </button>
          </div>
        </div>

        {/* Footer de acciones */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          paddingBottom: 8,
        }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/compras')}
            id="cancel-compra-btn"
          >
            Cancelar
          </button>
          <button
            className="btn btn-brown"
            onClick={handleGuardar}
            disabled={saving}
            id="guardar-compra-btn"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar compra'}
          </button>
        </div>
      </main>
    </>
  )
}
