/**
 * Unidades de los artículos: cada artículo guarda la suya en el Catálogo y las compras la toman
 * de ahí; «g» pasó a llamarse «gr» y existe «otros». También la categoría «Gastos personales» y el
 * producto «Ninguno». Cada test usa una base temporal propia.
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
import { abrirDB } from '../db.js'
import { UNIDADES, normalizarUnidad, unidadValida } from '../../shared/unidades.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

async function levantar(t) {
  // Windows no deja borrar la carpeta con la base abierta: primero se cierra todo, después se borra
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-unidades-'))
  const { app, cerrar } = crearApp({ dbPath: join(carpeta, 'depanas.db'), schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  const base = `http://localhost:${servidor.address().port}/api`
  await entrar(base)
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

const articulo = async (base, nombre) => (await pedir(`${base}/catalogo`)).cuerpo.materiales.find(m => m.nombre === nombre)
const asignar = (base, nombre, cuerpo) => pedir(`${base}/catalogo/materiales/${encodeURIComponent(nombre)}`, 'PUT', cuerpo)

test('unidades: «gr» en vez de «g», con «otros» al final; «g» se lee como «gr»', () => {
  assert.ok(UNIDADES.includes('gr') && !UNIDADES.includes('g'))
  assert.equal(UNIDADES.at(-1), 'otros')
  assert.equal(normalizarUnidad(' g '), 'gr')
  assert.equal(unidadValida('g'), true)
  assert.equal(unidadValida('tonelada'), false)
})

test('la base trae la categoría «Gastos personales» y el producto «Ninguno»', async t => {
  const base = await levantar(t)
  const { cuerpo } = await pedir(`${base}/catalogo`)
  assert.ok(cuerpo.categorias.includes('Gastos personales'))
  assert.ok(cuerpo.productos.includes('Ninguno'))
  // Se usan como cualquier otra: un gasto personal que no va en ningún producto
  const r = await asignar(base, 'Almuerzo del equipo', { categoria: 'Gastos personales', productos: ['Ninguno'], unidad: 'otros', nuevo: true })
  assert.equal(r.status, 200)
  assert.deepEqual([r.cuerpo.categoriaNueva, r.cuerpo.productoNuevo, r.cuerpo.material.unidad], [false, false, 'otros'])
})

test('la unidad es del artículo: se crea, se cambia con el lápiz y una inválida se rechaza', async t => {
  const base = await levantar(t)
  const nuevo = await asignar(base, 'Harina PAN', { categoria: 'Materia Prima', productos: ['Arepas'], unidad: 'kg', nuevo: true })
  assert.equal(nuevo.cuerpo.material.unidad, 'kg')
  assert.equal((await articulo(base, 'Harina PAN')).unidad, 'kg')

  // Editar desde la compra (lápiz) o desde el Catálogo; «g» se guarda como «gr»
  const editado = await pedir(`${base}/catalogo/material/Harina%20PAN`, 'PUT', { nombre: 'Harina PAN', categoria: 'Materia Prima', productos: ['Arepas'], unidad: 'g' })
  assert.equal(editado.status, 200)
  assert.equal(editado.cuerpo.unidad, 'gr')

  const mala = await asignar(base, 'Harina PAN', { categoria: 'Materia Prima', unidad: 'tonelada' })
  assert.equal(mala.status, 400)
  assert.equal(mala.cuerpo.campo, 'unidad')
  // Sin unidad en el cuerpo no se toca
  await asignar(base, 'Harina PAN', { categoria: 'Materia Prima', productos: ['Arepas'] })
  assert.equal((await articulo(base, 'Harina PAN')).unidad, 'gr')
})

test('cambiar la unidad de un artículo no cambia las compras ya guardadas', async t => {
  const base = await levantar(t)
  await pedir(`${base}/compras`, 'POST', {
    proveedor: 'Selectos', fecha: '2026-10-01',
    materiales: [{ material: 'Azucar', cantidad: 2, unidad: 'lb', monto: 3, categoria: 'Materia Prima', producto: 'Todos' }],
  })
  // La primera compra le da la unidad al artículo que no tenía
  assert.equal((await articulo(base, 'Azucar')).unidad, 'lb')
  await asignar(base, 'Azucar', { categoria: 'Materia Prima', productos: ['Todos'], unidad: 'kg' })
  assert.equal((await articulo(base, 'Azucar')).unidad, 'kg')
  const [compra] = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(compra.materiales[0].unidad, 'lb')
})

test('una compra con «g» se guarda como «gr»', async t => {
  const base = await levantar(t)
  await pedir(`${base}/compras`, 'POST', {
    proveedor: 'Selectos', fecha: '2026-10-01',
    materiales: [{ material: 'Anis', cantidad: 50, unidad: 'g', monto: 1.5, categoria: 'Materia Prima', producto: 'Golfeados' }],
  })
  const [compra] = (await pedir(`${base}/compras`)).cuerpo
  assert.equal(compra.materiales[0].unidad, 'gr')
})

test('sin catalogo.editar no se cambia la unidad que ya tiene un artículo, pero sí se completa la que falta', async t => {
  const base = await levantar(t)
  await asignar(base, 'Cebolla', { categoria: 'Materia Prima', productos: ['Arepas/Empanadas'], unidad: 'lb' })
  const empleado = { usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Ana#20266', rol: 'empleado' }
  assert.equal((await pedir(`${base}/usuarios`, 'POST', empleado)).status, 201)
  await entrar(base, empleado.usuario, empleado.contrasena)
  assert.equal((await asignar(base, 'Cebolla', { categoria: 'Materia Prima', productos: ['Arepas/Empanadas'], unidad: 'kg' })).status, 403)
  assert.equal((await asignar(base, 'Queso', { categoria: 'Materia Prima', productos: ['Tequeños'], unidad: 'lb' })).status, 200)
})

test('una base anterior: «g» pasa a «gr», cada artículo toma la unidad de su última compra y llegan las opciones nuevas', t => {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-unidades-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  const dbPath = join(carpeta, 'depanas.db')
  // Base en la versión 2 del catálogo: sin unidad en el catálogo ni las opciones nuevas
  let db = abrirDB(dbPath, SCHEMA)
  db.close()
  const vieja = new DatabaseSync(dbPath)
  vieja.exec('PRAGMA user_version = 2')
  vieja.exec("DELETE FROM catalogo WHERE nombre IN ('Gastos personales', 'Ninguno')")
  vieja.exec('ALTER TABLE catalogo DROP COLUMN unidad')
  const fila = vieja.prepare(
    'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto) ' +
    "VALUES (?, ?, ?, 1, ?, 2, 'Selectos', 'Materia Prima', 'Todos')"
  )
  fila.run('a', '2026-09-01', 'Anis', 'lb')
  fila.run('b', '2026-09-05', 'Anis', 'g')
  fila.run('c', '2026-09-02', 'Azucar', 'kg')
  vieja.close()

  db = abrirDB(dbPath, SCHEMA)
  const unidad = nombre => db.prepare("SELECT unidad FROM catalogo WHERE tipo = 'material' AND nombre = ?").get(nombre).unidad
  assert.equal(unidad('Anis'), 'gr')
  assert.equal(unidad('Azucar'), 'kg')
  assert.equal(unidad('Cebolla'), '')
  assert.deepEqual(db.prepare('SELECT DISTINCT unidad FROM ingresos ORDER BY unidad').all().map(f => f.unidad), ['gr', 'kg', 'lb'])
  assert.ok(db.prepare("SELECT 1 FROM catalogo WHERE tipo = 'categoria' AND nombre = 'Gastos personales'").get())
  assert.ok(db.prepare("SELECT 1 FROM catalogo WHERE tipo = 'producto' AND nombre = 'Ninguno'").get())
  db.close()
})

test('respaldo del catálogo: los artículos llevan su unidad y al cargar la toman', async t => {
  const base = await levantar(t)
  const r = await pedir(`${base}/catalogo/material/importar`, 'POST', {
    filas: { tipo: 'material', version: 1, filas: [{ nombre: 'Leche', categoria: 'Materia Prima', productos: [], unidad: 'litro' }] },
  })
  assert.equal(r.status, 200)
  assert.equal((await articulo(base, 'Leche')).unidad, 'litro')
})
