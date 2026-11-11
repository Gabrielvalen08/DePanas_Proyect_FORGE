/**
 * gastos.js — Totales y reporte de gastos de un conjunto de compras. Funciones puras: las usa
 * la hoja «Resumen» del Excel que se descarga en Exportar datos (frontend/src/utils/exportar.js)
 * y se prueban en backend/test/calculos.test.js.
 *
 * Reglas: el `monto` de cada artículo es el total de su línea, sin IVA; el subtotal de una
 * compra es la suma de sus montos; el IVA se guarda en dinero en la compra (shared/iva.js) y
 * el total es subtotal + IVA. Todo se redondea a centavos al final de cada suma.
 */

import { aCentavos, ivaDe } from './iva.js'

export const SIN_CATEGORIA = 'Sin categoría'

const montoDe = m => Number(m?.monto) || 0

/** Suma de los montos de los artículos, sin IVA */
export const subtotalCompra = compra => aCentavos((compra?.materiales ?? []).reduce((suma, m) => suma + montoDe(m), 0))

/** Subtotal + IVA */
export const totalCompra = compra => aCentavos(subtotalCompra(compra) + ivaDe(compra))

/** «2026-08» de una fecha ISO */
const mesDe = fecha => String(fecha).slice(0, 7)

/** Agrupa y ordena: de mayor a menor `orden` (o como diga `comparar`) */
function agrupar(mapa, comparar) {
  return [...mapa.values()]
    .map(g => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, typeof v === 'number' && k !== 'compras' && k !== 'articulos' ? aCentavos(v) : v])))
    .sort(comparar)
}

/**
 * Reporte de gastos de las compras:
 *  { compras, articulos, subtotal, iva, total, desde, hasta,
 *    porProveedor: [{ nombre, compras, subtotal, iva, total }]  de mayor a menor total,
 *    porCategoria: [{ nombre, articulos, subtotal }]             de mayor a menor subtotal (sin IVA: el IVA es de la compra),
 *    porMes:       [{ mes, compras, subtotal, iva, total }]      del más viejo al más reciente }
 * Los proveedores y categorías se agrupan sin distinguir mayúsculas; se muestra el primer nombre visto.
 */
export function resumenGastos(compras = []) {
  const proveedores = new Map()
  const categorias = new Map()
  const meses = new Map()
  let subtotal = 0
  let iva = 0
  let articulos = 0
  let desde = null
  let hasta = null

  for (const c of compras) {
    const sub = subtotalCompra(c)
    const impuesto = ivaDe(c)
    subtotal += sub
    iva += impuesto
    articulos += c.materiales?.length ?? 0
    if (!desde || c.fecha < desde) desde = c.fecha
    if (!hasta || c.fecha > hasta) hasta = c.fecha

    const clave = String(c.proveedor ?? '').trim().toLowerCase()
    const prov = proveedores.get(clave) ?? { nombre: String(c.proveedor ?? '').trim(), compras: 0, subtotal: 0, iva: 0, total: 0 }
    prov.compras++
    prov.subtotal += sub
    prov.iva += impuesto
    prov.total += sub + impuesto
    proveedores.set(clave, prov)

    const mes = mesDe(c.fecha)
    const enMes = meses.get(mes) ?? { mes, compras: 0, subtotal: 0, iva: 0, total: 0 }
    enMes.compras++
    enMes.subtotal += sub
    enMes.iva += impuesto
    enMes.total += sub + impuesto
    meses.set(mes, enMes)

    for (const m of c.materiales ?? []) {
      const nombre = String(m.categoria ?? '').trim() || SIN_CATEGORIA
      const cat = categorias.get(nombre.toLowerCase()) ?? { nombre, articulos: 0, subtotal: 0 }
      cat.articulos++
      cat.subtotal += montoDe(m)
      categorias.set(nombre.toLowerCase(), cat)
    }
  }

  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  return {
    compras: compras.length,
    articulos,
    subtotal: aCentavos(subtotal),
    iva: aCentavos(iva),
    total: aCentavos(subtotal + iva),
    desde,
    hasta,
    porProveedor: agrupar(proveedores, (a, b) => b.total - a.total || porNombre(a, b)),
    porCategoria: agrupar(categorias, (a, b) => b.subtotal - a.subtotal || porNombre(a, b)),
    porMes: agrupar(meses, (a, b) => a.mes.localeCompare(b.mes)),
  }
}
