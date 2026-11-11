/**
 * Tests de eliminar varias compras a la vez (casillas de la Lista de compras), con node --test.
 * Cada test usa una base temporal.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { CLAVE_MARTA, cabeceras, entrar } from './ayudantes.js'
import { crearApp } from '../app.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

async function levantar(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-lote-'))
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
  return { base }
}

async function pedir(url, metodo = 'GET', cuerpo, token) {
  const extra = cuerpo ? { 'Content-Type': 'application/json' } : {}
  const res = await fetch(url, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}`, ...extra } : cabeceras(url, extra),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const texto = await res.text()
  return { status: res.status, cuerpo: texto ? JSON.parse(texto) : null }
}

const filas = [{ material: 'Arroz', cantidad: 2, unidad: 'lb', monto: 10, categoria: 'Materia Prima', producto: 'Todos' }]
const crear = async (base, proveedor, fecha) => (await pedir(`${base}/compras`, 'POST', { proveedor, fecha, materiales: filas })).cuerpo

test('eliminar varias compras a la vez, todo o nada en una transacción', async t => {
  const { base } = await levantar(t)
  const a = await crear(base, 'Selectos', '2026-11-01')
  const b = await crear(base, 'MMAG', '2026-11-02')
  const c = await crear(base, 'Pepsi', '2026-11-03')

  const r = await pedir(`${base}/compras/eliminar`, 'POST', { ids: [a.id, b.id] })
  assert.equal(r.status, 200)
  assert.deepEqual(r.cuerpo, { eliminadas: 2 })
  assert.deepEqual((await pedir(`${base}/compras`)).cuerpo.map(x => x.id), [c.id])
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: ['no-existe'] })).status, 404)
})

test('eliminar varias valida lo que llega', async t => {
  const { base } = await levantar(t)
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: [] })).status, 400)
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: 'todo' })).status, 400)
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: [{}] })).status, 400)
})

test('las compras ya no traen datos del Archivo y la ruta de archivar no existe', async t => {
  const { base } = await levantar(t)
  const compra = await crear(base, 'Selectos', '2020-01-15')
  const [lista] = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(lista.id, compra.id) // una compra vieja sigue en la lista
  assert.ok(!('archivada' in lista) && !('archivo' in lista))
  assert.equal((await pedir(`${base}/compras/archivar`, 'POST', { ids: [compra.id], archivar: true })).status, 404)
})

test('permisos: eliminar varias exige compras.eliminar', async t => {
  const { base } = await levantar(t)
  const compra = await crear(base, 'Selectos', '2026-11-01')
  const marta = (await pedir(`${base}/sesion`, 'POST', { usuario: 'Marta_02', contrasena: CLAVE_MARTA })).cuerpo
  assert.ok(!marta.funciones.includes('compras.archivar'))

  // Un empleado no elimina
  await pedir(`${base}/usuarios`, 'POST', { usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Arepa#2026', rol: 'empleado' })
  const ana = (await pedir(`${base}/sesion`, 'POST', { usuario: 'Ana_04', contrasena: 'Arepa#2026' })).cuerpo
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: [compra.id] }, ana.token)).status, 403)
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: [compra.id] }, marta.token)).status, 200)
})
