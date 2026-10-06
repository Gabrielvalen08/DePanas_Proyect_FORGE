/**
 * Tests del backend (node --test). Cada test usa una base temporal propia.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'
import { crearApp } from '../app.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

/** Levanta la app en un puerto libre con una base temporal */
async function levantar(t, dbPath) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-test-'))
  const ruta = dbPath ?? join(carpeta, 'depanas.db')
  const { app, cerrar } = crearApp({ dbPath: ruta, schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://localhost:${servidor.address().port}/api`
  t.after(async () => {
    servidor.closeAllConnections() // fetch deja conexiones keep-alive abiertas
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  return { base, carpeta, ruta }
}

async function pedir(url, opciones = {}) {
  const res = await fetch(url, {
    ...opciones,
    headers: opciones.body && !(opciones.body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
  })
  const texto = await res.text()
  return { status: res.status, cuerpo: texto ? JSON.parse(texto) : null }
}

const crear = (base, compra) => pedir(`${base}/compras`, { method: 'POST', body: JSON.stringify(compra) })

const WALMART_1 = {
  proveedor: 'Walmart', fecha: '2026-10-01',
  materiales: [
    { material: 'Arroz', cantidad: 5, unidad: 'lb', monto: 4.25 },
    { material: 'Sal', cantidad: 1, unidad: 'kg', monto: 0.9 },
  ],
}
const WALMART_2 = {
  proveedor: 'Walmart', fecha: '2026-10-01',
  materiales: [{ material: 'Aceite', cantidad: 1, unidad: 'galon', monto: 8.75 }],
}

test('dos compras al mismo proveedor el mismo día siguen separadas y conservan la unidad', async t => {
  const { base } = await levantar(t)
  await crear(base, WALMART_1)
  await crear(base, WALMART_2)

  const { cuerpo } = await pedir(`${base}/compras`)
  assert.equal(cuerpo.length, 2)
  const primera = cuerpo.find(c => c.materiales.length === 2)
  assert.deepEqual(primera.materiales.map(m => [m.material, m.unidad]), [['Arroz', 'lb'], ['Sal', 'kg']])
})

test('editar reemplaza los materiales de la compra y eliminar la borra completa', async t => {
  const { base } = await levantar(t)
  const { cuerpo: creada } = await crear(base, WALMART_1)

  const editada = await pedir(`${base}/compras/${creada.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...WALMART_1, materiales: [{ material: 'Arroz', cantidad: 10, unidad: 'lb', monto: 8.5 }] }),
  })
  assert.equal(editada.status, 200)
  assert.equal(editada.cuerpo.id, creada.id)
  assert.equal(editada.cuerpo.materiales.length, 1)
  assert.equal(editada.cuerpo.materiales[0].monto, 8.5)

  assert.equal((await pedir(`${base}/compras/${creada.id}`, { method: 'DELETE' })).status, 204)
  assert.equal((await pedir(`${base}/compras`)).cuerpo.length, 0)
  assert.equal((await pedir(`${base}/compras/${creada.id}`, { method: 'DELETE' })).status, 404)
})

test('rechaza montos y cantidades inválidos con 400', async t => {
  const { base } = await levantar(t)
  const malo = { proveedor: 'X', fecha: '2026-10-01', materiales: [{ material: 'Y', cantidad: 0, monto: -3 }] }
  const { status, cuerpo } = await crear(base, malo)
  assert.equal(status, 400)
  assert.match(cuerpo.error, /cantidad/)
  assert.equal((await pedir(`${base}/compras`)).cuerpo.length, 0)
})

test('el filtro por material devuelve la compra completa que lo contiene', async t => {
  const { base } = await levantar(t)
  await crear(base, WALMART_1)
  await crear(base, WALMART_2)
  const { cuerpo } = await pedir(`${base}/compras?material=sal`)
  assert.equal(cuerpo.length, 1)
  assert.equal(cuerpo[0].materiales.length, 2)
})

test('sugerencias y /ingresos/materiales funcionan (comillas simples en SQL)', async t => {
  const { base } = await levantar(t)
  await crear(base, WALMART_1)
  const { cuerpo } = await pedir(`${base}/compras/sugerencias`)
  // Las compras se suman al catálogo del Excel
  assert.ok(cuerpo.proveedores.includes('Walmart'))
  assert.ok(cuerpo.materiales.includes('Arroz') && cuerpo.materiales.includes('Sal'))
  const materiales = await pedir(`${base}/ingresos/materiales`)
  assert.equal(materiales.status, 200)
  assert.deepEqual(materiales.cuerpo, ['Arroz', 'Sal'])
})

test('una base nueva ya trae el catálogo del Excel, sin duplicados', async t => {
  const { base } = await levantar(t)
  await crear(base, {
    proveedor: 'selectos', fecha: '2026-10-01', categoria: 'Bebidas',
    materiales: [{ material: 'Pepsi', cantidad: 1, unidad: 'unidad', monto: 5.75, producto: 'Gaseosas' }],
  })
  const { cuerpo } = await pedir(`${base}/compras/sugerencias`)
  assert.deepEqual(cuerpo.proveedores, ['Desechables Diver.', 'MMAG', 'Pepsi', 'Selectos'])
  assert.deepEqual(cuerpo.categorias, ['Bebidas', 'Desechables', 'Limpieza', 'Materia Prima', 'Material Común', 'Servicios'])
  assert.equal(cuerpo.materiales.length, 36)
  assert.ok(cuerpo.materiales.includes('Jamón de Pavo'))
  assert.equal(cuerpo.productos.length, 12)
  assert.ok(cuerpo.productos.includes('Tequeños'))
})

test('el catálogo trae la categoría y el producto de cada material, como en el Excel', async t => {
  const { base } = await levantar(t)
  const { cuerpo } = await pedir(`${base}/catalogo`)
  const buscar = nombre => cuerpo.materiales.find(m => m.nombre === nombre)
  assert.deepEqual(buscar('Tocino La Rioja'), { nombre: 'Tocino La Rioja', categoria: 'Materia Prima', producto: 'Cachitos' })
  assert.deepEqual(buscar('Queso'), { nombre: 'Queso', categoria: '', producto: '' })
  assert.equal(buscar('Mr Músculo Antigrasa').categoria, 'Limpieza')
  assert.equal(cuerpo.categorias.length, 6)
})

test('asignar un material nuevo crea la categoría y el producto nuevos y no duplica los existentes', async t => {
  const { base } = await levantar(t)
  const asignar = (nombre, cuerpo) =>
    pedir(`${base}/catalogo/materiales/${encodeURIComponent(nombre)}`, { method: 'PUT', body: JSON.stringify(cuerpo) })

  const nuevo = await asignar('Harina PAN', { categoria: 'materia prima', producto: 'Arepas Rellenas' })
  assert.equal(nuevo.status, 200)
  assert.deepEqual(nuevo.cuerpo, {
    material: { nombre: 'Harina PAN', categoria: 'Materia Prima', producto: 'Arepas Rellenas' },
    materialNuevo: true,
    categoriaNueva: false,
    productoNuevo: true,
  })

  const existente = await asignar('queso', { categoria: 'Lácteos', producto: 'Tequeños' })
  assert.equal(existente.cuerpo.material.nombre, 'Queso')
  assert.equal(existente.cuerpo.materialNuevo, false)
  assert.equal(existente.cuerpo.categoriaNueva, true)

  const { cuerpo } = await pedir(`${base}/catalogo`)
  assert.ok(cuerpo.categorias.includes('Lácteos'))
  assert.ok(cuerpo.productos.includes('Arepas Rellenas'))
  assert.equal(cuerpo.materiales.filter(m => m.nombre.toLowerCase() === 'queso').length, 1)

  assert.equal((await asignar('Sal', { categoria: '', producto: 'Todos' })).status, 400)
})

test('cada material de una compra guarda su propia categoría', async t => {
  const { base } = await levantar(t)
  await crear(base, {
    proveedor: 'Selectos', fecha: '2026-10-01',
    materiales: [
      { material: 'Pepsi', cantidad: 1, unidad: 'unidad', monto: 5.75, categoria: 'Bebidas', producto: 'Gaseosas' },
      { material: 'Huevos', cantidad: 1, unidad: 'caja', monto: 5.04, categoria: 'Materia Prima', producto: 'Panadería' },
    ],
  })
  const { cuerpo } = await pedir(`${base}/compras`)
  assert.deepEqual(cuerpo[0].materiales.map(m => m.categoria), ['Bebidas', 'Materia Prima'])

  // Un material que solo está en compras toma la categoría y el producto de su fila
  await crear(base, {
    proveedor: 'MMAG', fecha: '2026-10-02',
    materiales: [{ material: 'Servilletas', cantidad: 1, unidad: 'caja', monto: 3, categoria: 'Desechables', producto: 'Todos' }],
  })
  const catalogo = await pedir(`${base}/catalogo`)
  assert.deepEqual(catalogo.cuerpo.materiales.find(m => m.nombre === 'Servilletas'),
    { nombre: 'Servilletas', categoria: 'Desechables', producto: 'Todos' })
})

test('exportar descarga una base con todos los datos aunque estén en el WAL', async t => {
  const { base, carpeta } = await levantar(t)
  await crear(base, WALMART_1)
  await crear(base, WALMART_2)

  const res = await fetch(`${base}/db/exportar`)
  assert.equal(res.status, 200)
  const destino = join(carpeta, 'exportada.db')
  const { writeFileSync } = await import('fs')
  writeFileSync(destino, Buffer.from(await res.arrayBuffer()))

  const exportada = new DatabaseSync(destino, { readOnly: true })
  const filas = exportada.prepare('SELECT COUNT(*) AS n FROM ingresos').get().n
  exportada.close() // antes de que la limpieza borre la carpeta (Windows)
  assert.equal(filas, 3)
})

test('importar rechaza un archivo que no es una base De Panas sin tocar los datos', async t => {
  const { base } = await levantar(t)
  await crear(base, WALMART_1)

  const form = new FormData()
  form.append('db', new Blob(['esto no es sqlite']), 'falsa.db')
  const { status } = await pedir(`${base}/db/importar`, { method: 'POST', body: form })
  assert.equal(status, 400)
  assert.equal((await pedir(`${base}/compras`)).cuerpo.length, 1)
})

test('exportar en un equipo e importar en otro traslada las compras y deja respaldo', async t => {
  const origen = await levantar(t)
  await crear(origen.base, WALMART_1)
  const exportada = Buffer.from(await (await fetch(`${origen.base}/db/exportar`)).arrayBuffer())

  const destino = await levantar(t)
  await crear(destino.base, WALMART_2)

  const form = new FormData()
  form.append('db', new Blob([exportada]), 'depanas.db')
  const { status, cuerpo } = await pedir(`${destino.base}/db/importar`, { method: 'POST', body: form })
  assert.equal(status, 200)
  assert.ok(existsSync(cuerpo.respaldo))

  const compras = (await pedir(`${destino.base}/compras`)).cuerpo
  assert.equal(compras.length, 1)
  assert.deepEqual(compras[0].materiales.map(m => m.material), ['Arroz', 'Sal'])
  // la conexión quedó abierta: se puede seguir guardando
  assert.equal((await crear(destino.base, WALMART_2)).status, 201)
})

test('importar JSON dos veces no duplica compras', async t => {
  const origen = await levantar(t)
  await crear(origen.base, WALMART_1)
  const json = (await pedir(`${origen.base}/db/exportar-json`)).cuerpo

  const destino = await levantar(t)
  const primera = await pedir(`${destino.base}/db/importar-json`, { method: 'POST', body: JSON.stringify(json) })
  const segunda = await pedir(`${destino.base}/db/importar-json`, { method: 'POST', body: JSON.stringify(json) })
  assert.deepEqual([primera.cuerpo.nuevas, segunda.cuerpo.nuevas, segunda.cuerpo.omitidas], [1, 0, 1])
  assert.equal((await pedir(`${destino.base}/compras`)).cuerpo.length, 1)
})

test('una base con el esquema anterior se migra al abrirla', async t => {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-antigua-'))
  const ruta = join(carpeta, 'depanas.db')
  const antigua = new DatabaseSync(ruta)
  antigua.exec(readFileSync(SCHEMA, 'utf8').replace(/compra_id\s+TEXT,.*\n/, '').replace(/unidad\s+TEXT[^\n]*\n/, ''))
  antigua.exec(`INSERT INTO ingresos (fecha, material, cantidad, monto, proveedor) VALUES
    ('2026-09-01', 'Harina', 2, 3.9, 'La Colonia'), ('2026-09-01', 'Queso', 1, 3.5, 'La Colonia')`)
  antigua.close()

  const { base } = await levantar(t, ruta)
  // Se registra después de levantar: en Windows la base debe cerrarse antes de borrar la carpeta
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  const compras = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(compras.length, 1)
  assert.equal(compras[0].materiales[0].unidad, 'unidad')
})
