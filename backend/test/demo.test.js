/**
 * Pruebas de los datos de demostración (node --test): el archivo está al día con su generador,
 * es un respaldo válido y realista, y solo se carga en una base sin compras.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import './ayudantes.js'
import { abrirDB } from '../db.js'
import { cargarDemo, leerComprasDemo } from '../db/demo.js'
import { comprasDAO } from '../dao/compras.js'
import { DESDE, HASTA, generarComprasDemo } from '../scripts/generar-demo.mjs'
import { validarComprasJSON } from '../../shared/compras-json.js'
import { resumenGastos } from '../../shared/gastos.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

function baseTemporal(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-demo-'))
  const db = abrirDB(join(carpeta, 'depanas.db'), SCHEMA)
  t.after(() => {
    db.close()
    rmSync(carpeta, { recursive: true, force: true })
  })
  return db
}

test('demo: compras-demo.json es lo que da el generador (npm run demo:generar)', () => {
  assert.deepEqual(leerComprasDemo(), generarComprasDemo())
})

test('demo: dos meses de compras válidas, con los proveedores y los rangos del negocio', () => {
  const compras = leerComprasDemo()
  assert.doesNotThrow(() => validarComprasJSON(compras))
  const fechas = compras.map(c => c.fecha).sort()
  assert.ok(fechas[0] >= DESDE && fechas.at(-1) <= HASTA)
  assert.deepEqual([...new Set(compras.map(c => c.proveedor))].sort(), ['Desechables Diver.', 'MMAG', 'Mercado', 'Pepsi', 'Selectos'])
  assert.equal(new Set(compras.map(c => c.id)).size, compras.length, 'sin ids repetidos')
  for (const c of compras) {
    for (const m of c.materiales) {
      assert.ok(m.cantidad > 0 && m.monto > 0 && m.categoria, `${c.id} ${m.material}`)
      assert.ok(m.monto / m.cantidad < 20, `precio unitario realista: ${m.material}`)
    }
  }
  // Pepsi y Desechables Diver. facturan con IVA; Selectos y MMAG no
  assert.ok(compras.filter(c => c.proveedor === 'Pepsi').every(c => c.iva > 0))
  assert.ok(compras.filter(c => c.proveedor === 'Selectos').every(c => c.iva === 0))
  // Más de 50 compras: en la Lista de compras se ven las páginas
  assert.ok(compras.length > 50, `${compras.length} compras`)
  // Un restaurante pequeño: entre 600 y 1 600 dólares al mes
  for (const { mes, total } of resumenGastos(compras).porMes.filter(m => m.mes !== HASTA.slice(0, 7))) {
    assert.ok(total > 600 && total < 1600, `${mes}: ${total}`)
  }
})

test('demo: se carga en una base vacía, sus artículos quedan en el catálogo y no se vuelve a cargar', t => {
  const db = baseTemporal(t)
  const resultado = cargarDemo(db)
  assert.equal(resultado.nuevas, leerComprasDemo().length)
  assert.equal(comprasDAO(db).todas().length, resultado.nuevas)
  const harina = db.prepare("SELECT categoria, producto FROM catalogo WHERE tipo = 'material' AND nombre = 'Harina PAN'").get()
  assert.deepEqual({ ...harina }, { categoria: 'Materia Prima', producto: 'Arepas, Empanadas' })
  assert.equal(cargarDemo(db), null, 'con compras ya no carga nada')
  assert.equal(comprasDAO(db).todas().length, resultado.nuevas)
})

test('demo: una base con compras reales nunca recibe la demostración', t => {
  const db = baseTemporal(t)
  comprasDAO(db).crear({ proveedor: 'Selectos', fecha: '2026-11-01', materiales: [{ material: 'Azucar', cantidad: 1, monto: 2.27 }] })
  assert.equal(cargarDemo(db), null)
  assert.equal(comprasDAO(db).todas().length, 1)
})
