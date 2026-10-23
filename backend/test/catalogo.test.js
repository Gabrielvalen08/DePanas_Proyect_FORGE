/**
 * Tests del catálogo editable (Catálogo). Cada test usa una base temporal propia.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'
import { crearApp } from '../app.js'
import { abrirDB } from '../db.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

function carpetaTemporal(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-catalogo-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  return carpeta
}

async function levantar(t) {
  // Windows no deja borrar la carpeta con la base abierta: primero se cierra todo, después se borra
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-catalogo-'))
  const { app, cerrar } = crearApp({ dbPath: join(carpeta, 'depanas.db'), schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  return `http://localhost:${servidor.address().port}/api`
}

async function pedir(url, metodo = 'GET', cuerpo) {
  const res = await fetch(url, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const texto = await res.text()
  return { status: res.status, cuerpo: texto ? JSON.parse(texto) : null }
}

const url = (base, tipo, nombre) => `${base}/catalogo/${tipo}${nombre ? `/${encodeURIComponent(nombre)}` : ''}`
const catalogo = async base => (await pedir(`${base}/catalogo`)).cuerpo
const material = (cat, nombre) => cat.materiales.find(m => m.nombre === nombre)

const COMPRA = {
  proveedor: 'Selectos', fecha: '2026-10-01',
  materiales: [{ material: 'Tocino La Rioja', cantidad: 1, unidad: 'lb', monto: 2.69, categoria: 'Materia Prima', producto: 'Cachitos' }],
}

test('agregar: proveedor, y material con categoría y producto nuevos; no admite repetidos', async t => {
  const base = await levantar(t)
  assert.equal((await pedir(url(base, 'proveedor'), 'POST', { nombre: 'La Colonia' })).status, 200)
  const repetido = await pedir(url(base, 'proveedor'), 'POST', { nombre: 'la colonia' })
  assert.equal(repetido.status, 409)
  assert.match(repetido.cuerpo.error, /Ya existe un proveedor llamado «La Colonia»/)

  const nuevo = await pedir(url(base, 'material'), 'POST', { nombre: 'Harina PAN', categoria: 'Materia Prima', producto: 'Arepas Rellenas' })
  assert.deepEqual(
    { categoria: nuevo.cuerpo.categoria, producto: nuevo.cuerpo.producto, categoriaNueva: nuevo.cuerpo.categoriaNueva, productoNuevo: nuevo.cuerpo.productoNuevo },
    { categoria: 'Materia Prima', producto: 'Arepas Rellenas', categoriaNueva: false, productoNuevo: true },
  )
  const cat = await catalogo(base)
  assert.ok(cat.proveedores.includes('La Colonia'))
  assert.ok(cat.productos.includes('Arepas Rellenas'))
  assert.equal((await pedir(url(base, 'material'), 'POST', { nombre: 'Sal', categoria: 'Materia Prima' })).status, 400)
})

test('renombrar un proveedor lo cambia en todas sus compras', async t => {
  const base = await levantar(t)
  await pedir(`${base}/compras`, 'POST', COMPRA)
  const r = await pedir(url(base, 'proveedor', 'Selectos'), 'PUT', { nombre: 'Súper Selectos' })
  assert.equal(r.status, 200)
  assert.equal(r.cuerpo.compras, 1)
  const compras = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(compras[0].proveedor, 'Súper Selectos')
  const cat = await catalogo(base)
  assert.ok(cat.proveedores.includes('Súper Selectos') && !cat.proveedores.includes('Selectos'))
  assert.equal(cat.uso.proveedor['súper selectos'], 1)

  assert.equal((await pedir(url(base, 'proveedor', 'Súper Selectos'), 'PUT', { nombre: 'MMAG' })).status, 409)
  assert.equal((await pedir(url(base, 'proveedor', 'No existe'), 'PUT', { nombre: 'X' })).status, 404)
})

test('cambiar el nombre, la categoría y el producto de un material se refleja en sus compras', async t => {
  const base = await levantar(t)
  await pedir(`${base}/compras`, 'POST', COMPRA)
  const r = await pedir(url(base, 'material', 'Tocino La Rioja'), 'PUT', { nombre: 'Tocino ahumado', categoria: 'Carnes', producto: 'Tequeños' })
  assert.equal(r.status, 200)
  assert.equal(r.cuerpo.categoriaNueva, true)
  const fila = (await pedir(`${base}/compras`)).cuerpo[0].materiales[0]
  assert.deepEqual([fila.material, fila.categoria, fila.producto], ['Tocino ahumado', 'Carnes', 'Tequeños'])
  assert.deepEqual(material(await catalogo(base), 'Tocino ahumado'), { nombre: 'Tocino ahumado', categoria: 'Carnes', producto: 'Tequeños', productos: ['Tequeños'] })
})

test('renombrar una categoría la cambia en sus materiales y en las compras', async t => {
  const base = await levantar(t)
  await pedir(`${base}/compras`, 'POST', COMPRA)
  await pedir(url(base, 'categoria', 'Materia Prima'), 'PUT', { nombre: 'Insumos' })
  const cat = await catalogo(base)
  assert.equal(material(cat, 'Tocino La Rioja').categoria, 'Insumos')
  assert.ok(cat.categorias.includes('Insumos') && !cat.categorias.includes('Materia Prima'))
  assert.equal((await pedir(`${base}/compras`)).cuerpo[0].materiales[0].categoria, 'Insumos')
})

test('eliminar: un producto deja sin producto a sus materiales; un proveedor sale de las opciones pero no de las compras', async t => {
  const base = await levantar(t)
  await pedir(`${base}/compras`, 'POST', COMPRA)
  const prod = await pedir(url(base, 'producto', 'Cachitos'), 'DELETE')
  assert.equal(prod.status, 200)
  assert.ok(prod.cuerpo.materiales >= 1)
  assert.equal(material(await catalogo(base), 'Tocino La Rioja').producto, '')

  assert.equal((await pedir(url(base, 'proveedor', 'Selectos'), 'DELETE')).status, 200)
  assert.ok(!(await catalogo(base)).proveedores.includes('Selectos'))
  assert.equal((await pedir(`${base}/compras`)).cuerpo[0].proveedor, 'Selectos')
  assert.equal((await pedir(url(base, 'proveedor', 'Selectos'), 'DELETE')).status, 404)
})

test('una compra con un proveedor o material nuevo los registra en el catálogo', async t => {
  const base = await levantar(t)
  await pedir(`${base}/compras`, 'POST', {
    proveedor: 'Walmart', fecha: '2026-10-02',
    materiales: [{ material: 'Servilletas', cantidad: 1, unidad: 'caja', monto: 3, categoria: 'Desechables', producto: 'Todos' }],
  })
  const cat = await catalogo(base)
  assert.ok(cat.proveedores.includes('Walmart'))
  assert.deepEqual(material(cat, 'Servilletas'), { nombre: 'Servilletas', categoria: 'Desechables', producto: 'Todos', productos: ['Todos'] })
})

test('lo que se elimina no reaparece al reabrir la base', t => {
  const ruta = join(carpetaTemporal(t), 'depanas.db')
  let db = abrirDB(ruta, SCHEMA)
  db.prepare("DELETE FROM catalogo WHERE tipo = 'proveedor' AND nombre = 'MMAG'").run()
  db.close()
  db = abrirDB(ruta, SCHEMA)
  const mmag = db.prepare("SELECT 1 FROM catalogo WHERE tipo = 'proveedor' AND nombre = 'MMAG'").get()
  db.close()
  assert.equal(mmag, undefined)
})

test('una base anterior al catálogo se completa una vez con lo que hay en sus compras', t => {
  const ruta = join(carpetaTemporal(t), 'antigua.db')
  const vieja = new DatabaseSync(ruta)
  vieja.exec(`CREATE TABLE ingresos (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, material TEXT NOT NULL,
    cantidad REAL NOT NULL DEFAULT 1, monto REAL NOT NULL, proveedor TEXT NOT NULL, categoria TEXT DEFAULT '', producto TEXT DEFAULT '')`)
  vieja.prepare('INSERT INTO ingresos (fecha, material, cantidad, monto, proveedor, categoria, producto) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('2026-08-01', 'Mantequilla', 1, 2.5, 'La Colonia', 'Lácteos', 'Panadería')
  vieja.close()

  const db = abrirDB(ruta, SCHEMA)
  const fila = (tipo, nombre) => db.prepare('SELECT nombre, categoria, producto FROM catalogo WHERE tipo = ? AND nombre = ?').get(tipo, nombre)
  assert.ok(fila('proveedor', 'La Colonia'))
  assert.ok(fila('categoria', 'Lácteos'))
  assert.deepEqual({ ...fila('material', 'Mantequilla') }, { nombre: 'Mantequilla', categoria: 'Lácteos', producto: 'Panadería' })
  assert.ok(fila('proveedor', 'Selectos'), 'también trae el catálogo del Excel')
  db.close()
})

test('una categoría o un producto fija sus materiales: los nuevos se mudan, los quitados quedan sin asignar', async t => {
  const base = await levantar(t)
  for (const nombre of ['Harina PAN', 'Queso duro', 'Aceite']) {
    await pedir(url(base, 'material'), 'POST', { nombre, categoria: 'Materia Prima', producto: 'Arepas' })
  }
  assert.equal((await pedir(`${base}/compras`, 'POST', {
    proveedor: 'Selectos', fecha: '2026-10-01',
    materiales: [{ material: 'Aceite', cantidad: 1, unidad: 'l', monto: 3, categoria: 'Materia Prima', producto: 'Arepas' }],
  })).status, 201)

  // Nueva categoría con Aceite: deja Materia Prima y su compra se actualiza
  const nueva = await pedir(url(base, 'categoria'), 'POST', { nombre: 'Grasas', materiales: ['aceite'] })
  assert.equal(nueva.status, 200)
  assert.equal(nueva.cuerpo.materiales, 1)
  let cat = await catalogo(base)
  assert.equal(material(cat, 'Aceite').categoria, 'Grasas')
  const [compra] = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(compra.materiales[0].categoria, 'Grasas')

  // El producto Arepas se queda solo con Harina PAN: Queso duro y Aceite quedan sin producto
  const editado = await pedir(url(base, 'producto', 'Arepas'), 'PUT', { nombre: 'Arepas', materiales: ['Harina PAN'] })
  assert.equal(editado.status, 200)
  assert.equal(editado.cuerpo.materiales, 2)
  cat = await catalogo(base)
  assert.equal(material(cat, 'Harina PAN').producto, 'Arepas')
  assert.equal(material(cat, 'Queso duro').producto, '')
  assert.equal(material(cat, 'Aceite').producto, '')

  // Renombrar y cambiar materiales a la vez
  await pedir(url(base, 'producto', 'Arepas'), 'PUT', { nombre: 'Arepitas', materiales: ['Harina PAN', 'Queso duro'] })
  cat = await catalogo(base)
  assert.equal(material(cat, 'Queso duro').producto, 'Arepitas')
  assert.equal(material(cat, 'Harina PAN').producto, 'Arepitas')

  // Sin `materiales` no se tocan
  await pedir(url(base, 'categoria', 'Grasas'), 'PUT', { nombre: 'Aceites y grasas' })
  assert.equal(material(await catalogo(base), 'Aceite').categoria, 'Aceites y grasas')
})

test('materiales: un material que no existe o una lista inválida se rechazan sin cambiar nada', async t => {
  const base = await levantar(t)
  await pedir(url(base, 'material'), 'POST', { nombre: 'Harina PAN', categoria: 'Materia Prima', producto: 'Arepas' })
  const inexistente = await pedir(url(base, 'categoria'), 'POST', { nombre: 'Harinas', materiales: ['Harina PAN', 'Unicornio'] })
  assert.equal(inexistente.status, 400)
  assert.match(inexistente.cuerpo.error, /Unicornio/)
  const cat = await catalogo(base)
  assert.ok(!cat.categorias.includes('Harinas'))
  assert.equal(material(cat, 'Harina PAN').categoria, 'Materia Prima')
  assert.equal((await pedir(url(base, 'producto', 'Arepas'), 'PUT', { materiales: 'Harina PAN' })).status, 400)
})

test('precios: cada material sugiere el precio unitario de su última compra y se actualiza con una más reciente', async t => {
  const base = await levantar(t)
  const comprar = (fecha, cantidad, monto, unidad = 'bolsa') => pedir(`${base}/compras`, 'POST', {
    proveedor: 'Selectos', fecha,
    materiales: [{ material: 'Arroz', cantidad, unidad, monto, categoria: 'Materia Prima', producto: 'Todos' }],
  })

  assert.deepEqual((await catalogo(base)).precios, {})

  await comprar('2026-10-01', 5, 5)
  assert.deepEqual((await catalogo(base)).precios.arroz, { precio: 1, unidad: 'bolsa' })

  await comprar('2026-10-08', 5, 6)
  assert.deepEqual((await catalogo(base)).precios.arroz, { precio: 1.2, unidad: 'bolsa' })

  // Una compra más antigua registrada después no pisa el precio más reciente
  await comprar('2026-09-01', 2, 1)
  assert.equal((await catalogo(base)).precios.arroz.precio, 1.2)

  // Se conserva la unidad de esa compra y los decimales largos se redondean
  await comprar('2026-10-09', 3, 1, 'kg')
  assert.deepEqual((await catalogo(base)).precios.arroz, { precio: 0.3333, unidad: 'kg' })
})

test('un artículo puede ir en varios productos: se guardan todos, cuentan en cada uno y las compras los llevan todos', async t => {
  const base = await levantar(t)
  const creado = await pedir(url(base, 'material'), 'POST', { nombre: 'Harina PAN', categoria: 'Materia Prima', productos: ['Arepas', 'Empanadas Nuevas'] })
  assert.equal(creado.status, 200)
  assert.equal(creado.cuerpo.producto, 'Arepas, Empanadas Nuevas')
  assert.deepEqual(creado.cuerpo.productosNuevos, ['Empanadas Nuevas'])

  let cat = await catalogo(base)
  assert.deepEqual(material(cat, 'Harina PAN').productos, ['Arepas', 'Empanadas Nuevas'])
  assert.ok(cat.productos.includes('Empanadas Nuevas'))
  assert.equal(cat.uso.producto['empanadas nuevas'], 1)

  // La compra guarda todos sus productos
  await pedir(`${base}/compras`, 'POST', {
    proveedor: 'Selectos', fecha: '2026-10-01',
    materiales: [{ material: 'Harina PAN', cantidad: 1, unidad: 'kg', monto: 2, categoria: 'Materia Prima', producto: 'Arepas, Empanadas Nuevas' }],
  })
  assert.equal((await pedir(`${base}/compras`)).cuerpo[0].materiales[0].producto, 'Arepas, Empanadas Nuevas')

  // Un producto que suma un artículo no le quita los que ya tenía
  await pedir(url(base, 'producto'), 'POST', { nombre: 'Pastelitos', materiales: ['Harina PAN'] })
  cat = await catalogo(base)
  assert.deepEqual(material(cat, 'Harina PAN').productos, ['Arepas', 'Empanadas Nuevas', 'Pastelitos'])

  // Renombrar un producto lo cambia dentro de la lista, en el catálogo y en la compra
  const renombrado = await pedir(url(base, 'producto', 'Empanadas Nuevas'), 'PUT', { nombre: 'Empanadas Rellenas' })
  assert.equal(renombrado.cuerpo.compras, 1)
  cat = await catalogo(base)
  assert.deepEqual(material(cat, 'Harina PAN').productos, ['Arepas', 'Empanadas Rellenas', 'Pastelitos'])
  assert.equal((await pedir(`${base}/compras`)).cuerpo[0].materiales[0].producto, 'Arepas, Empanadas Rellenas, Pastelitos')

  // Eliminar un producto lo quita de la lista; los demás se quedan
  const eliminado = await pedir(url(base, 'producto', 'Arepas'), 'DELETE')
  assert.equal(eliminado.cuerpo.materiales, 1)
  cat = await catalogo(base)
  assert.deepEqual(material(cat, 'Harina PAN').productos, ['Empanadas Rellenas', 'Pastelitos'])
})

test('el nombre de un producto no puede llevar comas (son el separador de la lista)', async t => {
  const base = await levantar(t)
  const r = await pedir(url(base, 'producto'), 'POST', { nombre: 'Arepas, Tequeños' })
  assert.equal(r.status, 400)
  assert.match(r.cuerpo.error, /no puede llevar comas/)
  assert.equal((await pedir(url(base, 'material'), 'POST', { nombre: 'Sal', categoria: 'Materia Prima', productos: [] })).status, 400)
})

test('ficha del proveedor: ubicación, varios teléfonos y contactos; se conserva al renombrar y se valida', async t => {
  const base = await levantar(t)
  const ficha = {
    ubicacion: ' Col. Escalón,  San Salvador ',
    telefonos: ['7123-4567', '', '+503 2222 3333'],
    contactos: [{ nombre: 'Ana', telefono: '7000-1111' }, { nombre: '', telefono: '' }],
  }
  const creado = await pedir(url(base, 'proveedor'), 'POST', { nombre: 'La Pulpería', ficha })
  assert.equal(creado.status, 200)
  const esperada = {
    ubicacion: 'Col. Escalón, San Salvador',
    telefonos: ['7123-4567', '+503 2222 3333'],
    contactos: [{ nombre: 'Ana', telefono: '7000-1111' }],
  }
  assert.deepEqual(creado.cuerpo.ficha, esperada)
  assert.deepEqual((await catalogo(base)).fichas['la pulpería'], esperada)

  // Renombrar sin mandar ficha la conserva; mandarla la reemplaza
  await pedir(url(base, 'proveedor', 'La Pulpería'), 'PUT', { nombre: 'Pulpería Don Juan' })
  let cat = await catalogo(base)
  assert.equal(cat.fichas['la pulpería'], undefined)
  assert.deepEqual(cat.fichas['pulpería don juan'], esperada)
  const editado = await pedir(url(base, 'proveedor', 'Pulpería Don Juan'), 'PUT', { ficha: { ubicacion: 'Santa Tecla', telefonos: [], contactos: [] } })
  assert.deepEqual(editado.cuerpo.ficha, { ubicacion: 'Santa Tecla', telefonos: [], contactos: [] })

  // Un teléfono inválido no se guarda y dice qué campo corregir
  const malo = await pedir(url(base, 'proveedor', 'Pulpería Don Juan'), 'PUT', { ficha: { telefonos: ['abc'] } })
  assert.equal(malo.status, 400)
  assert.equal(malo.cuerpo.campo, 'telefono-0')
  const sinNombre = await pedir(url(base, 'proveedor'), 'POST', { nombre: 'Otro', ficha: { contactos: [{ nombre: '', telefono: '7123-4567' }] } })
  assert.equal(sinNombre.status, 400)
  assert.equal(sinNombre.cuerpo.campo, 'contacto-0')
  cat = await catalogo(base)
  assert.equal(cat.fichas['pulpería don juan'].ubicacion, 'Santa Tecla')
  assert.ok(!cat.proveedores.includes('Otro'))

  // Eliminar el proveedor quita su ficha
  await pedir(url(base, 'proveedor', 'Pulpería Don Juan'), 'DELETE')
  assert.equal((await catalogo(base)).fichas['pulpería don juan'], undefined)
})
