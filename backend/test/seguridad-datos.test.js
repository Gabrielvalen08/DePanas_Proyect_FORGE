/**
 * Pruebas de seguridad de los datos (node --test): validación de entradas, errores que no
 * revelan detalles internos, protección de los archivos exportados y respaldo de la base antes
 * de reemplazarla. El bloqueo por intentos, las sesiones y los permisos están en seguridad.test.js.
 * Cada prueba usa una base temporal.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'
import { CLAVE_CESAR, CLAVE_MARTA, cabeceras, entrar } from './ayudantes.js'
import { crearApp } from '../app.js'
import { MENSAJE_ERROR_INTERNO } from '../routes/responder.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

async function levantar(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-seguridad-'))
  const ruta = join(carpeta, 'depanas.db')
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
  return { base, ruta, carpeta }
}

/** Petición con la sesión del administrador (o con `token`); `crudo` manda el cuerpo tal cual */
async function pedir(url, { metodo = 'GET', cuerpo, crudo, token } = {}) {
  const extra = cuerpo !== undefined || crudo !== undefined ? { 'Content-Type': 'application/json' } : {}
  const res = await fetch(url, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}`, ...extra } : cabeceras(url, extra),
    body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
  })
  const texto = await res.text()
  let json = null
  try { json = texto ? JSON.parse(texto) : null } catch { json = texto }
  return { status: res.status, cuerpo: json, cabeceras: res.headers }
}

const fila = { material: 'Harina PAN', cantidad: 2, unidad: 'kg', monto: 5, categoria: 'Materia Prima', producto: 'Arepas' }
const compra = (extra = {}) => ({ proveedor: 'Selectos', fecha: '2026-10-01', materiales: [fila], ...extra })

async function tokenDe(base, usuario, contrasena) {
  return (await pedir(`${base}/sesion`, { metodo: 'POST', cuerpo: { usuario, contrasena } })).cuerpo.token
}

// ---------------------------------------------------------------------------
// Validación de entradas
// ---------------------------------------------------------------------------

test('entradas: un intento de inyección SQL en los filtros se toma como texto y no trae de más', async t => {
  const { base } = await levantar(t)
  await pedir(`${base}/compras`, { metodo: 'POST', cuerpo: compra() })
  for (const ataque of ["' OR 1=1 --", "x'); DROP TABLE ingresos; --", '%']) {
    const r = await pedir(`${base}/compras?proveedor=${encodeURIComponent(ataque)}`)
    assert.equal(r.status, 200)
    // '%' solo coincide con un proveedor que tenga ese carácter: aquí ninguno, salvo el comodín, que LIKE acepta
    if (ataque !== '%') assert.deepEqual(r.cuerpo, [], ataque)
  }
  // La tabla sigue ahí, con su compra
  assert.equal((await pedir(`${base}/compras`)).cuerpo.length, 1)
})

test('entradas: un nombre con comillas o etiquetas se guarda tal cual, como texto', async t => {
  const { base } = await levantar(t)
  const raro = `O'Brien <script>alert(1)</script>`
  const r = await pedir(`${base}/compras`, { metodo: 'POST', cuerpo: compra({ proveedor: raro }) })
  assert.equal(r.status, 201)
  assert.equal(r.cuerpo.proveedor, raro)
  // El catálogo también lo registró como texto (React lo muestra escapado)
  assert.ok((await pedir(`${base}/catalogo`)).cuerpo.proveedores.includes(raro))
})

test('entradas: compras con datos inválidos responden 400 con un mensaje claro y no guardan nada', async t => {
  const { base } = await levantar(t)
  const casos = [
    [compra({ proveedor: '' }), 'Falta el proveedor'],
    [compra({ proveedor: 'x'.repeat(121) }), /muy largo/],
    [compra({ fecha: '01/10/2026' }), /AAAA-MM-DD/],
    [compra({ fecha: '2026-13-45' }), 'La fecha no existe'],
    [compra({ fecha: '2026-02-30' }), 'La fecha no existe'],
    [compra({ materiales: [] }), /al menos un artículo/],
    [compra({ materiales: [{ ...fila, cantidad: -1 }] }), /cantidad debe ser mayor a 0/],
    [compra({ materiales: [{ ...fila, cantidad: 'abc' }] }), /cantidad debe ser mayor a 0/],
    [compra({ materiales: [{ ...fila, monto: 0 }] }), /monto debe ser mayor a 0/],
    [compra({ materiales: [{ ...fila, material: 'y'.repeat(121) }] }), /muy largo/],
    [compra({ iva: -5 }), /IVA/],
  ]
  for (const [cuerpo, esperado] of casos) {
    const r = await pedir(`${base}/compras`, { metodo: 'POST', cuerpo })
    assert.equal(r.status, 400, JSON.stringify(cuerpo).slice(0, 80))
    if (esperado instanceof RegExp) assert.match(r.cuerpo.error, esperado)
    else assert.equal(r.cuerpo.error, esperado)
  }
  assert.deepEqual((await pedir(`${base}/compras`)).cuerpo, [])
})

test('entradas: un cuerpo que no es JSON responde 400 en JSON, sin la página de error del servidor', async t => {
  const { base } = await levantar(t)
  const r = await pedir(`${base}/compras`, { metodo: 'POST', crudo: '{ esto no es json' })
  assert.equal(r.status, 400)
  assert.deepEqual(r.cuerpo, { error: 'Los datos enviados no son válidos' })
})

test('entradas: usuario, catálogo y lotes también validan lo que llega', async t => {
  const { base } = await levantar(t)
  assert.equal((await pedir(`${base}/usuarios`, { metodo: 'POST', cuerpo: { usuario: 'a b', nombre: 'X', contrasena: 'Arepa#2026' } })).cuerpo.campo, 'usuario')
  assert.equal((await pedir(`${base}/usuarios`, { metodo: 'POST', cuerpo: { usuario: 'Ana_04', nombre: 'Ana', contrasena: '123' } })).cuerpo.campo, 'contrasena')
  assert.equal((await pedir(`${base}/catalogo/producto`, { metodo: 'POST', cuerpo: { nombre: 'Arepas, Empanadas' } })).status, 400)
  assert.equal((await pedir(`${base}/catalogo/inventado`, { metodo: 'POST', cuerpo: { nombre: 'X' } })).status, 404)
  assert.equal((await pedir(`${base}/compras/archivar`, { metodo: 'POST', cuerpo: { ids: [{ $ne: 1 }], archivar: true } })).status, 400)
})

// ---------------------------------------------------------------------------
// Errores sin detalles internos
// ---------------------------------------------------------------------------

test('errores: un fallo interno de SQLite responde 500 genérico, sin el mensaje técnico', async t => {
  const { base, ruta } = await levantar(t)
  const db = new DatabaseSync(ruta)
  db.exec("CREATE TRIGGER falla BEFORE INSERT ON ingresos WHEN NEW.material = 'Falla' BEGIN SELECT RAISE(ABORT, 'detalle interno secreto'); END")
  db.close()
  const original = console.error
  console.error = () => {} // el servidor lo registra; aquí no hace falta verlo
  try {
    const r = await pedir(`${base}/compras`, { metodo: 'POST', cuerpo: compra({ materiales: [{ ...fila, material: 'Falla' }] }) })
    assert.equal(r.status, 500)
    assert.deepEqual(r.cuerpo, { error: MENSAJE_ERROR_INTERNO })
    assert.ok(!JSON.stringify(r.cuerpo).includes('secreto'))
  } finally {
    console.error = original
  }
})

test('errores: el servidor no anuncia qué es (sin cabecera X-Powered-By)', async t => {
  const { base } = await levantar(t)
  const r = await pedir(`${base}/health`)
  assert.equal(r.cabeceras.get('x-powered-by'), null)
})

// ---------------------------------------------------------------------------
// Archivos exportados
// ---------------------------------------------------------------------------

test('exportar: sin sesión 401; sin la pantalla Exportar 403 (un empleado no se lleva los datos)', async t => {
  const { base } = await levantar(t)
  await pedir(`${base}/usuarios`, { metodo: 'POST', cuerpo: { usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Arepa#2026', rol: 'empleado' } })
  const ana = await tokenDe(base, 'Ana_04', 'Arepa#2026')
  for (const ruta of ['/db/exportar', '/db/exportar-json']) {
    assert.equal((await fetch(`${base}${ruta}`)).status, 401, ruta)
    assert.equal((await pedir(`${base}${ruta}`, { token: ana })).status, 403, ruta)
  }
  // Marta (operadora) sí puede
  const marta = await tokenDe(base, 'Marta_02', CLAVE_MARTA)
  assert.equal((await pedir(`${base}/db/exportar-json`, { token: marta })).status, 200)
})

test('exportar: el JSON de compras no lleva usuarios ni contraseñas; la base .db solo guarda hashes', async t => {
  const { base, carpeta } = await levantar(t)
  await pedir(`${base}/compras`, { metodo: 'POST', cuerpo: compra() })
  const json = await pedir(`${base}/db/exportar-json`)
  const texto = JSON.stringify(json.cuerpo)
  assert.ok(texto.includes('Harina PAN'))
  assert.ok(!texto.includes('pbkdf2') && !texto.includes('Cesar_01') && !texto.includes(CLAVE_CESAR))

  const res = await fetch(`${base}/db/exportar`, { headers: cabeceras(`${base}/db/exportar`) })
  assert.equal(res.status, 200)
  const archivo = join(carpeta, 'exportada.db')
  writeFileSync(archivo, Buffer.from(await res.arrayBuffer()))
  const bytes = readFileSync(archivo).toString('latin1')
  assert.ok(!bytes.includes(CLAVE_CESAR), 'la contraseña nunca va en texto')
  const db = new DatabaseSync(archivo, { readOnly: true })
  const hashes = db.prepare('SELECT contrasena FROM usuarios').all().map(u => u.contrasena)
  db.close()
  assert.ok(hashes.every(h => h.startsWith('pbkdf2$')))
})

// ---------------------------------------------------------------------------
// Respaldo antes de reemplazar la base
// ---------------------------------------------------------------------------

test('respaldo: importar una base guarda antes la actual en depanas.respaldo.db, con sus compras', async t => {
  const { base, ruta, carpeta } = await levantar(t)
  await pedir(`${base}/compras`, { metodo: 'POST', cuerpo: compra({ proveedor: 'Compra de antes' }) })

  // Otra base válida (exportada de este mismo servidor, ya sin la compra)
  const res = await fetch(`${base}/db/exportar`, { headers: cabeceras(`${base}/db/exportar`) })
  const otra = join(carpeta, 'otra.db')
  writeFileSync(otra, Buffer.from(await res.arrayBuffer()))
  const editable = new DatabaseSync(otra)
  editable.exec('DELETE FROM ingresos')
  editable.close()

  const formulario = new FormData()
  formulario.append('db', new Blob([readFileSync(otra)]), 'otra.db')
  const importar = await fetch(`${base}/db/importar`, { method: 'POST', headers: cabeceras(`${base}/db/importar`), body: formulario })
  assert.equal(importar.status, 200)
  assert.deepEqual((await pedir(`${base}/compras`)).cuerpo, [])

  const respaldo = ruta.replace(/\.db$/, '.respaldo.db')
  assert.ok(existsSync(respaldo))
  const db = new DatabaseSync(respaldo, { readOnly: true })
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM ingresos WHERE proveedor = 'Compra de antes'").get().n, 1)
  db.close()
})

test('respaldo: importar sin la pantalla Cargar datos responde 403 y no toca la base', async t => {
  const { base } = await levantar(t)
  await pedir(`${base}/compras`, { metodo: 'POST', cuerpo: compra() })
  await pedir(`${base}/usuarios`, { metodo: 'POST', cuerpo: { usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Arepa#2026', rol: 'empleado' } })
  const ana = await tokenDe(base, 'Ana_04', 'Arepa#2026')
  const formulario = new FormData()
  formulario.append('db', new Blob(['no importa']), 'x.db')
  const r = await fetch(`${base}/db/importar`, { method: 'POST', headers: { Authorization: `Bearer ${ana}` }, body: formulario })
  assert.equal(r.status, 403)
  assert.equal((await pedir(`${base}/compras`)).cuerpo.length, 1)
})
