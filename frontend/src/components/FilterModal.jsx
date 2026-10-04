import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Boton, Campo, CuerpoModal, Modal, PieModal } from './common'
import estilos from './FilterModal.module.css'

const FILTROS_VACIOS = { proveedor: '', producto: '', fechaDesde: '', fechaHasta: '' }

/**
 * FilterModal
 * Props: isOpen, onClose, filters ({ proveedor, producto, fechaDesde, fechaHasta }), onApply(filters)
 */
export default function FilterModal({ isOpen, onClose, filters, onApply }) {
  return (
    <Modal
      abierto={isOpen}
      alCerrar={onClose}
      titulo="Filtrar compras"
      icono={<SlidersHorizontal />}
      anchoMax="md"
    >
      {/* Se monta en cada apertura: el estado local siempre parte de los filtros actuales */}
      <FormularioFiltros filters={filters} onApply={onApply} onClose={onClose} />
    </Modal>
  )
}

function FormularioFiltros({ filters, onApply, onClose }) {
  const [local, setLocal] = useState({ ...filters })

  const errorFechas =
    local.fechaDesde && local.fechaHasta && local.fechaDesde > local.fechaHasta
      ? 'La fecha final debe ser igual o posterior a la inicial'
      : undefined

  function cambiar(campo, valor) {
    setLocal(prev => ({ ...prev, [campo]: valor }))
  }

  function aplicar(e) {
    e.preventDefault()
    if (errorFechas) return
    onApply(local)
    onClose()
  }

  function limpiar() {
    onApply(FILTROS_VACIOS)
    onClose()
  }

  return (
    <form onSubmit={aplicar} noValidate>
      <CuerpoModal>
        <div className={estilos.rejilla}>
          <Campo
            id="filter-proveedor"
            etiqueta="Proveedor"
            placeholder="Ej: Súper Selectos"
            value={local.proveedor}
            onChange={e => cambiar('proveedor', e.target.value)}
          />
          <Campo
            id="filter-producto"
            etiqueta="Producto"
            placeholder="Ej: Pollo"
            value={local.producto}
            onChange={e => cambiar('producto', e.target.value)}
          />
          <Campo
            id="filter-fecha-desde"
            etiqueta="Fecha desde"
            tipo="date"
            value={local.fechaDesde}
            onChange={e => cambiar('fechaDesde', e.target.value)}
          />
          <Campo
            id="filter-fecha-hasta"
            etiqueta="Fecha hasta"
            tipo="date"
            value={local.fechaHasta}
            onChange={e => cambiar('fechaHasta', e.target.value)}
            error={errorFechas}
          />
        </div>
      </CuerpoModal>
      <PieModal>
        <Boton variante="fantasma" onClick={limpiar} id="filter-clear-btn">
          Limpiar
        </Boton>
        <Boton type="submit" variante="primario" disabled={Boolean(errorFechas)} id="filter-apply-btn">
          Aplicar filtros
        </Boton>
      </PieModal>
    </form>
  )
}
