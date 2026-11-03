/**
 * Ayudantes de las pruebas del backend. Impórtalo antes que ../app.js:
 *  - Baja las iteraciones del hash (DEPANAS_ITERACIONES_HASH) para que las pruebas no tarden;
 *    la app real usa siempre 600 000 (contrasenas.js).
 *  - La API exige sesión: `entrar(base)` inicia sesión (por defecto como el administrador) y
 *    guarda el token de ese servidor; `cabeceras(url)` lo agrega a cada petición.
 */

process.env.DEPANAS_ITERACIONES_HASH ??= '1000'

export const CLAVE_CESAR = 'DePanas#2026'

// Un token por servidor: algunas pruebas levantan dos a la vez
const tokens = new Map()
const origen = url => new URL(url).origin

/** Inicia sesión en el servidor de `base` y guarda su token. Devuelve el token */
export async function entrar(base, usuario = 'Cesar_01', contrasena = CLAVE_CESAR) {
  const res = await fetch(`${base}/sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena }),
  })
  const cuerpo = await res.json()
  if (!res.ok) throw new Error(`No se pudo entrar como ${usuario}: ${cuerpo.error}`)
  tokens.set(origen(base), cuerpo.token)
  return cuerpo.token
}

/** Cabeceras con el token del servidor de `url` (si ya se entró) más las que se pasen */
export function cabeceras(url, extra = {}) {
  const token = tokens.get(origen(url))
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}
