/**
 * shared/unidades.js — Unidades en que se compra un artículo. Cada artículo guarda la suya en
 * el Catálogo (se elige en su formulario, con el lápiz) y cada compra la toma de ahí. La usan
 * igual el backend (dao/catalogo.js, db.js) y el frontend (services/api.js, BloqueCompra,
 * AsignarMaterial).
 *
 * «gr» antes se escribía «g»: normalizarUnidad lo cambia en lo que llega (compras viejas,
 * respaldos) y db.js lo migra en la base. «otros» es para lo que no se mide con una unidad.
 */

export const UNIDADES = ['lb', 'kg', 'gr', 'oz', 'galon', 'litro', 'ml', 'unidad', 'caja', 'bolsa', 'otros']

/** Unidades que cambiaron de nombre: lo guardado con la vieja pasa a la nueva */
export const UNIDADES_RENOMBRADAS = { g: 'gr' }

/** La unidad limpia y al día («g» → «gr»); '' si no viene */
export function normalizarUnidad(unidad) {
  const limpia = typeof unidad === 'string' ? unidad.trim() : ''
  return UNIDADES_RENOMBRADAS[limpia.toLowerCase()] ?? limpia
}

/** ¿Es una de las unidades de la lista? */
export const unidadValida = unidad => UNIDADES.includes(normalizarUnidad(unidad))

export const UNIDAD_NO_VALIDA = 'Elige una unidad de la lista'
