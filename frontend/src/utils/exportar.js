import { fechaHoyISO } from './formato'
import { respaldoCatalogo } from '../../../shared/catalogo-json.js'
import { resumenGastos } from '../../../shared/gastos.js'
import { EXPORTAR } from './mensajes'

/**
 * exportar.js — Archivos de la pantalla Exportar datos (funciones puras).
 *  - Excel (.xlsx): hoja «Compras» con una fila por artículo (las mismas columnas que el Excel
 *    del negocio) y hoja «Resumen» con el reporte de gastos del rango (shared/gastos.js):
 *    totales, gasto por proveedor, por categoría y por mes.
 *    Es un .xlsx real y no un CSV: un CSV depende del separador de la configuración regional
 *    (coma o punto y coma) y en muchas computadoras Excel lo abría todo en una sola columna.
 *  - JSON: las compras completas, en el formato que acepta "Cargar datos" / importar-json.
 * Y los de cada sección del Catálogo (Exportar de su menú ⋮): Excel y respaldo .json.
 */

const COLUMNAS = ['Fecha', 'Proveedor', 'Artículo', 'Cantidad', 'Unidad', 'Monto', 'IVA', 'Categoría', 'Producto']
const ANCHOS = [12, 22, 28, 10, 10, 12, 10, 18, 24]

const porFecha = compras => [...compras].sort((a, b) => a.fecha.localeCompare(b.fecha))

const texto = valor => ({ value: String(valor ?? ''), type: String })
const numero = (valor, format) => ({ value: Number(valor) || 0, type: Number, ...(format ? { format } : {}) })

const negrita = valor => ({ value: String(valor), type: String, fontWeight: 'bold' })
const dinero = valor => numero(valor, '#,##0.00')

/** Hoja con encabezado en negrita y fijo arriba, y el ancho de cada columna */
const hojaConEncabezado = (hoja, encabezados, filas, anchos) => ({
  sheet: hoja,
  data: [encabezados.map(negrita), ...filas],
  columns: anchos.map(width => ({ width })),
  stickyRowsCount: 1,
})

/** Libro de Excel con una o varias hojas. Devuelve una promesa del Blob */
async function libroExcel(hojas) {
  // Se carga al exportar, no con la app: así no pesa en la primera carga
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  return writeExcelFile(hojas).toBlob()
}

/**
 * Hoja «Resumen»: el reporte de gastos de las compras exportadas. Bloques uno debajo del otro,
 * cada uno con su título en negrita; los montos son números con dos decimales.
 */
function hojaResumen(compras) {
  const r = resumenGastos(compras)
  const R = EXPORTAR.hojaResumen
  const vacia = []
  const filas = [
    [negrita(R.titulo)],
    [texto(R.desde), texto(r.desde ?? '')],
    [texto(R.hasta), texto(r.hasta ?? '')],
    [texto(R.compras), numero(r.compras)],
    [texto(R.articulos), numero(r.articulos)],
    [texto(R.subtotal), dinero(r.subtotal)],
    [texto(R.iva), dinero(r.iva)],
    [negrita(R.total), { ...dinero(r.total), fontWeight: 'bold' }],
    vacia,
    [negrita(R.porProveedor), negrita(R.compras), negrita(R.subtotal), negrita(R.iva), negrita(R.total)],
    ...r.porProveedor.map(p => [texto(p.nombre), numero(p.compras), dinero(p.subtotal), dinero(p.iva), dinero(p.total)]),
    vacia,
    [negrita(R.porCategoria), negrita(R.articulos), negrita(R.subtotal)],
    ...r.porCategoria.map(c => [texto(c.nombre), numero(c.articulos), dinero(c.subtotal)]),
    vacia,
    [negrita(R.porMes), negrita(R.compras), negrita(R.subtotal), negrita(R.iva), negrita(R.total)],
    ...r.porMes.map(m => [texto(m.mes), numero(m.compras), dinero(m.subtotal), dinero(m.iva), dinero(m.total)]),
  ]
  return { sheet: R.hoja, data: filas, columns: [24, 12, 14, 12, 14].map(width => ({ width })) }
}

/** Excel con una fila por artículo, ordenado por fecha, como el Excel del negocio. Promesa del Blob */
export function comprasAXlsx(compras) {
  const filas = []
  for (const c of porFecha(compras)) {
    c.materiales.forEach((m, i) => {
      filas.push([
        // La fecha va como texto ISO: un valor de fecha de Excel podría correrse un día por la zona horaria
        texto(c.fecha), texto(c.proveedor), texto(m.material), numero(m.cantidad), texto(m.unidad),
        numero(m.monto, '#,##0.00'),
        // El IVA es de la compra: solo en su primera fila, para que sumar la columna dé el IVA real
        i === 0 ? numero(c.iva, '#,##0.00') : null,
        texto(m.categoria), texto(m.producto),
      ])
    })
  }
  return libroExcel([hojaConEncabezado('Compras', COLUMNAS, filas, ANCHOS), hojaResumen(compras)])
}

/** Compras completas sin los campos de compatibilidad internos (precio, productos) */
export function comprasAJson(compras) {
  const limpias = porFecha(compras).map(c => ({
    id: c.id,
    ...(c.origen_id ? { origen_id: c.origen_id } : {}),
    proveedor: c.proveedor,
    fecha: c.fecha,
    categoria: c.categoria ?? '',
    iva: c.iva ?? 0,
    materiales: c.materiales.map(({ material, cantidad, unidad, monto, categoria, producto }) => ({
      material, cantidad, unidad, monto, categoria: categoria ?? '', producto: producto ?? '',
    })),
  }))
  return JSON.stringify(limpias, null, 2)
}

/** depanas_compras_2026-10-01_2026-10-31.xlsx */
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
  categoria: ['Categoría', 'Proveedores', 'Artículos'],
  producto: ['Producto', 'Artículos'],
}
const ANCHOS_CATALOGO = {
  proveedor: [24, 30, 24, 36],
  material: [28, 18, 30],
  categoria: [20, 30, 60],
  producto: [22, 60],
}
const HOJA_CATALOGO = { proveedor: 'Proveedores', categoria: 'Categorías', material: 'Artículos', producto: 'Productos' }

/** «Ana (7000-1111); Luis» */
const textoContactos = contactos => contactos.map(c => (c.telefono ? `${c.nombre} (${c.telefono})` : c.nombre)).join('; ')

/** Filas de una sección (shared/catalogo-json.js, filasDelCatalogo) → Excel, en el orden recibido. Promesa del Blob */
export function catalogoAXlsx(tipo, filas) {
  const cuerpo = filas.map(f => {
    if (tipo === 'proveedor') return [f.nombre, f.ubicacion, f.telefonos.join('; '), textoContactos(f.contactos)]
    if (tipo === 'material') return [f.nombre, f.categoria, f.productos.join(', ')]
    if (tipo === 'categoria') return [f.nombre, (f.proveedores ?? []).join('; '), f.articulos.join('; ')]
    return [f.nombre, f.articulos.join('; ')]
  }).map(fila => fila.map(texto))
  return libroExcel([hojaConEncabezado(HOJA_CATALOGO[tipo], COLUMNAS_CATALOGO[tipo], cuerpo, ANCHOS_CATALOGO[tipo])])
}

/** Respaldo .json de una sección, en el formato que acepta Cargar de esa misma sección */
export const catalogoAJson = (tipo, filas) => JSON.stringify(respaldoCatalogo(tipo, filas), null, 2)

const NOMBRE_SECCION = { proveedor: 'proveedores', categoria: 'categorias', material: 'articulos', producto: 'productos' }

/** depanas_proveedores_2026-10-22.xlsx */
export const nombreArchivoCatalogo = (tipo, extension) => `depanas_${NOMBRE_SECCION[tipo]}_${fechaHoyISO()}.${extension}`
