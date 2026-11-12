/**
 * dao/errores.js — Excepciones de la capa de datos (patrón DAO).
 *
 * Un DAO nunca responde HTTP: valida, lee o escribe y, si algo no se puede, lanza un
 * ErrorDatos con el código que le corresponde y, si es de un campo del formulario, su
 * `campo`. Las rutas lo convierten en la respuesta (routes/responder.js). Cualquier otro
 * error (SQLite, disco…) es inesperado: se registra y el usuario ve un mensaje genérico,
 * nunca el detalle técnico.
 */

export class ErrorDatos extends Error {
  /**
   * @param {number} status  400 dato no válido, 403 no permitido, 404 no existe, 409 ya existe o choca
   * @param {string} mensaje texto para el usuario
   * @param {string} [campo] campo del formulario que lo causó
   */
  constructor(status, mensaje, campo) {
    super(mensaje)
    this.name = 'ErrorDatos'
    this.status = status
    if (campo) this.campo = campo
  }
}

export const noValido = (mensaje, campo) => new ErrorDatos(400, mensaje, campo)
export const prohibido = (mensaje = 'No tienes permiso para hacer esto.', campo) => new ErrorDatos(403, mensaje, campo)
export const noEncontrado = (mensaje, campo) => new ErrorDatos(404, mensaje, campo)
export const conflicto = (mensaje, campo) => new ErrorDatos(409, mensaje, campo)

/** Convierte en ErrorDatos 400 un error de validación de shared/ (que solo trae mensaje y, a veces, campo) */
export function comoNoValido(error) {
  if (error instanceof ErrorDatos) return error
  return noValido(error.message, error.campo)
}
