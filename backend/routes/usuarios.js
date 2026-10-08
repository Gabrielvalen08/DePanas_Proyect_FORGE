/**
 * routes/usuarios.js
 * Usuarios del sistema (Gestor de usuarios) e inicio de sesión.
 *
 *   POST   /api/sesion              → { usuario, contrasena } → { usuario, nombre, rol, permisos } o 401
 *   GET    /api/usuarios            → [{ usuario, nombre, rol, permisos }] (nunca la contraseña)
 *   POST   /api/usuarios            → crea un usuario { usuario, nombre, contrasena, permisos }
 *   PUT    /api/usuarios/:usuario   → cambia { nombre?, contrasena?, permisos? }
 *   DELETE /api/usuarios/:usuario   → elimina un usuario (el administrador no se elimina)
 *
 * Reglas: no se repite el usuario (sin distinguir mayúsculas) ni la contraseña;
 * solo hay un administrador (Cesar_01, con permisos ["*"]); los demás son
 * operadores y nunca reciben el Gestor de usuarios.
 * Los errores de un campo llevan { error, campo } para marcarlo en el formulario.
 */

import { Router } from 'express'
import { enTransaccion } from '../db.js'
import { hashear, verificar } from '../contrasenas.js'
import { RUTAS_ASIGNABLES, RUTA_USUARIOS } from '../db/usuarios.js'

const FORMATO_USUARIO = /^[A-Za-z0-9_.-]{3,30}$/
const MIN_CONTRASENA = 4

const texto = v => (typeof v === 'string' ? v.trim() : '')

/** Error con código HTTP y, si aplica, el campo del formulario que lo causó */
function fallo(status, mensaje, campo) {
  return Object.assign(new Error(mensaje), { status, campo })
}

function publico(fila) {
  return { usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol, permisos: JSON.parse(fila.permisos) }
}

function buscar(db, usuario) {
  return db.prepare('SELECT * FROM usuarios WHERE usuario = ? COLLATE NOCASE').get(usuario)
}

function validarNombre(nombre) {
  if (!nombre) throw fallo(400, 'Escribe el nombre de la persona', 'nombre')
  if (nombre.length > 60) throw fallo(400, 'El nombre es muy largo (máximo 60 caracteres)', 'nombre')
}

function validarContrasena(db, contrasena, excepto) {
  if (contrasena.length < MIN_CONTRASENA) {
    throw fallo(400, `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres`, 'contrasena')
  }
  // Los hashes llevan sal: la única forma de saber si se repite es probarla contra cada uno
  const otros = db.prepare('SELECT contrasena FROM usuarios WHERE usuario != ? COLLATE NOCASE').all(excepto ?? '')
  if (otros.some(o => verificar(contrasena, o.contrasena))) {
    throw fallo(409, 'Esa contraseña ya la usa otro usuario. Elige una diferente', 'contrasena')
  }
}

/** Pantallas sin repetir, todas asignables y al menos una */
function validarPermisos(permisos) {
  if (!Array.isArray(permisos)) throw fallo(400, 'Elige al menos una pantalla', 'permisos')
  const unicos = [...new Set(permisos)]
  if (unicos.includes(RUTA_USUARIOS) || unicos.includes('*')) {
    throw fallo(403, 'El Gestor de usuarios es solo del administrador', 'permisos')
  }
  const desconocida = unicos.find(p => !RUTAS_ASIGNABLES.includes(p))
  if (desconocida !== undefined) throw fallo(400, `La pantalla «${desconocida}» no existe`, 'permisos')
  if (unicos.length === 0) throw fallo(400, 'Elige al menos una pantalla', 'permisos')
  // En el orden del menú
  return RUTAS_ASIGNABLES.filter(r => unicos.includes(r))
}

export function crearRutasUsuarios(getDb) {
  const router = Router()

  /** Ejecuta fn y responde; los errores con status se devuelven tal cual */
  function responder(res, fn, status = 200) {
    try {
      res.status(status).json(fn(getDb()))
    } catch (err) {
      res.status(err.status ?? 500).json({ error: err.message, ...(err.campo ? { campo: err.campo } : {}) })
    }
  }

  router.get('/', (_req, res) => responder(res, db =>
    db.prepare('SELECT * FROM usuarios ORDER BY rol = \'admin\' DESC, usuario COLLATE NOCASE').all().map(publico)
  ))

  router.post('/', (req, res) => responder(res, db => enTransaccion(db, () => {
    const usuario = texto(req.body?.usuario)
    const nombre = texto(req.body?.nombre)
    const contrasena = texto(req.body?.contrasena)
    if (!FORMATO_USUARIO.test(usuario)) {
      throw fallo(400, 'El usuario lleva de 3 a 30 letras, números, _ . o - (sin espacios)', 'usuario')
    }
    const existente = buscar(db, usuario)
    if (existente) throw fallo(409, `Ya existe el usuario «${existente.usuario}». Elige otro`, 'usuario')
    validarNombre(nombre)
    validarContrasena(db, contrasena)
    const permisos = validarPermisos(req.body?.permisos)

    db.prepare("INSERT INTO usuarios (usuario, nombre, contrasena, rol, permisos) VALUES (?, ?, ?, 'operador', ?)")
      .run(usuario, nombre, hashear(contrasena), JSON.stringify(permisos))
    return publico(buscar(db, usuario))
  }), 201))

  router.put('/:usuario', (req, res) => responder(res, db => enTransaccion(db, () => {
    const registro = buscar(db, texto(req.params.usuario))
    if (!registro) throw fallo(404, `No existe el usuario «${req.params.usuario}»`)

    if (req.body?.nombre !== undefined) {
      const nombre = texto(req.body.nombre)
      validarNombre(nombre)
      db.prepare('UPDATE usuarios SET nombre = ? WHERE id = ?').run(nombre, registro.id)
    }
    // Contraseña vacía o ausente: se deja la que tenía
    const contrasena = texto(req.body?.contrasena)
    if (contrasena) {
      validarContrasena(db, contrasena, registro.usuario)
      db.prepare('UPDATE usuarios SET contrasena = ? WHERE id = ?').run(hashear(contrasena), registro.id)
    }
    // El administrador siempre entra a todo: sus permisos no se editan
    if (req.body?.permisos !== undefined && registro.rol !== 'admin') {
      const permisos = validarPermisos(req.body.permisos)
      db.prepare('UPDATE usuarios SET permisos = ? WHERE id = ?').run(JSON.stringify(permisos), registro.id)
    }
    return publico(buscar(db, registro.usuario))
  })))

  router.delete('/:usuario', (req, res) => responder(res, db => {
    const registro = buscar(db, texto(req.params.usuario))
    if (!registro) throw fallo(404, `No existe el usuario «${req.params.usuario}»`)
    if (registro.rol === 'admin') throw fallo(403, 'El administrador no se puede eliminar')
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(registro.id)
    return { usuario: registro.usuario }
  }))

  return router
}

export function crearRutaSesion(getDb) {
  const router = Router()
  router.post('/', (req, res) => {
    const registro = buscar(getDb(), texto(req.body?.usuario))
    const contrasena = texto(req.body?.contrasena)
    if (!registro || !contrasena || !verificar(contrasena, registro.contrasena)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
    }
    res.json(publico(registro))
  })
  return router
}
