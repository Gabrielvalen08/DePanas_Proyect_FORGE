import { fechaHoyISO } from './formato'

/**
 * exportar.js — Archivos de la pantalla Exportar datos (funciones puras).
 *  - CSV: una fila por material, las mismas columnas que el Excel del negocio.
 *  - JSON: las compras completas, en el formato que acepta "Cargar datos" / importar-json.
 */

const COLUMNAS = ['Fecha', 'Proveedor', 'Material', 'Cantidad', 'Unidad', 'Monto', 'Categoría', 'Producto']

/** Celda CSV: entre comillas si trae separadores, comillas o saltos de línea */
function celda(valor) {
  const texto = String(valor ?? '')
  return /[",;\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

const porFecha = compras => [...compras].sort((a, b) => a.fecha.localeCompare(b.fecha))

/** CSV con BOM (para que Excel lea bien las tildes) y saltos de línea \r\n */
export function comprasACsv(compras) {
  const filas = [COLUMNAS]
  for (const c of porFecha(compras)) {
    for (const m of c.materiales) {
      filas.push([c.fecha, c.proveedor, m.material, m.cantidad, m.unidad, Number(m.monto).toFixed(2), m.categoria ?? '', m.producto ?? ''])
    }
  }
  return '﻿' + filas.map(f => f.map(celda).join(',')).join('\r\n') + '\r\n'
}

/** Compras completas sin los campos de compatibilidad internos (precio, productos) */
export function comprasAJson(compras) {
  const limpias = porFecha(compras).map(c => ({
    id: c.id,
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
