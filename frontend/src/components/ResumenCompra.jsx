import { TASA_IVA } from '../../../shared/iva.js'
import { formatearPrecio } from '../utils/formato'
import { IVA } from '../utils/mensajes'
import estilos from './ResumenCompra.module.css'

/**
 * ResumenCompra
 * Cierre de una compra: subtotal (sin IVA), la casilla del IVA con su costo y el total.
 * Props: subtotal, conIva, iva (en dinero), total, onCambiarIva(marcada)
 */
export default function ResumenCompra({ subtotal, conIva, iva, total, onCambiarIva }) {
  return (
    <dl className={estilos.resumen}>
      <div className={estilos.fila}>
        <dt>{IVA.subtotal}</dt>
        <dd>{formatearPrecio(subtotal)}</dd>
      </div>
      <div className={estilos.fila}>
        <dt>
          <label className={estilos.casilla}>
            <input type="checkbox" checked={conIva} onChange={e => onCambiarIva(e.target.checked)} />
            {IVA.etiqueta(TASA_IVA)}
          </label>
        </dt>
        <dd>{formatearPrecio(iva)}</dd>
      </div>
      <div className={`${estilos.fila} ${estilos.filaTotal}`}>
        <dt>{IVA.total}</dt>
        <dd aria-live="polite">{formatearPrecio(total)}</dd>
      </div>
    </dl>
  )
}
