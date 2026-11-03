/**
 * contrasenas.js — Hash de contraseñas con PBKDF2-SHA256 (node:crypto).
 * Formato: pbkdf2$<iteraciones>$<sal hex>$<hash hex>. El modo local del
 * frontend usa el mismo formato con WebCrypto, así los hashes sirven en ambos.
 *
 * 600 000 iteraciones es lo que recomienda OWASP para PBKDF2-SHA256. Los hashes con
 * menos (los de antes) se siguen aceptando y se recalculan al entrar (necesitaRehash).
 * DEPANAS_ITERACIONES_HASH baja el costo solo en las pruebas (test/ayudantes.js).
 */

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto'

export const ITERACIONES = Number(process.env.DEPANAS_ITERACIONES_HASH) || 600_000
const LARGO = 32

export function hashear(contrasena) {
  const sal = randomBytes(16)
  const hash = pbkdf2Sync(contrasena, sal, ITERACIONES, LARGO, 'sha256')
  return `pbkdf2$${ITERACIONES}$${sal.toString('hex')}$${hash.toString('hex')}`
}

/** true si `contrasena` corresponde al hash guardado */
export function verificar(contrasena, guardado) {
  const [algoritmo, iteraciones, sal, hash] = String(guardado).split('$')
  if (algoritmo !== 'pbkdf2' || !sal || !hash) return false
  const esperado = Buffer.from(hash, 'hex')
  const calculado = pbkdf2Sync(contrasena, Buffer.from(sal, 'hex'), Number(iteraciones), esperado.length, 'sha256')
  return timingSafeEqual(calculado, esperado)
}

/** true si el hash guardado usa menos iteraciones que las actuales (se recalcula al entrar) */
export function necesitaRehash(guardado) {
  return Number(String(guardado).split('$')[1]) < ITERACIONES
}
