/**
 * Conexión con SQLite: el archivo depanas.db debe quedar completo (sin depender
 * del -wal) y las escrituras fila por fila validan igual que las compras.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'
import { crearApp } from '../app.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

async function levantar(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-sqlite-'))
  const ruta = join(carpeta, 'depanas.db')
  const { app, cerrar } = crearApp({ dbPath: ruta, schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  return { base: `http://localhost:${servidor.address().port}/api`, carpeta, ruta }
}

const pedir = (url, metodo, cuerpo) => fetch(url, {
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
}).then(async r => ({ status: r.status, cuerpo: await r.json() }))

test('copiar solo depanas.db (sin el -wal) se lleva las compras recién guardadas', async t => {
  const { base, carpeta, ruta } = await levantar(t)
  await pedir(`${base}/compras`, 'POST', {
    proveedor: 'MMAG', fecha: '2026-10-05',
    materiales: [{ material: 'Ajo Chino', cantidad: 4, unidad: 'lb', monto: 5 }],
  })
  // Como alguien que copia el archivo a una USB mientras el servidor sigue encendido
  const copia = join(carpeta, 'copia.db')
  copyFileSync(ruta, copia)
  const db = new DatabaseSync(copia, { readOnly: true })
  const filas = db.prepare('SELECT COUNT(*) AS n FROM ingresos').get().n
  db.close()
  assert.equal(filas, 1)
})

test('editar una fila suelta valida monto, cantidad y fecha como una compra', async t => {
  const { base } = await levantar(t)
  const { cuerpo: [fila] } = await pedir(`${base}/ingresos`, 'POST', {
    proveedor: 'Selectos', fecha: '2026-10-01', materiales: [{ material: 'Sal', cantidad: 1, monto: 1 }],
  })
  const datos = { proveedor: 'Selectos', fecha: '2026-10-01', material: 'Sal', cantidad: 1, monto: 1 }

  const negativo = await pedir(`${base}/ingresos/${fila.id}`, 'PUT', { ...datos, monto: -3 })
  assert.equal(negativo.status, 400)
  assert.equal(negativo.cuerpo.error, 'el monto debe ser mayor a 0')
  assert.equal((await pedir(`${base}/ingresos/${fila.id}`, 'PUT', { ...datos, fecha: 'ayer' })).status, 400)
  assert.equal((await pedir(`${base}/ingresos/${fila.id}`, 'PUT', { ...datos, cantidad: 0 })).status, 400)

  const bien = await pedir(`${base}/ingresos/${fila.id}`, 'PUT', { ...datos, monto: 2.5, unidad: 'kg' })
  assert.equal(bien.status, 200)
  assert.equal(bien.cuerpo.monto, 2.5)
  assert.equal(bien.cuerpo.unidad, 'kg')
  assert.equal((await pedir(`${base}/ingresos/999999`, 'PUT', datos)).status, 404)
})
