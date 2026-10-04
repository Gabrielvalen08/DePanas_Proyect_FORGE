import { useEffect, useState } from 'react'
import { Loader2, Plus, ShoppingCart, SlidersHorizontal, Trash2 } from 'lucide-react'
import Header from '../components/Header'
import FilterModal from '../components/FilterModal'
import ConfirmModal from '../components/ConfirmModal'
import { Boton, EstadoVacio, Insignia, Tarjeta } from '../components/common'
import { fetchCompras, eliminarCompra } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import estilos from './PantallaMaestra.module.css'

const EMPTY_FILTERS = {
  proveedor: '',
  producto: '',
  fechaDesde: '',
  fechaHasta: '',
}

function contarFiltrosActivos(filters) {
  return Object.values(filters).filter(v => v !== '').length
}

export default function PantallaMaestra() {
  const { addToast } = useToast()

  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [version, setVersion] = useState(0) // sube para recargar tras eliminar
  const [filterOpen, setFilterOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    let vigente = true
    fetchCompras(filters)
      .then(data => { if (vigente) setCompras(data) })
      .catch(() => { if (vigente) addToast('Error al cargar las compras', 'error') })
      .finally(() => { if (vigente) setLoading(false) })
    return () => { vigente = false } // descarta respuestas viejas si cambian los filtros
  }, [filters, version, addToast])

  function cambiarFiltros(nuevos) {
    setLoading(true)
    setFilters(nuevos)
  }

  function recargar() {
    setLoading(true)
    setVersion(v => v + 1)
  }

  async function handleDelete(id) {
    try {
      await eliminarCompra(id)
      addToast('Compra eliminada correctamente')
      recargar()
    } catch {
      addToast('Error al eliminar la compra', 'error')
    }
  }

  const filtrosActivos = contarFiltrosActivos(filters)
  const hayFiltros = filtrosActivos > 0
  const compraPorEliminar = compras.find(c => c.id === deleteTarget)

  function contenidoTabla() {
    if (loading) {
      return <EstadoVacio cargando icono={<Loader2 />} titulo="Cargando compras…" />
    }
    if (compras.length === 0 && hayFiltros) {
      return (
        <EstadoVacio
          icono={<SlidersHorizontal />}
          titulo="Sin resultados"
          texto="Prueba con otros filtros"
          accion={<Boton variante="fantasma" onClick={() => cambiarFiltros(EMPTY_FILTERS)}>Limpiar filtros</Boton>}
        />
      )
    }
    if (compras.length === 0) {
      return (
        <EstadoVacio
          icono={<ShoppingCart />}
          titulo="Todavía no hay compras."
          texto="¡Agreguemos la primera!"
          accion={<Boton variante="primario" icono={<Plus />} a="/agregar-compra">Agregar compra</Boton>}
        />
      )
    }
    return (
      <div className={estilos.desplazable}>
        <table className={estilos.tabla}>
          <caption className="solo-lector">Compras registradas</caption>
          <thead>
            <tr>
              <th scope="col">Proveedor</th>
              <th scope="col">Producto</th>
              <th scope="col">Cantidad</th>
              <th scope="col" className={estilos.numerico}>Precio</th>
              <th scope="col">Fecha</th>
              <th scope="col" className={estilos.colAcciones}><span className="solo-lector">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {compras.map(compra => (
              <tr key={compra.id}>
                <td data-etiqueta="Proveedor"><Insignia tono="neutro">{compra.proveedor}</Insignia></td>
                <td data-etiqueta="Producto" className={estilos.producto}>{compra.producto}</td>
                <td data-etiqueta="Cantidad">{compra.cantidad} {compra.unidad}</td>
                <td data-etiqueta="Precio" className={estilos.numerico}>{formatearPrecio(compra.precio)}</td>
                <td data-etiqueta="Fecha" className={estilos.fecha}>{formatearFecha(compra.fecha)}</td>
                <td className={estilos.colAcciones}>
                  <Boton
                    variante="icono"
                    icono={<Trash2 />}
                    aria-label={`Eliminar compra de ${compra.producto}`}
                    className={estilos.eliminar}
                    onClick={() => setDeleteTarget(compra.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <Header title="Compras" badge="Pantalla maestra" />

      <main id="contenido" tabIndex={-1}>
        <div className={estilos.toolbar}>
          <div className={estilos.filtros}>
            <Boton
              id="open-filter-btn"
              variante={hayFiltros ? 'primario' : 'secundario'}
              icono={<SlidersHorizontal />}
              onClick={() => setFilterOpen(true)}
              aria-label={hayFiltros ? `Filtrar, ${filtrosActivos} filtro${filtrosActivos !== 1 ? 's' : ''} activo${filtrosActivos !== 1 ? 's' : ''}` : undefined}
            >
              Filtrar
              {hayFiltros && <Insignia tono="marca" className={estilos.contador}>{filtrosActivos}</Insignia>}
            </Boton>
            {hayFiltros && (
              <Boton id="clear-filters-btn" variante="fantasma" onClick={() => cambiarFiltros(EMPTY_FILTERS)}>
                Limpiar filtros
              </Boton>
            )}
          </div>

          <Boton id="go-agregar-compra-btn" variante="primario" sombra icono={<Plus />} a="/agregar-compra">
            Agregar compra
          </Boton>
        </div>

        <Tarjeta
          titulo="Registro de compras"
          icono={<ShoppingCart />}
          accion={loading ? '…' : `${compras.length} registro${compras.length !== 1 ? 's' : ''}`}
        >
          {contenidoTabla()}
        </Tarjeta>
      </main>

      <FilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={cambiarFiltros}
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        title="Eliminar compra"
        message={`¿Seguro que deseas eliminar ${compraPorEliminar ? `la compra de ${compraPorEliminar.producto}` : 'este registro'}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </>
  )
}
