/**
 * routes/usuarios.js — Usuarios (Gestor de usuarios), inicio de sesión y requisitos de
 * contraseña. Solo traduce HTTP ↔ DAO; los datos y las reglas viven en dao/usuarios.js y
 * las sesiones en sesiones.js.
 *
 *   POST   /api/sesion                  → { usuario, contrasena } → { ...usuario público, token }, 401 o
 *                                          429 tras varios intentos fallidos (ver sesiones.js)
 *   DELETE /api/sesion                  → cierra la sesión del token
 *   GET    /api/usuarios                → [usuario público] (nunca la contraseña)
 *   POST   /api/usuarios                → crea { usuario, nombre, contrasena, rol, permisos?, funciones? }
 *   PUT    /api/usuarios/:usuario       → cambia { nombre?, contrasena?, rol?, permisos?, funciones? }
 *   DELETE /api/usuarios/:usuario       → elimina un usuario (el administrador no se elimina)
 *   GET    /api/requisitos-contrasena   → { minimo, mayuscula, minuscula, numero, especial }
 *   PUT    /api/requisitos-contrasena   → los cambia (los usa toda contraseña nueva)
 *
 * Toda la API (salvo /api/health y entrar) exige sesión, y estas rutas son solo del
 * administrador (app.js, permisos.js). Los errores de un campo llevan { error, campo }.
 */

import { Router } from 'express'
import { publico, usuariosDAO } from '../dao/usuarios.js'
import { MAX_INTENTOS } from '../sesiones.js'
import { enviarError, responder } from './responder.js'

export { publico }

/** Registro de un usuario (sin distinguir mayúsculas). Lo usa app.js en cada petición */
export const buscar = (db, usuario) => usuariosDAO(db).buscar(usuario)

/** Token de `Authorization: Bearer <token>` */
export const tokenDe = req => (req.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()

const texto = v => (typeof v === 'string' ? v.trim() : '')

export function crearRutasUsuarios(getDb, sesiones) {
  const router = Router()
  const dao = () => usuariosDAO(getDb())

  router.get('/', (_req, res) => responder(res, () => dao().listar()))
  router.post('/', (req, res) => responder(res, () => dao().crear(req.body), 201))
  router.put('/:usuario', (req, res) => responder(res, () => dao().editar(req.params.usuario, req.body)))
  router.delete('/:usuario', (req, res) => responder(res, () => {
    const usuario = dao().eliminar(req.params.usuario)
    // Si estaba dentro, su sesión deja de servir
    sesiones?.cerrarDeUsuario(usuario)
    return { usuario }
  }))

  return router
}

export function crearRutasRequisitos(getDb) {
  const router = Router()
  router.get('/', (_req, res) => responder(res, () => usuariosDAO(getDb()).requisitos()))
  router.put('/', (req, res) => responder(res, () => usuariosDAO(getDb()).guardarRequisitos(req.body)))
  return router
}

export function crearRutaSesion(getDb, sesiones) {
  const router = Router()
  router.post('/', (req, res) => {
    const usuario = texto(req.body?.usuario)
    const restante = sesiones.bloqueoRestante(usuario)
    if (restante > 0) {
      const minutos = Math.ceil(restante / 60_000)
      return res.status(429).json({ error: `Demasiados intentos. Espera ${minutos} min y vuelve a intentarlo.`, minutos })
    }
    try {
      const registro = usuariosDAO(getDb()).autenticar(usuario, req.body?.contrasena)
      if (!registro) {
        sesiones.registrarFallo(usuario)
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos', intentos: MAX_INTENTOS })
      }
      sesiones.registrarExito(usuario)
      res.json({ ...publico(registro), token: sesiones.abrir(registro.usuario) })
    } catch (err) {
      enviarError(res, err)
    }
  })
  router.delete('/', (req, res) => {
    sesiones.cerrar(tokenDe(req))
    res.status(204).end()
  })
  return router
}
