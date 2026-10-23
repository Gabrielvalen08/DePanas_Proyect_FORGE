import { fechaHoyISO } from './formato'
import { respaldoCatalogo } from '../../../shared/catalogo-json.js'

/**
 * exportar.js — Archivos de la pantalla Exportar datos (funciones puras).
 *  - CSV: una fila por material, las mismas columnas que el Excel del negocio.
 *  - JSON: las compras completas, en el formato que acepta "Cargar datos" / importar-json.
 * Y los de cada sección del Catálogo (Exportar de su menú ⋮): CSV para Excel y respaldo .json.
 */

const COLUMNAS = ['Fecha', 'Proveedor', 'Artículo', 'Cantidad', 'Unidad', 'Monto', 'Categoría', 'Producto']

/** Celda CSV: entre comillas si trae separadores, comillas o saltos de línea */
function celda(valor) {
  const texto = String(valor ?? '')
  return /[",;\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

const porFecha = compras => [...compras].sort((a, b) => a.fecha.localeCompare(b.fecha))

/** CSV con BOM (para que Excel lea bien las tildes) y saltos de línea \r\n */
const aCsv = filas => '\uFEFF' + filas.map(f => f.map(celda).join(',')).join('\r\n') + '\r\n'

/** CSV con BOM (para que Excel lea bien las tildes) y saltos de línea \r\n (una fila por artículo, como el Excel del negocio) */
export function comprasACsv(compras) {
  const filas = [COLUMNAS]
  for (const c of porFecha(compras)) {
    for (const m of c.materiales) {
      filas.push([c.fecha, c.proveedor, m.material, m.cantidad, m.unidad, Number(m.monto).toFixed(2), m.categoria ?? '', m.producto ?? ''])
    }
  }
  return aCsv(filas)
}

/** Compras completas sin los campos de compatibilidad internos (precio, productos) */
export function comprasAJson(compras) {
  const limpias = porFecha(compras).map(c => ({
    id: c.id,
    ...(c.origen_id ? { origen_id: c.origen_id } : {}),
    proveedor: c.proveedor,
    fecha: c.fecha,
    categoria: c.categoria ?? '',
    materiales: c.materiales.map(({ material, cantidad, unidad, monto, categoria, producto }) => ({
      material, cantidad, unidad, monto, categoria: categoria ?? '', producto: producto ?? '',
    })),
  }))
  return JSON.stringify(limpias, null, 2)
}

/** depanas_compras_2026-10-01_2026-10-31.csv */
export function nombreArchivo(desde, hasta, extension) {
  return `depanas_compras_${desde || 'inicio'}_${hasta || fechaHoyISO()}.${extension}`
}

/** Rangos rápidos: mes, mesAnterior, ano, todo → { desde, hasta } en ISO local */
export function rangoRapido(clave, hoy = new Date()) {
  const iso = fecha => fechaHoyISO(fecha)
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  if (clave === 'mes') return { desde: iso(new Date(y, m, 1)), hasta: iso(new Date(y, m + 1, 0)) }
  if (clave === 'mesAnterior') return { desde: iso(new Date(y, m - 1, 1)), hasta: iso(new Date(y, m, 0)) }
  if (clave === 'ano') return { desde: iso(new Date(y, 0, 1)), hasta: iso(new Date(y, 11, 31)) }
  return { desde: '', hasta: '' }
}

// ---------------------------------------------------------------------------
// Secciones del Catálogo
// ---------------------------------------------------------------------------
const COLUMNAS_CATALOGO = {
  proveedor: ['Proveedor', 'Ubicación', 'Teléfonos', 'Contactos'],
  material: ['Artículo', 'Categoría', 'Productos'],
  categoria: ['Categoría', 'Artículos'],
  producto: ['Producto', 'Artículos'],
}

/** «Ana (7000-1111); Luis» */
const textoContactos = contactos => contactos.map(c => (c.telefono ? `${c.nombre} (${c.telefono})` : c.nombre)).join('; ')

/** Filas de una sección (shared/catalogo-json.js, filasDelCatalogo) → CSV para Excel */
export function catalogoACsv(tipo, filas) {
  const cuerpo = filas.map(f => {
    if (tipo === 'proveedor') return [f.nombre, f.ubicacion, f.telefonos.join('; '), textoContactos(f.contactos)]
    if (tipo === 'material') return [f.nombre, f.categoria, f.productos.join(', ')]
    return [f.nombre, f.articulos.join('; ')]
  })
  return aCsv([COLUMNAS_CATALOGO[tipo], ...cuerpo])
}

/** Respaldo .json de una sección, en el formato que acepta Cargar de esa misma sección */
export const catalogoAJson = (tipo, filas) => JSON.stringify(respaldoCatalogo(tipo, filas), null, 2)

const NOMBRE_SECCION = { proveedor: 'proveedores', categoria: 'categorias', material: 'articulos', producto: 'productos' }

/** depanas_proveedores_2026-10-22.csv */
export const nombreArchivoCatalogo = (tipo, extension) => `depanas_${NOMBRE_SECCION[tipo]}_${fechaHoyISO()}.${extension}`
