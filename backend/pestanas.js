/**
 * pestanas.js — Versión del .zip: apagar el sistema cuando se cierra la última pestaña con sesión.
 *
 * Cada pestaña se registra al entrar y avisa cuando la página se va (pagehide). Esto también
 * pasa al recargar con F5, y el servidor no puede distinguirlo, así que espera unos segundos
 * antes de apagar: si la página vuelve (GET /api/health al cargar), se cancela.
 *
 * Una pestaña en la pantalla de contraseña no cuenta: la de sesión vencida o cerrada se descarta.
 */

export const ESPERA_APAGADO_MS = 5000

/**
 * @param {Object} opciones
 * @param {() => void} opciones.apagar
 * @param {(token: string) => boolean} opciones.sesionVigente
 * @param {number} [opciones.esperaMs] las pruebas usan menos
 */
export function crearPestanas({ apagar, sesionVigente, esperaMs = ESPERA_APAGADO_MS }) {
  const pestanas = new Map() // id → token de su sesión
  let temporizador = null

  function cancelar() {
    clearTimeout(temporizador)
    temporizador = null
  }

  function hayConSesion() {
    for (const [id, token] of pestanas) {
      if (!sesionVigente(token)) pestanas.delete(id)
    }
    return pestanas.size > 0
  }

  return {
    /** La página cargó (o volvió): no se apaga */
    cancelar,

    /** Una pestaña entró con sesión */
    registrar(id, token) {
      cancelar()
      pestanas.set(id, token)
    },

    /** Una pestaña se fue: si era la última con sesión, se apaga tras la espera */
    cerrar(id) {
      pestanas.delete(id)
      if (hayConSesion() || temporizador) return
      temporizador = setTimeout(() => {
        temporizador = null
        // Pudo entrar otra mientras tanto
        if (!hayConSesion()) apagar()
      }, esperaMs)
    },
  }
}
