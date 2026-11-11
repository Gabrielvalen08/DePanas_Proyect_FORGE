/**
 * archivo.js — Archivo de compras. Lo usan igual el backend (routes/listas.js) y el
 * modo local de frontend/src/services/api.js.
 *
 * Para que la Lista de compras siempre cargue rápido, las compras viejas pasan al Archivo:
 *  - Solas, al cumplir MESES_ARCHIVO meses desde su fecha.
 *  - A mano, eligiéndolas en la lista (función compras.archivar).
 * Desde el Archivo se pueden devolver a la lista; una compra devuelta se queda en la lista
 * aunque tenga más de tres meses, hasta que alguien la vuelva a archivar.
 *
 * Cada compra guarda su `archivo`:
 *  - null: automático (decide la fecha)
 *  - 'archivada': archivada a mano
 *  - 'activa': devuelta a la lista a mano
 */

export const MESES_ARCHIVO = 3
export const ARCHIVADA = 'archivada'
export const ACTIVA = 'activa'
export const ESTADOS_ARCHIVO = [ARCHIVADA, ACTIVA]

/** Qué compras pide una lista: las de la Lista de compras, las del Archivo o todas */
export const VISTAS_ARCHIVO = ['activas', 'archivadas']

/** Hoy en la hora local (AAAA-MM-DD). No usa toISOString(), que da la fecha en UTC */
export function hoyLocalISO(fecha = new Date()) {
  const dd = n => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${dd(fecha.getMonth() + 1)}-${dd(fecha.getDate())}`
}

/**
 * Fecha límite (ISO) a partir de `hoy` (ISO, AAAA-MM-DD): una compra de antes de esta fecha
 * ya cumplió los meses. Mismo día del mes, MESES_ARCHIVO meses atrás; si ese mes no tiene el
 * día (p. ej. 31 de mayo → 31 de febrero), el último día de ese mes.
 */
export function fechaLimiteArchivo(hoy, meses = MESES_ARCHIVO) {
  const [anio, mes, dia] = hoy.split('-').map(Number)
  const indice = anio * 12 + (mes - 1) - meses
  const anioLimite = Math.floor(indice / 12)
  const mesLimite = (indice % 12) + 1
  const ultimoDia = new Date(Date.UTC(anioLimite, mesLimite, 0)).getUTCDate()
  const dd = String(Math.min(dia, ultimoDia)).padStart(2, '0')
  return `${anioLimite}-${String(mesLimite).padStart(2, '0')}-${dd}`
}

/** true si la compra ({ fecha, archivo }) está en el Archivo hoy */
export function estaArchivada({ fecha, archivo }, hoy) {
  if (archivo === ARCHIVADA) return true
  if (archivo === ACTIVA) return false
  return fecha < fechaLimiteArchivo(hoy)
}

/** Ids válidos para archivar o eliminar varias compras: lista no vacía de textos o números */
export function validarIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 'Elige al menos una compra'
  if (ids.length > 5000) return 'Son demasiadas compras a la vez'
  if (!ids.every(id => (typeof id === 'string' && id.length > 0 && id.length <= 100) || Number.isInteger(id))) {
    return 'Alguna compra elegida no es válida'
  }
  return null
}
