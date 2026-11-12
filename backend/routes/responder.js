/**
 * routes/responder.js — Convierte lo que devuelve o lanza un DAO en la respuesta HTTP.
 *
 * - Lo que devuelve fn va como JSON con `status`.
 * - Un ErrorDatos (dao/errores.js) va con su código, su mensaje y, si lo tiene, su `campo`.
 * - Cualquier otro error es inesperado: se registra en la consola del servidor y el usuario
 *   recibe un 500 con un mensaje genérico (sin rutas, SQL ni detalles internos).
 */

import { ErrorDatos } from '../dao/errores.js'

export const MENSAJE_ERROR_INTERNO = 'Ocurrió un error inesperado en el servidor. Inténtalo de nuevo.'

export function enviarError(res, err) {
  if (err instanceof ErrorDatos) {
    return res.status(err.status).json(err.campo ? { error: err.message, campo: err.campo } : { error: err.message })
  }
  console.error('[De Panas] Error inesperado:', err)
  return res.status(500).json({ error: MENSAJE_ERROR_INTERNO })
}

export function responder(res, fn, status = 200) {
  try {
    const resultado = fn()
    if (status === 204) return res.status(204).end()
    return res.status(status).json(resultado)
  } catch (err) {
    return enviarError(res, err)
  }
}
