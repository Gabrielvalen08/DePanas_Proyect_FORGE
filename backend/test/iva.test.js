/**
 * Tests del IVA de las compras (node --test). Cada test usa una base temporal propia.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'
import { cabeceras, entrar } from './ayudantes.js'
import { crearApp } from '../app.js'
import { contenidoCompra } from '../../shared/carga-compras.js'
import { calcularIva } from '../../shared/iva.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

async function levantar(t, preparar) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-iva-'))
  const ruta = join(carpeta, 'depanas.db')
  preparar?.(ruta)
  const { app, cerrar } = crearApp({ dbPath: ruta, schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  const base = `http://localhost:${servidor.address().port}/api`
  await entrar(base)
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  return base
}

async function pedir(url, metodo = 'GET', cuerpo) {
  const res = await fetch(url, {
    method: metodo,
    headers: cabeceras(url, cuerpo ? { 'Content-Type': 'application/json' } : {}),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const texto = await res.text()
  return { status: res.status, cuerpo: texto ? JSON.parse(texto) : null }
}

const filas = [{ material: 'Arroz', cantidad: 2, unidad: 'lb', monto: 100, categoria: 'Materia Prima', producto: 'Todos' }]
const compra = (proveedor, fecha, iva) => ({ proveedor, fecha, ...(iva === undefined ? {} : { iva }), materiales: filas })

test('calcularIva: 13 % encima, a centavos', () => {
  assert.equal(calcularIva(100), 13)
  assert.equal(calcularIva(9.99), 1.3)
  assert.equal(calcularIva(0), 0)
})

test('una compra guarda su IVA, se puede cambiar al editarla y sin IVA vale 0', async t => {
  const base = await levantar(t)
  const creada = await pedir(`${base}/compras`, 'POST', compra('Selectos', '2026-10-01', 13))
  assert.equal(creada.status, 201)
  assert.equal(creada.cuerpo.iva, 13)
  assert.equal((await pedir(`${base}/compras/${creada.cuerpo.id}`)).cuerpo.iva, 13)

  const editada = await pedir(`${base}/compras/${creada.cuerpo.id}`, 'PUT', compra('Selectos', '2026-10-01', 0))
  assert.equal(editada.cuerpo.iva, 0)

  const sinCampo = await pedir(`${base}/compras`, 'POST', compra('MMAG', '2026-10-02'))
  assert.equal(sinCampo.cuerpo.iva, 0)
})

test('el IVA debe ser un número mayor o igual a 0', async t => {
  const base = await levantar(t)
  for (const iva of [-1, 'trece', true]) {
    const r = await pedir(`${base}/compras`, 'POST', compra('Selectos', '2026-10-01', iva))
    assert.equal(r.status, 400)
    assert.match(r.cuerpo.error, /IVA/)
  }
})

test('ivaPorProveedor: manda la última compra por fecha y, a igual fecha, la registrada después', async t => {
  const base = await levantar(t)
  const iva = async () => (await pedir(`${base}/catalogo`)).cuerpo.ivaPorProveedor
  assert.deepEqual(await iva(), {})

  await pedir(`${base}/compras`, 'POST', compra('Selectos', '2026-10-05', 13))
  assert.equal((await iva()).selectos, true)

  // Una compra con fecha anterior registrada después no cambia lo que se sugiere
  await pedir(`${base}/compras`, 'POST', compra('Selectos', '2026-09-01', 0))
  assert.equal((await iva()).selectos, true)

  // A igual fecha gana la registrada después
  await pedir(`${base}/compras`, 'POST', compra('Selectos', '2026-10-05', 0))
  assert.equal((await iva()).selectos, false)

  // Las claves ignoran mayúsculas también con tilde, y cada proveedor va aparte
  await pedir(`${base}/compras`, 'POST', compra('ÁNGEL', '2026-10-05', 13))
  await pedir(`${base}/compras`, 'POST', compra('MMAG', '2026-10-05', 0))
  const mapa = await iva()
  assert.equal(mapa['ángel'], true)
  assert.equal(mapa.mmag, false)
})

test('una base anterior al IVA abre, migra y conserva sus compras sin IVA', async t => {
  const base = await levantar(t, ruta => {
    const db = new DatabaseSync(ruta)
    db.exec(`CREATE TABLE ingresos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, compra_id TEXT, fecha TEXT NOT NULL, material TEXT NOT NULL,
      cantidad REAL NOT NULL DEFAULT 1, unidad TEXT NOT NULL DEFAULT 'unidad', monto REAL NOT NULL, proveedor TEXT NOT NULL,
      categoria TEXT DEFAULT '', producto TEXT DEFAULT '', origen_id TEXT, compra_categoria TEXT
    )`)
    db.prepare("INSERT INTO ingresos (compra_id, fecha, material, monto, proveedor) VALUES ('vieja', '2026-08-01', 'Sal', 5.5, 'Selectos')").run()
    db.close()
  })
  const [vieja] = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(vieja.id, 'vieja')
  assert.equal(vieja.iva, 0)
  assert.equal(vieja.materiales[0].monto, 5.5)
  assert.equal((await pedir(`${base}/catalogo`)).cuerpo.ivaPorProveedor.selectos, false)
})

const respaldo = iva => ({
  id: 'r-1', proveedor: 'Selectos', fecha: '2026-10-01', categoria: '', ...(iva === undefined ? {} : { iva }),
  materiales: [{ material: 'Arroz', cantidad: 2, unidad: 'lb', monto: 100, categoria: 'Materia Prima', producto: 'Todos' }],
})
const importar = (base, compras, decisiones = []) => pedir(`${base}/db/importar-json`, 'POST', { compras, decisiones })

test('cargar: un respaldo viejo sin IVA carga como 0 y sale idéntico a la compra sin IVA', async t => {
  const base = await levantar(t)
  assert.equal((await importar(base, [respaldo()])).cuerpo.nuevas, 1)
  const [guardada] = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(guardada.iva, 0)

  // El mismo respaldo, con y sin el campo, se omite por idéntico
  assert.equal((await importar(base, [respaldo()])).cuerpo.omitidas, 1)
  assert.equal((await importar(base, [respaldo(0)])).cuerpo.omitidas, 1)
})

test('cargar: si el IVA difiere pide decidir y se conserva el que se elija', async t => {
  const base = await levantar(t)
  await importar(base, [respaldo()])
  const sinDecidir = await importar(base, [respaldo(13)])
  assert.equal(sinDecidir.status, 409)

  const [guardada] = (await pedir(`${base}/compras`)).cuerpo
  const decision = lado => ({
    origen: 'r-1', base: contenidoCompra(guardada), accion: 'combinar', existentes: [0], entrantes: [],
    proveedor: 'existente', fecha: 'existente', iva: lado,
  })

  // Quedarse con el IVA guardado no cambia nada
  assert.equal((await importar(base, [respaldo(13)], [decision('existente')])).cuerpo.descartadas, 1)
  assert.equal((await pedir(`${base}/compras`)).cuerpo[0].iva, 0)

  // Elegir el del archivo lo actualiza
  assert.equal((await importar(base, [respaldo(13)], [decision('entrante')])).cuerpo.actualizadas, 1)
  assert.equal((await pedir(`${base}/compras`)).cuerpo[0].iva, 13)

  // Una elección que no es de ningún lado se rechaza
  const [nueva] = (await pedir(`${base}/compras`)).cuerpo
  const mala = await importar(base, [respaldo(0)], [{ ...decision('otro'), base: contenidoCompra(nueva) }])
  assert.equal(mala.status, 400)
})

test('cargar: un IVA inválido en el archivo se rechaza', async t => {
  const base = await levantar(t)
  const r = await importar(base, [respaldo(-5)])
  assert.equal(r.status, 400)
  assert.match(r.cuerpo.error, /IVA inválido/)
})
