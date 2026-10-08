/**
 * contrasenas.js — Hash de contraseñas con PBKDF2-SHA256 (node:crypto).
 * Formato: pbkdf2$<iteraciones>$<sal hex>$<hash hex>. El modo local del
 * frontend usa el mismo formato con WebCrypto, así los hashes sirven en ambos.
 */

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto'

const ITERACIONES = 100_000
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
