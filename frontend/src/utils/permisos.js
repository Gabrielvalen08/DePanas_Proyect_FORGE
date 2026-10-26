/**
 * permisos.js — Qué pantallas y qué funciones tiene cada usuario.
 *
 *  - El administrador (rol 'admin', permisos ['*']) entra a todas las pantallas,
 *    también a las que se creen en el futuro, puede hacer todo y es el único que ve
 *    el Gestor de usuarios.
 *  - Los demás usuarios entran solo a las rutas de su lista de permisos y, dentro de
 *    ellas, hacen solo las funciones de su lista (p. ej. 'compras.eliminar').
 *
 * Las pantallas, funciones y roles viven en shared/usuarios.js (los usa igual el backend).
 * Una pantalla nueva: agrégala a RUTAS_ASIGNABLES allí para poder dársela a otros
 * usuarios; si tiene acciones que se puedan quitar, a FUNCIONES_POR_PANTALLA.
 */

import { ROL_ADMIN, RUTAS_ASIGNABLES, RUTA_USUARIOS, funcionesEfectivas } from '../../../shared/usuarios.js'

export {
  FUNCIONES, FUNCIONES_POR_PANTALLA, PERMISOS_POR_ROL, ROLES_ASIGNABLES, RUTAS_ASIGNABLES, RUTA_USUARIOS, permisosDeRol,
} from '../../../shared/usuarios.js'

/** Rutas que cambiaron de nombre: los permisos guardados con la vieja pasan a la nueva */
const RUTAS_RENOMBRADAS = { '/configuracion': '/catalogo' }

/** Permisos con las rutas renombradas al día, sin repetidos */
export function migrarPermisos(permisos) {
  if (!Array.isArray(permisos)) return permisos
  return [...new Set(permisos.map(p => RUTAS_RENOMBRADAS[p] ?? p))]
}

export const esAdmin = sesion => sesion?.rol === ROL_ADMIN

/** true si la sesión ({ rol, permisos }) puede abrir la ruta (las subrutas heredan el permiso) */
export function puedeAcceder(ruta, sesion) {
  if (!sesion) return false
  if (esAdmin(sesion)) return true
  const limpia = String(ruta || '').split('?')[0]
  if (limpia === RUTA_USUARIOS || limpia.startsWith(`${RUTA_USUARIOS}/`)) return false
  return (sesion.permisos ?? []).some(p => p === limpia || (p !== '/' && limpia.startsWith(`${p}/`)))
}

/**
 * true si la sesión puede usar una función (p. ej. 'compras.eliminar'). Hace falta la
 * función y su pantalla; una sesión sin lista de funciones (de antes) las tiene todas.
 */
export function puedeHacer(funcion, sesion) {
  if (!sesion) return false
  if (esAdmin(sesion)) return true
  return funcionesEfectivas(sesion).includes(funcion)
}

/** Primera pantalla a la que entra la sesión: Agregar compra si puede, si no la primera de su lista */
export function rutaInicio(sesion) {
  if (puedeAcceder('/', sesion)) return '/'
  return RUTAS_ASIGNABLES.find(r => puedeAcceder(r, sesion)) ?? '/'
}
