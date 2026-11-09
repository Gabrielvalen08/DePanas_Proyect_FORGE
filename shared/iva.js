/**
 * shared/iva.js
 * IVA de una compra. La tasa es fija y se suma encima: los montos de las filas van
 * sin IVA, IVA = subtotal × tasa (a centavos) y total = subtotal + IVA.
 * Lo usan igual el backend y el frontend. Una compra guarda el IVA en dinero (`iva`);
 * sin IVA, o en compras y respaldos anteriores a esto, vale 0.
 */

export const TASA_IVA = 0.13

export const aCentavos = valor => Math.round((Number(valor) + Number.EPSILON) * 100) / 100

/** IVA de un subtotal, a centavos */
export const calcularIva = subtotal => aCentavos(Number(subtotal) * TASA_IVA)

/** El campo `iva` de una compra como número (lo que falte o no sirva cuenta como 0) */
export const ivaDe = compra => {
  const iva = Number(compra?.iva)
  return Number.isFinite(iva) && iva > 0 ? iva : 0
}

/** ¿Sirve como `iva` de una compra? Debe ser un número mayor o igual a 0 */
export const ivaValido = valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
