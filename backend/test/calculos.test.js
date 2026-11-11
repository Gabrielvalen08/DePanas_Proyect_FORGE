/**
 * Pruebas de los cálculos (node --test): IVA y centavos, subtotal y total de una compra,
 * reporte de gastos (shared/gastos.js) y filtros de la Lista de compras por la API.
 *
 * Cumplen el papel de las pruebas JUnit que pide el plan: el proyecto es JavaScript, así que
 * se usa el runner nativo de Node (node:test + node:assert), que es su equivalente.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { cabeceras, entrar } from './ayudantes.js'
import { crearApp } from '../app.js'
import { TASA_IVA, aCentavos, calcularIva, ivaDe, ivaValido } from '../../shared/iva.js'
import { SIN_CATEGORIA, resumenGastos, subtotalCompra, totalCompra } from '../../shared/gastos.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

// ---------------------------------------------------------------------------
// IVA y centavos
// ---------------------------------------------------------------------------

test('IVA: 13 % encima del subtotal, redondeado a centavos', () => {
  assert.equal(TASA_IVA, 0.13)
  assert.equal(calcularIva(100), 13)
  assert.equal(calcularIva(9.99), 1.3) // 1.2987 → 1.30
  assert.equal(calcularIva(0.04), 0.01) // 0.0052 → 0.01
  assert.equal(calcularIva(0), 0)
  assert.equal(calcularIva('50'), 6.5)
})

test('centavos: corrige los errores de coma flotante y redondea la mitad hacia arriba', () => {
  assert.equal(0.1 + 0.2 === 0.3, false) // por eso existe aCentavos
  assert.equal(aCentavos(0.1 + 0.2), 0.3)
  assert.equal(aCentavos(1.005), 1.01)
  assert.equal(aCentavos(2.675), 2.68)
  assert.equal(aCentavos(-1.234), -1.23)
})

test('IVA de una compra: lo que falte o no sirva cuenta como 0; solo un número ≥ 0 es válido', () => {
  assert.equal(ivaDe({ iva: 13 }), 13)
  assert.equal(ivaDe({ iva: '6.5' }), 6.5)
  for (const malo of [{}, { iva: null }, { iva: -2 }, { iva: 'abc' }, undefined]) assert.equal(ivaDe(malo), 0)
  assert.equal(ivaValido(0), true)
  assert.equal(ivaValido(13.5), true)
  assert.equal(ivaValido(-1), false)
  assert.equal(ivaValido('13'), false)
  assert.equal(ivaValido(Infinity), false)
})

// ---------------------------------------------------------------------------
// Totales de una compra
// ---------------------------------------------------------------------------

const compra = (proveedor, fecha, materiales, iva = 0) => ({ proveedor, fecha, iva, materiales })
const art = (material, monto, categoria = 'Materia Prima') => ({ material, cantidad: 1, unidad: 'lb', monto, categoria, producto: '' })

test('subtotal y total: el monto es el total de cada línea; total = subtotal + IVA', () => {
  const c = compra('Selectos', '2026-08-18', [art('Huevos', 5.04), art('Cebolla', 2.72), art('Cilantro', 1.6)], 1.22)
  assert.equal(subtotalCompra(c), 9.36)
  assert.equal(totalCompra(c), 10.58)
  assert.equal(subtotalCompra({ materiales: [] }), 0)
  assert.equal(totalCompra({}), 0)
  // Montos que en coma flotante no suman exacto
  assert.equal(subtotalCompra(compra('X', '2026-01-01', [art('a', 0.1), art('b', 0.2)])), 0.3)
})

// ---------------------------------------------------------------------------
// Reporte de gastos
// ---------------------------------------------------------------------------

const COMPRAS = [
  compra('Selectos', '2026-08-04', [art('Tocino La Rioja', 2.69), art('Jamon Picnic', 4.53), art('Anis', 1.77)]),
  compra('MMAG', '2026-08-17', [art('Gabacha #3 Blanca', 5.22, 'Desechables'), art('Bolsa al Vacio 8*12', 17, 'Desechables')]),
  compra('Pepsi', '2026-08-18', [art('Gatorade', 9.78, 'Bebidas'), art('Agua', 7.08, 'Bebidas')], 2.19),
  compra('selectos', '2026-09-02', [art('Azucar', 2.27), art('Mr Músculo', 2, '')], 0.56),
]

test('reporte: totales del rango, con IVA aparte, y las fechas que abarca', () => {
  const r = resumenGastos(COMPRAS)
  assert.equal(r.compras, 4)
  assert.equal(r.articulos, 9)
  assert.equal(r.subtotal, 52.34)
  assert.equal(r.iva, 2.75)
  assert.equal(r.total, 55.09)
  assert.equal(r.desde, '2026-08-04')
  assert.equal(r.hasta, '2026-09-02')
})

test('reporte: por proveedor, sin distinguir mayúsculas y de mayor a menor gasto', () => {
  const { porProveedor } = resumenGastos(COMPRAS)
  assert.deepEqual(porProveedor, [
    { nombre: 'MMAG', compras: 1, subtotal: 22.22, iva: 0, total: 22.22 },
    { nombre: 'Pepsi', compras: 1, subtotal: 16.86, iva: 2.19, total: 19.05 },
    { nombre: 'Selectos', compras: 2, subtotal: 13.26, iva: 0.56, total: 13.82 },
  ])
})

test('reporte: por categoría (sin IVA, que es de la compra); lo que no tiene categoría va aparte', () => {
  const { porCategoria } = resumenGastos(COMPRAS)
  assert.deepEqual(porCategoria, [
    { nombre: 'Desechables', articulos: 2, subtotal: 22.22 },
    { nombre: 'Bebidas', articulos: 2, subtotal: 16.86 },
    { nombre: 'Materia Prima', articulos: 4, subtotal: 11.26 },
    { nombre: SIN_CATEGORIA, articulos: 1, subtotal: 2 },
  ])
  // La suma por categoría da el subtotal del rango
  assert.equal(aCentavos(porCategoria.reduce((s, c) => s + c.subtotal, 0)), resumenGastos(COMPRAS).subtotal)
})

test('reporte: por mes, del más viejo al más reciente', () => {
  const { porMes } = resumenGastos(COMPRAS)
  assert.deepEqual(porMes, [
    { mes: '2026-08', compras: 3, subtotal: 48.07, iva: 2.19, total: 50.26 },
    { mes: '2026-09', compras: 1, subtotal: 4.27, iva: 0.56, total: 4.83 },
  ])
})

test('reporte: sin compras todo vale 0 y las listas van vacías', () => {
  assert.deepEqual(resumenGastos([]), {
    compras: 0, articulos: 0, subtotal: 0, iva: 0, total: 0, desde: null, hasta: null, porProveedor: [], porCategoria: [], porMes: [],
  })
})

// ---------------------------------------------------------------------------
// Filtros de la Lista de compras (por la API)
// ---------------------------------------------------------------------------

async function levantar(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-calculos-'))
  const { app, cerrar } = crearApp({ dbPath: join(carpeta, 'depanas.db'), schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  const base = `http://localhost:${servidor.address().port}/api`
  await entrar(base)
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  for (const c of COMPRAS) {
    await fetch(`${base}/compras`, { method: 'POST', headers: cabeceras(`${base}/compras`, { 'Content-Type': 'application/json' }), body: JSON.stringify(c) })
  }
  return base
}

const listar = async (base, filtros) => {
  const res = await fetch(`${base}/compras?${new URLSearchParams(filtros)}`, { headers: cabeceras(`${base}/compras`) })
  return res.json()
}
const proveedores = lista => lista.map(c => `${c.proveedor} ${c.fecha}`)

test('filtros: por proveedor (parte del nombre, sin distinguir mayúsculas)', async t => {
  const base = await levantar(t)
  assert.deepEqual(proveedores(await listar(base, { proveedor: 'SELEC' })), ['selectos 2026-09-02', 'Selectos 2026-08-04'])
  assert.deepEqual(proveedores(await listar(base, { proveedor: 'nadie' })), [])
})

test('filtros: por artículo devuelve la compra completa que lo contiene', async t => {
  const base = await levantar(t)
  const [pepsi] = await listar(base, { material: 'gatorade' })
  assert.equal(pepsi.proveedor, 'Pepsi')
  assert.equal(pepsi.materiales.length, 2) // también trae el Agua
})

test('filtros: rango de fechas inclusivo y combinado con proveedor; el total sale de las compras filtradas', async t => {
  const base = await levantar(t)
  const agosto = await listar(base, { fechaDesde: '2026-08-04', fechaHasta: '2026-08-18' })
  assert.deepEqual(proveedores(agosto), ['Pepsi 2026-08-18', 'MMAG 2026-08-17', 'Selectos 2026-08-04'])
  assert.equal(resumenGastos(agosto).total, 50.26) // 8.99 + 22.22 + 16.86 + 2.19 de IVA
  assert.deepEqual(proveedores(await listar(base, { fechaDesde: '2026-08-18' })), ['selectos 2026-09-02', 'Pepsi 2026-08-18'])
  assert.deepEqual(proveedores(await listar(base, { proveedor: 'selectos', fechaHasta: '2026-08-31' })), ['Selectos 2026-08-04'])
})
