/**
 * sesiones.js — Sesiones de la API (en memoria) y límite de intentos al entrar.
 *
 * Al entrar, POST /api/sesion abre una sesión y devuelve un token al azar; cada
 * petición lo manda en `Authorization: Bearer <token>`. La sesión vence tras
 * DURACION_SESION_MS sin uso (cada petición la renueva). Viven en memoria: reiniciar
 * el servidor obliga a volver a entrar, que es lo esperado en una app de escritorio.
 *
 * Tras MAX_INTENTOS contraseñas incorrectas seguidas, ese usuario espera BLOQUEO_MS.
 * Cuenta igual para un usuario que no existe, para no revelar cuáles existen.
 */

import { randomBytes } from 'crypto'

export const DURACION_SESION_MS = 8 * 60 * 60 * 1000 // 8 horas sin uso
export const MAX_INTENTOS = 5
export const BLOQUEO_MS = 5 * 60 * 1000 // 5 minutos

const clave = usuario => String(usuario ?? '').trim().toLowerCase()

/** @param {{ ahora?: () => number }} [opciones] ahora: reloj (las pruebas lo adelantan) */
export function crearSesiones({ ahora = () => Date.now() } = {}) {
  const sesiones = new Map() // token → { usuario, ultimoUso }
  const fallos = new Map()   // usuario en minúsculas → { cuenta, hasta }

  return {
    /** Abre una sesión para `usuario` y devuelve su token */
    abrir(usuario) {
      const token = randomBytes(32).toString('base64url')
      sesiones.set(token, { usuario, ultimoUso: ahora() })
      return token
    },

    /** La sesión del token (y la renueva) o null si no existe o venció */
    leer(token) {
      const sesion = token ? sesiones.get(token) : undefined
      if (!sesion) return null
      if (ahora() - sesion.ultimoUso > DURACION_SESION_MS) {
        sesiones.delete(token)
        return null
      }
      sesion.ultimoUso = ahora()
      return sesion
    },

    cerrar(token) {
      sesiones.delete(token)
    },

    /** Cierra todas las sesiones de un usuario (p. ej. al eliminarlo) */
    cerrarDeUsuario(usuario) {
      for (const [token, sesion] of sesiones) {
        if (clave(sesion.usuario) === clave(usuario)) sesiones.delete(token)
      }
    },

    /** Milisegundos que le faltan al bloqueo de `usuario` (0 si puede intentar) */
    bloqueoRestante(usuario) {
      const f = fallos.get(clave(usuario))
      return f?.hasta && f.hasta > ahora() ? f.hasta - ahora() : 0
    },

    /** Una contraseña incorrecta más; al llegar a MAX_INTENTOS, bloquea */
    registrarFallo(usuario) {
      const k = clave(usuario)
      const previo = fallos.get(k)
      const cuenta = (previo && !(previo.hasta && previo.hasta <= ahora()) ? previo.cuenta : 0) + 1
      fallos.set(k, cuenta >= MAX_INTENTOS ? { cuenta: 0, hasta: ahora() + BLOQUEO_MS } : { cuenta, hasta: 0 })
    },

    /** Entró bien: se olvidan sus intentos fallidos */
    registrarExito(usuario) {
      fallos.delete(clave(usuario))
    },
  }
}
