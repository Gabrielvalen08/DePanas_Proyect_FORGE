/**
 * Tests del Archivo de compras (node --test): las compras pasan solas al Archivo a los 3 meses,
 * se archivan o devuelven a mano y se eliminan varias a la vez. Cada test usa una base temporal.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'
import { CLAVE_MARTA, cabeceras, entrar } from './ayudantes.js'
import { crearApp } from '../app.js'
import { abrirDB } from '../db.js'
import { estaArchivada, fechaLimiteArchivo, hoyLocalISO } from '../../shared/archivo.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

async function levantar(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-archivo-'))
  const dbPath = join(carpeta, 'depanas.db')
  const { app, cerrar } = crearApp({ dbPath, schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  const base = `http://localhost:${servidor.address().port}/api`
  await entrar(base)
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  return { base, dbPath }
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

/** Fecha ISO de hace `dias` días (hora local) */
function haceDias(dias) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return hoyLocalISO(d)
}

const filas = [{ material: 'Arroz', cantidad: 2, unidad: 'lb', monto: 10, categoria: 'Materia Prima', producto: 'Todos' }]
const crear = async (base, proveedor, fecha) => (await pedir(`${base}/compras`, 'POST', { proveedor, fecha, materiales: filas })).cuerpo
const ids = lista => lista.map(c => c.id).sort()

test('fechaLimiteArchivo: tres meses atrás, con el último día del mes si no existe', () => {
  assert.equal(fechaLimiteArchivo('2026-11-11'), '2026-08-11')
  assert.equal(fechaLimiteArchivo('2026-05-31'), '2026-02-28')
  assert.equal(fechaLimiteArchivo('2026-01-15'), '2025-10-15')
  assert.equal(fechaLimiteArchivo('2024-05-30'), '2024-02-29')
  assert.equal(estaArchivada({ fecha: '2026-08-10', archivo: null }, '2026-11-11'), true)
  assert.equal(estaArchivada({ fecha: '2026-08-11', archivo: null }, '2026-11-11'), false)
  assert.equal(estaArchivada({ fecha: '2020-01-01', archivo: 'activa' }, '2026-11-11'), false)
  assert.equal(estaArchivada({ fecha: '2026-11-11', archivo: 'archivada' }, '2026-11-11'), true)
})

test('una compra de más de 3 meses pasa sola al Archivo; sin filtro salen todas', async t => {
  const { base } = await levantar(t)
  const nueva = await crear(base, 'Selectos', haceDias(10))
  const vieja = await crear(base, 'MMAG', haceDias(120))

  const activas = (await pedir(`${base}/compras?archivo=activas`)).cuerpo
  const archivadas = (await pedir(`${base}/compras?archivo=archivadas`)).cuerpo
  assert.deepEqual(ids(activas), [nueva.id])
  assert.deepEqual(ids(archivadas), [vieja.id])
  assert.equal(archivadas[0].archivada, true)
  assert.equal(archivadas[0].archivo, null, 'automática: no tiene marca a mano')
  // Exportar y Cargar siguen viendo todas
  assert.deepEqual(ids((await pedir(`${base}/compras`)).cuerpo), [nueva.id, vieja.id].sort())
  assert.equal((await pedir(`${base}/compras?archivo=otra`)).status, 400)
})

test('archivar a mano y devolver: una devuelta se queda en la lista aunque tenga más de 3 meses', async t => {
  const { base } = await levantar(t)
  const nueva = await crear(base, 'Selectos', haceDias(5))
  const vieja = await crear(base, 'MMAG', haceDias(200))

  const archivar = await pedir(`${base}/compras/archivar`, 'POST', { ids: [nueva.id], archivar: true })
  assert.equal(archivar.status, 200)
  assert.deepEqual(archivar.cuerpo, { cambiadas: 1, archivar: true })
  assert.deepEqual(ids((await pedir(`${base}/compras?archivo=archivadas`)).cuerpo), [nueva.id, vieja.id].sort())
  assert.deepEqual((await pedir(`${base}/compras?archivo=activas`)).cuerpo, [])

  const devolver = await pedir(`${base}/compras/archivar`, 'POST', { ids: [nueva.id, vieja.id], archivar: false })
  assert.equal(devolver.cuerpo.cambiadas, 2)
  const activas = (await pedir(`${base}/compras?archivo=activas`)).cuerpo
  assert.deepEqual(ids(activas), [nueva.id, vieja.id].sort())
  assert.ok(activas.every(c => c.archivo === 'activa' && !c.archivada))
})

test('editar una compra no la saca ni la mete al Archivo', async t => {
  const { base } = await levantar(t)
  const compra = await crear(base, 'Selectos', haceDias(5))
  await pedir(`${base}/compras/archivar`, 'POST', { ids: [compra.id], archivar: true })
  const editada = await pedir(`${base}/compras/${compra.id}`, 'PUT', { proveedor: 'Selectos', fecha: haceDias(4), materiales: filas })
  assert.equal(editada.status, 200)
  assert.equal(editada.cuerpo.archivo, 'archivada')
  assert.equal(editada.cuerpo.archivada, true)
})

test('eliminar varias compras a la vez, todo o nada en una transacción', async t => {
  const { base } = await levantar(t)
  const a = await crear(base, 'Selectos', haceDias(1))
  const b = await crear(base, 'MMAG', haceDias(2))
  const c = await crear(base, 'Pepsi', haceDias(3))

  const r = await pedir(`${base}/compras/eliminar`, 'POST', { ids: [a.id, b.id] })
  assert.equal(r.status, 200)
  assert.deepEqual(r.cuerpo, { eliminadas: 2 })
  assert.deepEqual(ids((await pedir(`${base}/compras`)).cuerpo), [c.id])
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: ['no-existe'] })).status, 404)
})

test('archivar y eliminar varias validan lo que llega', async t => {
  const { base } = await levantar(t)
  const compra = await crear(base, 'Selectos', haceDias(1))
  assert.equal((await pedir(`${base}/compras/archivar`, 'POST', { ids: [], archivar: true })).status, 400)
  assert.equal((await pedir(`${base}/compras/archivar`, 'POST', { ids: [compra.id] })).status, 400)
  assert.equal((await pedir(`${base}/compras/archivar`, 'POST', { ids: [{}], archivar: true })).status, 400)
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: 'todo' })).status, 400)
  assert.equal((await pedir(`${base}/compras/archivar`, 'POST', { ids: ['no-existe'], archivar: true })).status, 404)
})

test('permisos: archivar exige compras.archivar; eliminar varias, compras.eliminar', async t => {
  const { base } = await levantar(t)
  const compra = await crear(base, 'Selectos', haceDias(1))
  // Marta (operadora) trae compras.archivar con su rol
  const marta = (await pedir(`${base}/sesion`, 'POST', { usuario: 'Marta_02', contrasena: CLAVE_MARTA })).cuerpo
  assert.ok(marta.funciones.includes('compras.archivar'))
  assert.equal((await pedir(`${base}/compras/archivar`, 'POST', { ids: [compra.id], archivar: true }, marta.token)).status, 200)

  // Un empleado no archiva ni elimina
  await pedir(`${base}/usuarios`, 'POST', { usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Arepa#2026', rol: 'empleado' })
  const ana = (await pedir(`${base}/sesion`, 'POST', { usuario: 'Ana_04', contrasena: 'Arepa#2026' })).cuerpo
  assert.ok(!ana.funciones.includes('compras.archivar'))
  assert.equal((await pedir(`${base}/compras/archivar`, 'POST', { ids: [compra.id], archivar: false }, ana.token)).status, 403)
  assert.equal((await pedir(`${base}/compras/eliminar`, 'POST', { ids: [compra.id] }, ana.token)).status, 403)
  // Pero sí ve el Archivo (pantalla Lista de compras)
  assert.equal((await pedir(`${base}/compras?archivo=archivadas`, 'GET', undefined, ana.token)).status, 200)
})

test('una base de antes del Archivo se migra: sus compras quedan en automático y los operadores reciben archivar una vez', t => {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-archivo-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  const dbPath = join(carpeta, 'depanas.db')
  let db = abrirDB(dbPath, SCHEMA)
  db.close()
  // Simula la base anterior: sin la columna, sin la marca de migración y Marta con su lista vieja
  const vieja = new DatabaseSync(dbPath)
  vieja.exec('ALTER TABLE ingresos DROP COLUMN compra_archivo')
  vieja.prepare("INSERT INTO ingresos (compra_id, fecha, material, cantidad, monto, proveedor) VALUES ('c1', '2020-01-01', 'Arroz', 1, 5, 'Selectos')").run()
  vieja.prepare("UPDATE usuarios SET funciones = ? WHERE usuario = 'Marta_02'").run(JSON.stringify(['compras.editar', 'compras.eliminar']))
  vieja.prepare("DELETE FROM ajustes WHERE clave = 'funcionComprasArchivar'").run()
  vieja.close()

  db = abrirDB(dbPath, SCHEMA)
  assert.equal(db.prepare("SELECT compra_archivo FROM ingresos WHERE compra_id = 'c1'").get().compra_archivo, null)
  const funciones = () => JSON.parse(db.prepare("SELECT funciones FROM usuarios WHERE usuario = 'Marta_02'").get().funciones)
  assert.deepEqual(funciones(), ['compras.editar', 'compras.eliminar', 'compras.archivar'])
  // Si el administrador se la quita después, no vuelve al reabrir la base
  db.prepare("UPDATE usuarios SET funciones = ? WHERE usuario = 'Marta_02'").run(JSON.stringify(['compras.editar']))
  db.close()
  db = abrirDB(dbPath, SCHEMA)
  assert.deepEqual(funciones(), ['compras.editar'])
  db.close()
})
