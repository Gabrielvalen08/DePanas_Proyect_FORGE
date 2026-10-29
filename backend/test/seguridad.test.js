/**
 * Seguridad de la API: sesión obligatoria, permisos por pantalla y función, límite de
 * intentos al entrar, vencimiento de la sesión y recálculo de los hashes viejos.
 * Cada test usa una base temporal propia.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pbkdf2Sync, randomBytes } from 'crypto'
import { DatabaseSync } from 'node:sqlite'
import { CLAVE_CESAR } from './ayudantes.js'
import { crearApp } from '../app.js'
import { ITERACIONES } from '../contrasenas.js'
import { BLOQUEO_MS, DURACION_SESION_MS, MAX_INTENTOS, crearSesiones } from '../sesiones.js'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql')

/** Servidor con base temporal y un reloj que la prueba puede adelantar */
async function levantar(t) {
  const carpeta = mkdtempSync(join(tmpdir(), 'depanas-seguridad-'))
  const dbPath = join(carpeta, 'depanas.db')
  const reloj = { ahora: 1_000_000 }
  const { app, cerrar } = crearApp({ dbPath, schemaPath: SCHEMA, sesiones: crearSesiones({ ahora: () => reloj.ahora }) })
  const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
  t.after(async () => {
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    cerrar()
    rmSync(carpeta, { recursive: true, force: true })
  })
  return { base: `http://localhost:${servidor.address().port}/api`, dbPath, reloj }
}

async function pedir(url, { metodo = 'GET', cuerpo, token } = {}) {
  const res = await fetch(url, {
    method: metodo,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  // /db/exportar devuelve el archivo .db, no JSON
  const json = (res.headers.get('content-type') ?? '').includes('application/json')
  return { status: res.status, cuerpo: json ? await res.json() : null }
}

const entrar = (base, usuario, contrasena) => pedir(`${base}/sesion`, { metodo: 'POST', cuerpo: { usuario, contrasena } })

async function tokenDe(base, usuario, contrasena) {
  const r = await entrar(base, usuario, contrasena)
  assert.equal(r.status, 200, `${usuario} entra`)
  return r.cuerpo.token
}

const COMPRA = {
  proveedor: 'Selectos', fecha: '2026-10-01',
  materiales: [{ material: 'Tocino La Rioja', cantidad: 1, unidad: 'lb', monto: 2.69 }],
}

test('sin sesión la API responde 401 (salvo health y entrar); con un token inventado, también', async t => {
  const { base } = await levantar(t)
  assert.equal((await pedir(`${base}/health`)).status, 200)
  for (const ruta of ['/compras', '/catalogo', '/usuarios', '/requisitos-contrasena', '/db/exportar', '/ingresos']) {
    assert.equal((await pedir(`${base}${ruta}`)).status, 401, ruta)
  }
  // Lo que más importa: nadie cambia la contraseña del administrador sin entrar
  const robo = await pedir(`${base}/usuarios/Cesar_01`, { metodo: 'PUT', cuerpo: { contrasena: 'Robada#2026' } })
  assert.equal(robo.status, 401)
  assert.equal((await entrar(base, 'Cesar_01', CLAVE_CESAR)).status, 200)
  assert.equal((await pedir(`${base}/compras`, { token: 'inventado' })).status, 401)
})

test('permisos: un empleado registra y corrige compras, pero no elimina, ni toca el catálogo ni los usuarios', async t => {
  const { base } = await levantar(t)
  const admin = await tokenDe(base, 'Cesar_01', CLAVE_CESAR)
  await pedir(`${base}/usuarios`, {
    metodo: 'POST', token: admin, cuerpo: { usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Tequeño#1', rol: 'empleado' },
  })
  const ana = await tokenDe(base, 'Ana_04', 'Tequeño#1')

  const compra = await pedir(`${base}/compras`, { metodo: 'POST', token: ana, cuerpo: COMPRA })
  assert.equal(compra.status, 201)
  const id = compra.cuerpo.id
  assert.equal((await pedir(`${base}/compras`, { token: ana })).status, 200)
  assert.equal((await pedir(`${base}/catalogo`, { token: ana })).status, 200, 'los autocompletados necesitan el catálogo')
  assert.equal((await pedir(`${base}/compras/${id}`, { metodo: 'PUT', token: ana, cuerpo: COMPRA })).status, 200)

  assert.equal((await pedir(`${base}/compras/${id}`, { metodo: 'DELETE', token: ana })).status, 403)
  assert.equal((await pedir(`${base}/catalogo/proveedor`, { metodo: 'POST', token: ana, cuerpo: { nombre: 'Otro' } })).status, 403)
  assert.equal((await pedir(`${base}/catalogo/proveedor/Selectos`, { metodo: 'DELETE', token: ana })).status, 403)
  assert.equal((await pedir(`${base}/db/exportar`, { token: ana })).status, 403)
  assert.equal((await pedir(`${base}/db/importar-json`, { metodo: 'POST', token: ana, cuerpo: { compras: [] } })).status, 403)
  assert.equal((await pedir(`${base}/usuarios`, { token: ana })).status, 403)
  assert.equal((await pedir(`${base}/usuarios/Cesar_01`, { metodo: 'PUT', token: ana, cuerpo: { contrasena: 'Robada#2026' } })).status, 403)

  // El administrador sí elimina
  assert.equal((await pedir(`${base}/compras/${id}`, { metodo: 'DELETE', token: admin })).status, 204)
})

test('permisos: un operador tiene todo menos el Gestor de usuarios y los requisitos de contraseña', async t => {
  const { base } = await levantar(t)
  const marta = await tokenDe(base, 'Marta_02', '5678')
  assert.equal((await pedir(`${base}/db/exportar`, { token: marta })).status, 200)
  assert.equal((await pedir(`${base}/catalogo/proveedor`, { metodo: 'POST', token: marta, cuerpo: { nombre: 'La Colonia' } })).status, 200)
  assert.equal((await pedir(`${base}/usuarios`, { token: marta })).status, 403)
  assert.equal((await pedir(`${base}/requisitos-contrasena`, { metodo: 'PUT', token: marta, cuerpo: { minimo: 4 } })).status, 403)
})

test('permisos: quitarle una pantalla a un usuario se aplica en el acto, sin que vuelva a entrar', async t => {
  const { base } = await levantar(t)
  const admin = await tokenDe(base, 'Cesar_01', CLAVE_CESAR)
  const marta = await tokenDe(base, 'Marta_02', '5678')
  assert.equal((await pedir(`${base}/db/exportar`, { token: marta })).status, 200)
  await pedir(`${base}/usuarios/Marta_02`, { metodo: 'PUT', token: admin, cuerpo: { permisos: ['/', '/compras'] } })
  assert.equal((await pedir(`${base}/db/exportar`, { token: marta })).status, 403)

  // Y si lo eliminan, su sesión deja de servir
  await pedir(`${base}/usuarios/Marta_02`, { metodo: 'DELETE', token: admin })
  assert.equal((await pedir(`${base}/compras`, { token: marta })).status, 401)
})

test(`intentos: tras ${MAX_INTENTOS} contraseñas malas el usuario espera; uno que no existe recibe lo mismo`, async t => {
  const { base, reloj } = await levantar(t)
  for (let i = 0; i < MAX_INTENTOS; i++) {
    assert.equal((await entrar(base, 'Cesar_01', 'mala')).status, 401)
  }
  // Bloqueado: ni la contraseña correcta entra
  const bloqueado = await entrar(base, 'cesar_01', CLAVE_CESAR)
  assert.equal(bloqueado.status, 429)
  assert.equal(bloqueado.cuerpo.minutos, 5)
  // Otro usuario no queda bloqueado
  assert.equal((await entrar(base, 'Marta_02', '5678')).status, 200)

  reloj.ahora += BLOQUEO_MS + 1
  assert.equal((await entrar(base, 'Cesar_01', CLAVE_CESAR)).status, 200)

  for (let i = 0; i < MAX_INTENTOS; i++) await entrar(base, 'Nadie_99', 'x')
  assert.equal((await entrar(base, 'Nadie_99', 'x')).status, 429, 'no se revela si el usuario existe')
})

test('intentos: entrar bien reinicia la cuenta de fallos', async t => {
  const { base } = await levantar(t)
  for (let i = 0; i < MAX_INTENTOS - 1; i++) await entrar(base, 'Marta_02', 'mala')
  assert.equal((await entrar(base, 'Marta_02', '5678')).status, 200)
  for (let i = 0; i < MAX_INTENTOS - 1; i++) await entrar(base, 'Marta_02', 'mala')
  assert.equal((await entrar(base, 'Marta_02', '5678')).status, 200)
})

test('sesión: vence tras 8 horas sin uso, cada petición la renueva y cerrar sesión la invalida', async t => {
  const { base, reloj } = await levantar(t)
  const token = await tokenDe(base, 'Marta_02', '5678')
  reloj.ahora += DURACION_SESION_MS - 1000
  assert.equal((await pedir(`${base}/compras`, { token })).status, 200, 'casi 8 h: sigue y se renueva')
  reloj.ahora += DURACION_SESION_MS - 1000
  assert.equal((await pedir(`${base}/compras`, { token })).status, 200, 'renovada en la petición anterior')
  reloj.ahora += DURACION_SESION_MS + 1
  assert.equal((await pedir(`${base}/compras`, { token })).status, 401, 'más de 8 h sin uso: vencida')

  const otro = await tokenDe(base, 'Marta_02', '5678')
  assert.equal((await pedir(`${base}/sesion`, { metodo: 'DELETE', token: otro })).status, 204)
  assert.equal((await pedir(`${base}/compras`, { token: otro })).status, 401)
})

test('hash: una contraseña guardada con menos iteraciones se recalcula al entrar', async t => {
  const { base, dbPath } = await levantar(t)
  const sal = randomBytes(16)
  const viejo = `pbkdf2$500$${sal.toString('hex')}$${pbkdf2Sync('5678', sal, 500, 32, 'sha256').toString('hex')}`
  const db = new DatabaseSync(dbPath)
  db.prepare("UPDATE usuarios SET contrasena = ? WHERE usuario = 'Marta_02'").run(viejo)
  db.close()

  assert.equal((await entrar(base, 'Marta_02', '5678')).status, 200)
  const lectura = new DatabaseSync(dbPath)
  const guardado = lectura.prepare("SELECT contrasena FROM usuarios WHERE usuario = 'Marta_02'").get().contrasena
  lectura.close()
  assert.ok(guardado.startsWith(`pbkdf2$${ITERACIONES}$`), guardado)
  assert.equal((await entrar(base, 'Marta_02', '5678')).status, 200, 'sigue entrando con el hash nuevo')
})

test('la API nunca devuelve el hash de una contraseña', async t => {
  const { base } = await levantar(t)
  const admin = await tokenDe(base, 'Cesar_01', CLAVE_CESAR)
  const usuarios = await pedir(`${base}/usuarios`, { token: admin })
  assert.ok(!JSON.stringify(usuarios.cuerpo).includes('pbkdf2'))
  assert.ok(!JSON.stringify((await entrar(base, 'Marta_02', '5678')).cuerpo).includes('pbkdf2'))
})
