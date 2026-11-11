/**
 * generar-demo.mjs — Genera las compras de demostración (backend/db/compras-demo.json).
 *
 *   npm run demo:generar            (desde backend/)
 *
 * Dos meses de compras inventadas pero realistas, tomando como modelo el Excel del negocio
 * (agosto de 2026): los mismos proveedores, artículos, unidades y rangos de precio, más los
 * insumos de lo que vende De Panas (arepas, empanadas, tequeños, cachitos, golfeados, pan de
 * guayaba). Siempre sale lo mismo: los números al azar usan una semilla fija.
 *
 *   - Selectos (supermercado): lunes, miércoles y viernes; materia prima y, a veces, limpieza.
 *   - Pepsi: cada martes; bebidas, con factura y 13 % de IVA.
 *   - MMAG: un jueves sí y otro no; gabachas y bolsas al vacío.
 *   - Desechables Diver.: un sábado sí y otro no; bandejas y vasitos, con 13 % de IVA.
 *
 * El archivo tiene el formato de un respaldo de compras: se carga desde Cargar datos o con
 * crear-base-demo.mjs.
 */

import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { aCentavos, calcularIva } from '../../shared/iva.js'

export const DESDE = '2026-09-11'
export const HASTA = '2026-11-11'
const SEMILLA = 20260811

/** Números al azar repetibles (mulberry32) */
function crearAzar(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// [artículo, categoría, producto(s), unidad, precio unitario mín, máx, cantidad mín, máx, paso de la cantidad]
const SELECTOS_FIJOS = [
  ['Harina PAN', 'Materia Prima', 'Arepas, Empanadas', 'unidad', 1.49, 1.65, 6, 12, 1],
  ['Queso duro blando', 'Materia Prima', 'Arepas, Empanadas, Tequeños', 'lb', 2.75, 3.1, 3, 6, 0.5],
]
const SELECTOS = [
  ['Tocino La Rioja', 'Materia Prima', 'Cachitos', 'unidad', 2.69, 4.29, 1, 2, 1],
  ['Jamon Picnic', 'Materia Prima', 'Cachitos', 'lb', 4.02, 4.53, 1, 2, 0.5],
  ['Jamón de Pavo', 'Materia Prima', 'Cachitos', 'lb', 4.31, 4.6, 1, 2, 0.5],
  ['Anis', 'Materia Prima', 'Golfeados', 'unidad', 1.77, 1.95, 1, 1, 1],
  ['Manteca', 'Materia Prima', 'Panadería', 'unidad', 0.58, 0.69, 1, 3, 1],
  ['Ajo Chino', 'Materia Prima', 'Arepas/Empanadas', 'unidad', 0.58, 0.87, 1, 3, 1],
  ['Cebolla', 'Materia Prima', 'Arepas/Empanadas', 'lb', 0.68, 0.91, 2, 4, 1],
  ['Azucar', 'Materia Prima', 'Todos', 'unidad', 2.27, 2.45, 1, 2, 1],
  ['Frijol Negro', 'Materia Prima', 'Arepas/Empanadas', 'lb', 1.33, 1.45, 2, 3, 1],
  ['Huevos', 'Materia Prima', 'Panadería', 'caja', 5.04, 5.4, 1, 1, 1],
  ['Cilantro', 'Materia Prima', 'Salsa', 'unidad', 0.4, 0.55, 2, 4, 1],
  ['Perejil', 'Materia Prima', 'Salsa', 'unidad', 0.5, 0.6, 1, 2, 1],
  ['Sazón Completa', 'Materia Prima', 'Arepas/Empanadas', 'unidad', 2.76, 2.9, 1, 2, 1],
  ['Pechugas de Pollo', 'Materia Prima', 'Arepas/Empanadas', 'lb', 2.61, 2.85, 6, 12, 1],
  ['Plátanos', 'Materia Prima', 'Arepas/Empanadas', 'unidad', 0.29, 0.35, 8, 18, 1],
  ['Pierna Mechada La Rioja', 'Materia Prima', 'Arepas, Empanadas', 'unidad', 4.55, 4.9, 1, 2, 1],
  ['Carne molida', 'Materia Prima', 'Empanadas', 'lb', 2.95, 3.25, 3, 6, 1],
  ['Mantequilla', 'Materia Prima', 'Panadería', 'unidad', 2.15, 2.35, 1, 2, 1],
  ['Levadura', 'Materia Prima', 'Panadería', 'unidad', 0.89, 1.05, 1, 3, 1],
  ['Aceite vegetal', 'Materia Prima', 'Tequeños, Empanadas', 'galon', 8.75, 9.4, 1, 1, 1],
  ['Harina de trigo', 'Materia Prima', 'Tequeños, Cachitos, Panadería', 'lb', 0.52, 0.6, 5, 10, 1],
  ['Guayaba', 'Materia Prima', 'Pan Guayaba', 'lb', 1.1, 1.35, 2, 4, 1],
  ['Chile verde', 'Materia Prima', 'Arepas/Empanadas', 'unidad', 0.25, 0.35, 2, 5, 1],
]
const SELECTOS_LIMPIEZA = [
  ['Mr Músculo Antigrasa', 'Limpieza', '', 'unidad', 2, 2.35, 1, 1, 1],
  ['Lejía', 'Limpieza', '', 'galon', 2.4, 2.65, 1, 1, 1],
  ['Jabón de platos', 'Limpieza', '', 'unidad', 1.6, 1.85, 1, 2, 1],
  ['Fosforos', 'Material Común', 'Todos', 'unidad', 0.48, 0.55, 1, 2, 1],
  ['Alambrina ExtraFuerte', 'Material Común', 'Todos', 'unidad', 1.5, 1.65, 1, 2, 1],
]
const PEPSI = [
  ['Gatorade', 'Bebidas', 'Hidratantes', 'caja', 9.78, 9.95, 1, 2, 1],
  ['Agua', 'Bebidas', 'Hidratantes', 'caja', 3.54, 3.6, 1, 3, 1],
  ['Pepsi', 'Bebidas', 'Gaseosas', 'caja', 5.75, 5.9, 1, 2, 1],
  ['Lipton', 'Bebidas', 'Gaseosas', 'caja', 8.94, 9.1, 1, 1, 1],
]
const MMAG = [
  ['Gabacha #3 Blanca', 'Desechables', 'Todos', 'caja', 5.22, 5.35, 1, 2, 1],
  ['Bolsa al Vacio 8*12', 'Desechables', 'Tequeños', 'caja', 17, 17.5, 1, 1, 1],
]
const DESECHABLES = [
  ['Bandeja Bisagrada', 'Desechables', 'Arepas, Empanadas', 'caja', 16.43, 16.9, 1, 1, 1],
  ['Bandeja Kraft', 'Desechables', 'Tequeños', 'caja', 9.52, 9.8, 1, 1, 1],
  ['Tapadera Cristal', 'Desechables', 'Todos', 'caja', 7.39, 7.6, 1, 1, 1],
  ['Portion Cup Cuadrada', 'Desechables', 'Salsa', 'bolsa', 3.6, 3.75, 1, 2, 1],
  ['Tapa Portion Cup Cuadrado', 'Desechables', 'Salsa', 'bolsa', 1.72, 1.8, 1, 2, 1],
]

const DIAS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }

export function generarComprasDemo({ desde = DESDE, hasta = HASTA, semilla = SEMILLA } = {}) {
  const azar = crearAzar(semilla)
  const entre = (min, max) => min + azar() * (max - min)
  const mezclar = lista => lista.map(x => [azar(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1])

  function linea([material, categoria, producto, unidad, pMin, pMax, cMin, cMax, paso]) {
    const pasos = Math.round((cMax - cMin) / paso)
    const cantidad = cMin + Math.round(azar() * pasos) * paso
    const precio = entre(pMin, pMax)
    return { material, cantidad, unidad, monto: aCentavos(cantidad * precio), categoria, producto }
  }

  function compra(fecha, proveedor, lineas, conIva) {
    const materiales = lineas.map(linea)
    const subtotal = materiales.reduce((s, m) => s + m.monto, 0)
    const id = `demo-${fecha}-${proveedor.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`
    return { id, origen_id: id, proveedor, fecha, categoria: '', iva: conIva ? calcularIva(subtotal) : 0, materiales }
  }

  const compras = []
  const inicio = new Date(`${desde}T12:00:00Z`)
  const fin = new Date(`${hasta}T12:00:00Z`)
  for (let d = new Date(inicio), semana = 0; d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    const fecha = d.toISOString().slice(0, 10) // mediodía UTC: el día ISO no se corre
    const dia = d.getUTCDay()
    if (dia === DIAS.lunes) semana++
    if ([DIAS.lunes, DIAS.miercoles, DIAS.viernes].includes(dia)) {
      const variables = mezclar(SELECTOS).slice(0, 3 + Math.floor(azar() * 5))
      const limpieza = azar() < 0.3 ? mezclar(SELECTOS_LIMPIEZA).slice(0, 1 + Math.floor(azar() * 2)) : []
      compras.push(compra(fecha, 'Selectos', [...SELECTOS_FIJOS, ...variables, ...limpieza], false))
    }
    if (dia === DIAS.martes) compras.push(compra(fecha, 'Pepsi', mezclar(PEPSI).slice(0, 2 + Math.floor(azar() * 3)), true))
    if (dia === DIAS.jueves && semana % 2 === 0) compras.push(compra(fecha, 'MMAG', mezclar(MMAG).slice(0, 1 + Math.floor(azar() * 2)), false))
    if (dia === DIAS.sabado && semana % 2 === 1) {
      compras.push(compra(fecha, 'Desechables Diver.', mezclar(DESECHABLES).slice(0, 3 + Math.floor(azar() * 3)), true))
    }
  }
  return compras
}

// Ejecutado directamente: escribe el archivo
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'compras-demo.json')
  const compras = generarComprasDemo()
  writeFileSync(destino, `${JSON.stringify(compras, null, 2)}\n`)
  const total = aCentavos(compras.reduce((s, c) => s + c.iva + c.materiales.reduce((t, m) => t + m.monto, 0), 0))
  console.log(`${compras.length} compras del ${DESDE} al ${HASTA}, $${total} en total → ${destino}`)
}
