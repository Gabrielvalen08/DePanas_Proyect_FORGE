/**
 * Tests del Gestor de usuarios y del inicio de sesión. Cada test usa una base temporal propia.
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
import { hashear, verificar } from '../contrasenas.js'

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
  return { base: `http://localhost:${servidor.address().port}/api`, dbPath }
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

const NUEVO = { usuario: 'Luis_03', nombre: 'Luis', contrasena: 'arepa99', permisos: ['/compras', '/'] }

test('contrasenas: el hash no guarda el texto y solo verifica la contraseña correcta', () => {
  const hash = hashear('1234')
  assert.ok(!hash.includes('1234'))
  assert.notEqual(hash, hashear('1234')) // cada hash lleva su propia sal
  assert.equal(verificar('1234', hash), true)
  assert.equal(verificar('12345', hash), false)
  assert.equal(verificar('1234', 'texto-plano'), false)
})

test('la base nueva trae a Cesar_01 (administrador) y a Marta_02 con todo menos el gestor', async t => {
  const { base, dbPath } = await levantar(t)
  const { cuerpo } = await pedir(`${base}/usuarios`)
  assert.deepEqual(cuerpo, [
    { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'] },
    { usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: ['/', '/compras', '/configuracion', '/exportar', '/cargar'] },
  ])
  // Las contraseñas no están en texto plano en la base
  const db = new DatabaseSync(dbPath, { readOnly: true })
  const guardadas = db.prepare('SELECT contrasena FROM usuarios').all()
  db.close()
  for (const { contrasena } of guardadas) assert.match(contrasena, /^pbkdf2\$/)
})

test('sesión: entra con usuario y contraseña (sin distinguir mayúsculas en el usuario)', async t => {
  const { base } = await levantar(t)
  const ok = await pedir(`${base}/sesion`, 'POST', { usuario: 'cesar_01', contrasena: '1234' })
  assert.equal(ok.status, 200)
  assert.deepEqual(ok.cuerpo, { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'] })
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Cesar_01', contrasena: '5678' })).status, 401)
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Nadie', contrasena: '1234' })).status, 401)
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Marta_02' })).status, 401)
})

test('crear: guarda el usuario como operador, nunca devuelve la contraseña y puede iniciar sesión', async t => {
  const { base } = await levantar(t)
  const creado = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, rol: 'admin' })
  assert.equal(creado.status, 201)
  // El rol que se manda se ignora y los permisos quedan en el orden del menú
  assert.deepEqual(creado.cuerpo, { usuario: 'Luis_03', nombre: 'Luis', rol: 'operador', permisos: ['/', '/compras'] })
  const sesion = await pedir(`${base}/sesion`, 'POST', { usuario: 'Luis_03', contrasena: 'arepa99' })
  assert.equal(sesion.status, 200)
  assert.equal(JSON.stringify((await pedir(`${base}/usuarios`)).cuerpo).includes('contrasena'), false)
})

test('crear: no deja repetir el usuario ni la contraseña, y dice qué campo cambiar', async t => {
  const { base } = await levantar(t)
  const usuarioRepetido = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, usuario: 'MARTA_02' })
  assert.equal(usuarioRepetido.status, 409)
  assert.equal(usuarioRepetido.cuerpo.campo, 'usuario')
  assert.match(usuarioRepetido.cuerpo.error, /Marta_02/)

  const contrasenaRepetida = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, contrasena: '5678' })
  assert.equal(contrasenaRepetida.status, 409)
  assert.equal(contrasenaRepetida.cuerpo.campo, 'contrasena')
  assert.equal((await pedir(`${base}/usuarios`)).cuerpo.length, 2)
})

test('crear: valida usuario, nombre, contraseña y pantallas; el gestor no se puede asignar', async t => {
  const { base } = await levantar(t)
  const casos = [
    [{ usuario: 'con espacio' }, 'usuario'],
    [{ usuario: 'ab' }, 'usuario'],
    [{ nombre: '  ' }, 'nombre'],
    [{ contrasena: '123' }, 'contrasena'],
    [{ permisos: [] }, 'permisos'],
    [{ permisos: ['/inventada'] }, 'permisos'],
    [{ permisos: ['/', '/usuarios'] }, 'permisos'],
    [{ permisos: ['*'] }, 'permisos'],
  ]
  for (const [cambio, campo] of casos) {
    const r = await pedir(`${base}/usuarios`, 'POST', { ...NUEVO, ...cambio })
    assert.ok(r.status >= 400 && r.status < 500, JSON.stringify(cambio))
    assert.equal(r.cuerpo.campo, campo, JSON.stringify(cambio))
  }
})

test('editar: cambia contraseña, nombre y pantallas; la contraseña vacía no se toca', async t => {
  const { base } = await levantar(t)
  await pedir(`${base}/usuarios`, 'POST', NUEVO)
  const editado = await pedir(`${base}/usuarios/luis_03`, 'PUT', { nombre: 'Luis Pérez', contrasena: '', permisos: ['/exportar'] })
  assert.equal(editado.status, 200)
  assert.deepEqual(editado.cuerpo, { usuario: 'Luis_03', nombre: 'Luis Pérez', rol: 'operador', permisos: ['/exportar'] })
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Luis_03', contrasena: 'arepa99' })).status, 200)

  assert.equal((await pedir(`${base}/usuarios/Luis_03`, 'PUT', { contrasena: 'tequeno' })).status, 200)
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Luis_03', contrasena: 'arepa99' })).status, 401)
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Luis_03', contrasena: 'tequeno' })).status, 200)
  // Su propia contraseña no cuenta como repetida
  assert.equal((await pedir(`${base}/usuarios/Luis_03`, 'PUT', { contrasena: 'tequeno' })).status, 200)
})

test('editar: no deja poner la contraseña de otro ni darle el gestor a un operador', async t => {
  const { base } = await levantar(t)
  const repetida = await pedir(`${base}/usuarios/Marta_02`, 'PUT', { contrasena: '1234' })
  assert.equal(repetida.status, 409)
  assert.equal(repetida.cuerpo.campo, 'contrasena')
  assert.equal((await pedir(`${base}/usuarios/Marta_02`, 'PUT', { permisos: ['/usuarios'] })).status, 403)
  assert.equal((await pedir(`${base}/usuarios/Nadie`, 'PUT', { nombre: 'X' })).status, 404)
})

test('administrador: siempre conserva todas las pantallas y no se puede eliminar', async t => {
  const { base } = await levantar(t)
  const editado = await pedir(`${base}/usuarios/Cesar_01`, 'PUT', { permisos: ['/'], contrasena: 'nueva1' })
  assert.deepEqual(editado.cuerpo.permisos, ['*'])
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Cesar_01', contrasena: 'nueva1' })).status, 200)
  assert.equal((await pedir(`${base}/usuarios/Cesar_01`, 'DELETE')).status, 403)
})

test('eliminar: el usuario deja de existir y ya no inicia sesión', async t => {
  const { base } = await levantar(t)
  const r = await pedir(`${base}/usuarios/marta_02`, 'DELETE')
  assert.deepEqual(r.cuerpo, { usuario: 'Marta_02' })
  assert.equal((await pedir(`${base}/sesion`, 'POST', { usuario: 'Marta_02', contrasena: '5678' })).status, 401)
  assert.equal((await pedir(`${base}/usuarios/Marta_02`, 'DELETE')).status, 404)
})

test('los cambios de usuarios se conservan al reabrir la base (no se vuelve a sembrar)', t => {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-usuarios-'))
  t.after(() => rmSync(carpeta, { recursive: true, force: true }))
  const dbPath = join(carpeta, 'depanas.db')
  let db = abrirDB(dbPath, SCHEMA)
  db.prepare("DELETE FROM usuarios WHERE usuario = 'Marta_02'").run()
  db.close()
  db = abrirDB(dbPath, SCHEMA)
  const usuarios = db.prepare('SELECT usuario FROM usuarios').all().map(u => u.usuario)
  db.close()
  assert.deepEqual(usuarios, ['Cesar_01'])
})
