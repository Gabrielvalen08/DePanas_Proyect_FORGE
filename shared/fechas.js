/**
 * shared/fechas.js
 * Una compra solo se registra si ya ocurrió: su fecha es hoy o antes. «Hoy» es el día
 * de la computadora del negocio, en su hora local (nunca UTC: en El Salvador, después
 * de las 6 p. m. el UTC ya va en el día siguiente). Lo usan igual el backend y el frontend.
 */

export const FECHA_FUTURA = 'La fecha no puede ser posterior a hoy'

/** Fecha local de hoy como AAAA-MM-DD */
export function hoyISO(fecha = new Date()) {
  const a = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}

/** true si la fecha AAAA-MM-DD es posterior a hoy */
export function esFechaFutura(fecha, hoy = hoyISO()) {
  return typeof fecha === 'string' && fecha > hoy
}
