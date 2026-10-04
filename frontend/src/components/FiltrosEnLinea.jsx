import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { Boton, Campo } from './common'
import { springSuave } from '../styles/movimiento'
import estilos from './FiltrosEnLinea.module.css'

export const FILTROS_VACIOS = { proveedor: '', producto: '', fechaDesde: '', fechaHasta: '' }

export function contarFiltrosActivos(filtros) {
  return Object.values(filtros).filter(v => v !== '').length
}

/**
 * FiltrosEnLinea
 * Panel que se despliega junto al botón "Filtrar" (sin ventana encima).
 * Filtra en vivo: cada cambio llama a alCambiar con los filtros nuevos.
 * Props: id (lo usa aria-controls del botón), abierto, filtros, alCambiar
 */
export default function FiltrosEnLinea({ id, abierto, filtros, alCambiar }) {
  const errorFechas =
    filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta
      ? 'La fecha final debe ser igual o posterior a la inicial'
      : undefined

  function cambiar(campo, valor) {
    alCambiar({ ...filtros, [campo]: valor })
  }

  return (
    <AnimatePresence initial={false}>
      {abierto && (
        <motion.div
          key="filtros"
          id={id}
          role="group"
          aria-label="Filtros de compras"
          className={estilos.panel}
          initial={{ opacity: 0, x: -8, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.98 }}
          transition={springSuave}
        >
          <Campo
            id="filtro-proveedor"
            etiqueta="Proveedor"
            placeholder="Ej: Súper Selectos"
            value={filtros.proveedor}
            onChange={e => cambiar('proveedor', e.target.value)}
            className={estilos.campoTexto}
          />
          <Campo
            id="filtro-producto"
            etiqueta="Producto"
            placeholder="Ej: Pollo"
            value={filtros.producto}
            onChange={e => cambiar('producto', e.target.value)}
            className={estilos.campoTexto}
          />
          <Campo
            id="filtro-fecha-desde"
            etiqueta="Desde"
            tipo="date"
            value={filtros.fechaDesde}
            onChange={e => cambiar('fechaDesde', e.target.value)}
            className={estilos.campoFecha}
          />
          <Campo
            id="filtro-fecha-hasta"
            etiqueta="Hasta"
            tipo="date"
            value={filtros.fechaHasta}
            onChange={e => cambiar('fechaHasta', e.target.value)}
            error={errorFechas}
            className={estilos.campoFecha}
          />
          <Boton
            variante="fantasma"
            icono={<X />}
            onClick={() => alCambiar(FILTROS_VACIOS)}
            disabled={contarFiltrosActivos(filtros) === 0}
            className={estilos.limpiar}
          >
            Limpiar
          </Boton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
