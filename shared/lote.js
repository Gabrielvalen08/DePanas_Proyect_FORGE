/**
 * lote.js — Acciones sobre varias compras a la vez (casillas de la Lista de compras).
 * Lo usan igual el backend (dao/compras.js) y el modo local de frontend/src/services/api.js.
 */

/** Ids válidos para eliminar varias compras: lista no vacía de textos o números */
export function validarIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 'Elige al menos una compra'
  if (ids.length > 5000) return 'Son demasiadas compras a la vez'
  if (!ids.every(id => (typeof id === 'string' && id.length > 0 && id.length <= 100) || Number.isInteger(id))) {
    return 'Alguna compra elegida no es válida'
  }
  return null
}
