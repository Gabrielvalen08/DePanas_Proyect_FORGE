/**
 * Tests del Gestor de usuarios, del inicio de sesión y de los requisitos de contraseña.
 * Cada test usa una base temporal propia.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { DatabaseSync } from 'node:sqlite'
import { CLAVE_CESAR, cabeceras, entrar } from './ayudantes.js'
import { crearApp } from '../app.js'
import { abrirDB } from '../db.js'
import { hashear, verificar } from '../contrasenas.js'
import { HASH_CESAR_ANTERIOR } from '../db/usuarios.js'
import { FUNCIONES, RUTAS_ASIGNABLES } from '../../shared/usuarios.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

async function levantar(t) {
  // Windows no deja borrar la carpeta con la base abierta: primero se cierra todo, después se borra
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-usuarios-'))
  const dbPath = join(carpeta, 'depanas.db')
  const { app, cerrar } = crearApp({ dbPath, schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  const base = `http://localhost:${servidor.address().port}/api`
  await entrar(base)
  return { base, dbPath }
}

function baseTemporal(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-usuarios-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  return join(carpeta, 'depanas.db')
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

const entra = async (base, usuario, contrasena) => (await pedir(`${base}/sesion`, 'POST', { usuario, contrasena })).status

const NUEVO = { usuario: 'Luis_03', nombre: 'Luis', contrasena: 'Arepa#99', rol: 'operador', permisos: ['/compras', '/'] }

test('contrasenas: el hash no guarda el texto y solo verifica la contraseña correcta', () => {
  const hash = hashear('1234')
  assert.ok(!hash.includes('1234'))
  assert.notEqual(hash, hashear('1234')) // cada hash lleva su propia sal
  assert.equal(verificar('1234', hash), true)
  assert.equal(verificar('12345', hash), false)
  assert.equal(verificar('1234', 'texto-plano'), false)
})

test('la base nueva trae a Cesar_01 (administrador) y a Marta_02 (operadora, todo menos el gestor)', async t => {
  const { base, dbPath } = await levantar(t)
  const { cuerpo } = await pedir(`${base}/usuarios`)
  assert.deepEqual(cuerpo, [
    { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'], funciones: ['*'] },
    { usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: RUTAS_ASIGNABLES, funciones: FUNCIONES },
  ])
  // Las contraseñas no están en texto plano en la base
  const db = new DatabaseSync(dbPath, { readOnly: true })
  const guardadas = db.prepare('SELECT contrasena FROM usuarios').all()
  db.close()
  for (const { contrasena } of guardadas) assert.match(contrasena, /^pbkdf2\$/)
})

test('sesión: César entra con su contraseña nueva (ya no con 1234) y Marta con la suya', async t => {
  const { base } = await levantar(t)
  const ok = await pedir(`${base}/sesion`, 'POST', { usuario: 'cesar_01', contrasena: CLAVE_CESAR })
  assert.equal(ok.status, 200)
  const { token, ...usuario } = ok.cuerpo
  assert.deepEqual(usuario, { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'], funciones: ['*'] })
  assert.match(token, /^[\w-]{40,}$/, 'entrar devuelve el token de la sesión')
  assert.equal(await entra(base, 'Cesar_01', '1234'), 401)
  assert.equal(await entra(base, 'Marta_02', '5678'), 200)
  assert.equal(await entra(base, 'Nadie', '1234'), 401)
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Marta_02' })).status, 401)
})

test('requisitos: la base nueva pide 8 caracteres, mayúscula, minúscula, número y carácter especial', async t => {
  const { base } = await levantar(t)
  assert.deepEqual((await pedir(`${base}/requisitos-contrasena`)).cuerpo, {
    minimo: 8, mayuscula: true, minuscula: true, numero: true, especial: true,
  })
  for (const [contrasena, falta] of [['Ar#9', /8 caracteres/], ['arepa#99', /mayúscula/], ['AREPA#99', /minúscula/], ['Arepa#xx', /número/], ['Arepa999', /especial/]]) {
    const r = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, contrasena })
    assert.equal(r.status, 400, contrasena)
    assert.equal(r.cuerpo.campo, 'contrasena')
    assert.match(r.cuerpo.error, falta)
  }
  assert.equal((await pedir(`${base}/usuarios`, 'POST', NUEVO)).status, 201)
})

test('requisitos: el administrador los cambia y se aplican a las contraseñas nuevas; un mínimo inválido se rechaza', async t => {
  const { base } = await levantar(t)
  const cambiados = await pedir(`${base}/requisitos-contrasena`, 'PUT', { minimo: 6, mayuscula: false, minuscula: true, numero: true, especial: false })
  assert.deepEqual(cambiados.cuerpo, { minimo: 6, mayuscula: false, minuscula: true, numero: true, especial: false })
  assert.equal((await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, contrasena: 'arepa9' })).status, 201)

  for (const minimo of [3, 65, 'ocho', 7.5]) {
    const r = await pedir(`${base}/requisitos-contrasena`, 'PUT', { minimo })
    assert.equal(r.status, 400, String(minimo))
    assert.equal(r.cuerpo.campo, 'minimo')
  }
  assert.equal((await pedir(`${base}/requisitos-contrasena`)).cuerpo.minimo, 6)
})

test('crear: cada rol trae sus pantallas y funciones; el empleado no tiene Catálogo ni elimina compras', async t => {
  const { base } = await levantar(t)
  const empleado = await pedir(`${base}/usuarios`, 'POST', { usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Tequeño#1', rol: 'empleado' })
  assert.equal(empleado.status, 201)
  assert.deepEqual(empleado.cuerpo, { usuario: 'Ana_04', nombre: 'Ana', rol: 'empleado', permisos: ['/', '/compras'], funciones: ['compras.editar'] })

  const operador = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, permisos: undefined })
  assert.deepEqual(operador.cuerpo.permisos, RUTAS_ASIGNABLES)
  assert.deepEqual(operador.cuerpo.funciones, FUNCIONES)
})

test('crear: las pantallas y funciones del rol se pueden ajustar; las funciones de pantallas que no tiene se quitan', async t => {
  const { base } = await levantar(t)
  const r = await pedir(`${base}/usuarios`, 'POST', {
    ...NUEVO, rol: 'empleado', permisos: ['/compras', '/catalogo'], funciones: ['compras.eliminar', 'catalogo.agregar', 'catalogo.exportar'],
  })
  assert.equal(r.status, 201)
  assert.deepEqual(r.cuerpo.permisos, ['/compras', '/catalogo'])
  assert.deepEqual(r.cuerpo.funciones, ['compras.eliminar', 'catalogo.agregar', 'catalogo.exportar'])

  const sinPantalla = await pedir(`${base}/usuarios/Luis_03`, 'PUT', { permisos: ['/compras'], funciones: ['compras.eliminar', 'catalogo.agregar'] })
  assert.deepEqual(sinPantalla.cuerpo.funciones, ['compras.eliminar'])
})

test('crear: no deja repetir el usuario, ni crear otro administrador o un rol inventado', async t => {
  const { base } = await levantar(t)
  const usuarioRepetido = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, usuario: 'MARTA_02' })
  assert.equal(usuarioRepetido.status, 409)
  assert.equal(usuarioRepetido.cuerpo.campo, 'usuario')

  assert.equal((await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, rol: 'admin' })).status, 403)
  const inventado = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, rol: 'jefe' })
  assert.equal(inventado.status, 400)
  assert.equal(inventado.cuerpo.campo, 'rol')
  assert.equal((await pedir(`${base}/usuarios`)).cuerpo.length, 2)
})

test('crear: valida usuario, nombre, pantallas y funciones; el gestor no se puede asignar', async t => {
  const { base } = await levantar(t)
  const casos = [
    [{ usuario: 'con espacio' }, 'usuario'],
    [{ usuario: 'ab' }, 'usuario'],
    [{ nombre: '  ' }, 'nombre'],
    [{ permisos: [] }, 'permisos'],
    [{ permisos: ['/inventada'] }, 'permisos'],
    [{ permisos: ['/', '/usuarios'] }, 'permisos'],
    [{ permisos: ['*'] }, 'permisos'],
    [{ funciones: ['compras.inventar'] }, 'funciones'],
    [{ funciones: 'compras.editar' }, 'funciones'],
  ]
  for (const [cambio, campo] of casos) {
    const r = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, ...cambio })
    assert.ok(r.status >= 400 && r.status < 500, JSON.stringify(cambio))
    assert.equal(r.cuerpo.campo, campo, JSON.stringify(cambio))
  }
})

test('editar: cambia contraseña, nombre, rol, pantallas y funciones; la contraseña vacía no se toca', async t => {
  const { base } = await levantar(t)
  await pedir(`${base}/usuarios`, 'POST', NUEVO)
  const editado = await pedir(`${base}/usuarios/luis_03`, 'PUT', {
    nombre: 'Luis Pérez', contrasena: '', rol: 'empleado', permisos: ['/compras'], funciones: [],
  })
  assert.equal(editado.status, 200)
  assert.deepEqual(editado.cuerpo, { usuario: 'Luis_03', nombre: 'Luis Pérez', rol: 'empleado', permisos: ['/compras'], funciones: [] })
  assert.equal(await entra(base, 'Luis_03', 'Arepa#99'), 200)

  assert.equal((await pedir(`${base}/usuarios/Luis_03`, 'PUT', { contrasena: 'Tequeño#7' })).status, 200)
  assert.equal(await entra(base, 'Luis_03', 'Arepa#99'), 401)
  assert.equal(await entra(base, 'Luis_03', 'Tequeño#7'), 200)
  assert.equal((await pedir(`${base}/usuarios/Luis_03`, 'PUT', { contrasena: 'Tequeño#7' })).status, 200)
})

test('contraseñas: no se comparan con las de los demás (eso revelaría la de otro usuario)', async t => {
  const { base } = await levantar(t)
  // La misma contraseña que el administrador: se acepta y no se dice nada de él
  const r = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, contrasena: CLAVE_CESAR })
  assert.equal(r.status, 201)
  assert.equal((await pedir(`${base}/usuarios/Marta_02`, 'PUT', { contrasena: CLAVE_CESAR })).status, 200)
  assert.equal(await entra(base, 'Luis_03', CLAVE_CESAR), 200)
  assert.equal(await entra(base, 'Marta_02', CLAVE_CESAR), 200)
})

test('editar: la contraseña nueva cumple los requisitos; no se puede dar el gestor ni hacer otro administrador', async t => {
  const { base } = await levantar(t)
  const debil = await pedir(`${base}/usuarios/Marta_02`, 'PUT', { contrasena: '5679' })
  assert.equal(debil.status, 400)
  assert.equal(debil.cuerpo.campo, 'contrasena')
  assert.equal((await pedir(`${base}/usuarios/Marta_02`, 'PUT', { permisos: ['/usuarios'] })).status, 403)
  assert.equal((await pedir(`${base}/usuarios/Marta_02`, 'PUT', { rol: 'admin' })).status, 403)
  assert.equal((await pedir(`${base}/usuarios/Nadie`, 'PUT', { nombre: 'X' })).status, 404)
  // Marta sigue entrando con su contraseña de antes
  assert.equal(await entra(base, 'Marta_02', '5678'), 200)
})

test('administrador: siempre conserva su rol, todas las pantallas y funciones, y no se puede eliminar', async t => {
  const { base } = await levantar(t)
  const editado = await pedir(`${base}/usuarios/Cesar_01`, 'PUT', { permisos: ['/'], funciones: [], rol: 'empleado', contrasena: 'Nueva#2027' })
  assert.deepEqual(editado.cuerpo, { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'], funciones: ['*'] })
  assert.equal(await entra(base, 'Cesar_01', 'Nueva#2027'), 200)
  assert.equal((await pedir(`${base}/usuarios/Cesar_01`, 'DELETE')).status, 403)
})

test('eliminar: el usuario deja de existir y ya no inicia sesión', async t => {
  const { base } = await levantar(t)
  const r = await pedir(`${base}/usuarios/marta_02`, 'DELETE')
  assert.deepEqual(r.cuerpo, { usuario: 'Marta_02' })
  assert.equal(await entra(base, 'Marta_02', '5678'), 401)
  assert.equal((await pedir(`${base}/usuarios/Marta_02`, 'DELETE')).status, 404)
})

test('los cambios de usuarios se conservan al reabrir la base (no se vuelve a sembrar)', t => {
  const dbPath = baseTemporal(t)
  let db = abrirDB(dbPath, SCHEMA)
  db.prepare("DELETE FROM usuarios WHERE usuario = 'Marta_02'").run()
  db.close()
  db = abrirDB(dbPath, SCHEMA)
  const usuarios = db.prepare('SELECT usuario FROM usuarios').all().map(u => u.usuario)
  db.close()
  assert.deepEqual(usuarios, ['Cesar_01'])
})

test('los permisos guardados con /configuracion pasan a /catalogo al abrir la base', t => {
  const dbPath = baseTemporal(t)
  let db = abrirDB(dbPath, SCHEMA)
  db.prepare("UPDATE usuarios SET permisos = ? WHERE usuario = 'Marta_02'").run(JSON.stringify(['/compras', '/configuracion']))
  db.close()
  db = abrirDB(dbPath, SCHEMA)
  const { permisos } = db.prepare("SELECT permisos FROM usuarios WHERE usuario = 'Marta_02'").get()
  db.close()
  assert.deepEqual(JSON.parse(permisos), ['/compras', '/catalogo'])
})

test('una base de antes de los roles se migra: acepta empleados y sus usuarios conservan todas sus funciones', async t => {
  // Base con la tabla anterior: CHECK solo admin/operador y sin columna funciones; César aún con 1234
  // (una sola limpieza al final: Windows no deja borrar la carpeta con la base abierta)
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-usuarios-'))
  const dbPath = join(carpeta, 'depanas.db')
  const vieja = new DatabaseSync(dbPath)
  vieja.exec(`CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT NOT NULL UNIQUE COLLATE NOCASE, nombre TEXT NOT NULL,
    contrasena TEXT NOT NULL, rol TEXT NOT NULL DEFAULT 'operador' CHECK (rol IN ('admin', 'operador')),
    permisos TEXT NOT NULL DEFAULT '[]')`)
  vieja.prepare('INSERT INTO usuarios (usuario, nombre, contrasena, rol, permisos) VALUES (?, ?, ?, ?, ?)')
    .run('Cesar_01', 'César', HASH_CESAR_ANTERIOR, 'admin', '["*"]')
  vieja.prepare('INSERT INTO usuarios (usuario, nombre, contrasena, rol, permisos) VALUES (?, ?, ?, ?, ?)')
    .run('Pepe_05', 'Pepe', hashear('Pepe#2020'), 'operador', '["/compras","/catalogo"]')
  vieja.close()

  const db = abrirDB(dbPath, SCHEMA)
  const pepe = db.prepare("SELECT funciones FROM usuarios WHERE usuario = 'Pepe_05'").get()
  assert.equal(pepe.funciones, null)
  db.prepare("INSERT INTO usuarios (usuario, nombre, contrasena, rol) VALUES ('Ana_04', 'Ana', 'x', 'empleado')").run()
  const cesar = db.prepare("SELECT contrasena FROM usuarios WHERE usuario = 'Cesar_01'").get()
  db.close()
  // César pasa a la contraseña nueva
  assert.equal(verificar(CLAVE_CESAR, cesar.contrasena), true)
  assert.equal(verificar('1234', cesar.contrasena), false)

  // Pepe, sin lista de funciones, tiene todas las de sus pantallas
  const { app, cerrar } = crearApp({ dbPath, schemaPath: SCHEMA })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  const base = `http://localhost:${servidor.address().port}/api`
  const { cuerpo } = await pedir(`${base}/sesion`, 'POST', { usuario: 'Pepe_05', contrasena: 'Pepe#2020' })
  assert.deepEqual(cuerpo.funciones, FUNCIONES.filter(f => f.startsWith('compras.') || f.startsWith('catalogo.')))
})

test('si César ya cambió su contraseña, abrir la base no la toca', t => {
  const dbPath = baseTemporal(t)
  let db = abrirDB(dbPath, SCHEMA)
  db.prepare("UPDATE usuarios SET contrasena = ? WHERE usuario = 'Cesar_01'").run(hashear('Propia#123'))
  db.close()
  db = abrirDB(dbPath, SCHEMA)
  const { contrasena } = db.prepare("SELECT contrasena FROM usuarios WHERE usuario = 'Cesar_01'").get()
  db.close()
  assert.equal(verificar('Propia#123', contrasena), true)
})
