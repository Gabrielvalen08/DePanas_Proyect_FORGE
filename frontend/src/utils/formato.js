const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const formatoPrecio = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' })

/** 12.5 → "$12.50" */
export function formatearPrecio(valor) {
  return formatoPrecio.format(valor)
}

/** "2026-09-28" → "28/09/2026" */
export function formatearFecha(isoFecha) {
  if (!isoFecha) return '—'
  const [a, m, d] = isoFecha.split('-')
  return `${d}/${m}/${a}`
}

/** Date → "sábado, 3 de octubre de 2026" */
export function formatearFechaLarga(fecha) {
  return fecha.toLocaleDateString('es-SV', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** "2026-09-28" → "28 de septiembre de 2026" */
export function formatearFechaTexto(isoFecha) {
  if (!isoFecha) return ''
  const [a, m, d] = isoFecha.split('-')
  return `${parseInt(d, 10)} de ${MESES[parseInt(m, 10) - 1]} de ${a}`
}

/**
 * Fecha LOCAL en "YYYY-MM-DD". No usar toISOString(): convierte a UTC y
 * después de las 18:00 en El Salvador devolvería el día siguiente.
 */
export function fechaHoyISO(fecha = new Date()) {
  const a = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${a}-${m}-${d}`
}
