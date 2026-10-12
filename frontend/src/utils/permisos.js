/**
 * permisos.js — Qué pantallas ve cada usuario.
 *
 *  - El administrador (rol 'admin', permisos ['*']) entra a todas las pantallas,
 *    también a las que se creen en el futuro, y es el único que ve el Gestor de usuarios.
 *  - Los demás usuarios entran solo a las rutas de su lista de permisos, elegidas
 *    entre RUTAS_ASIGNABLES (copia de backend/db/usuarios.js).
 *
 * Una pantalla nueva: agrégala a RUTAS_ASIGNABLES (aquí y en el backend) para poder
 * dársela a otros usuarios; el administrador la ve sin hacer nada.
 */

export const RUTAS_ASIGNABLES = ['/', '/compras', '/catalogo', '/exportar', '/cargar']

/** Rutas que cambiaron de nombre: los permisos guardados con la vieja pasan a la nueva */
const RUTAS_RENOMBRADAS = { '/configuracion': '/catalogo' }

/** Permisos con las rutas renombradas al día, sin repetidos */
export function migrarPermisos(permisos) {
  if (!Array.isArray(permisos)) return permisos
  return [...new Set(permisos.map(p => RUTAS_RENOMBRADAS[p] ?? p))]
}

/** Gestor de usuarios: solo el administrador, nunca se asigna */
export const RUTA_USUARIOS = '/usuarios'

export const esAdmin = sesion => sesion?.rol === 'admin'

/** true si la sesión ({ rol, permisos }) puede abrir la ruta (las subrutas heredan el permiso) */
export function puedeAcceder(ruta, sesion) {
  if (!sesion) return false
  if (esAdmin(sesion)) return true
  const limpia = String(ruta || '').split('?')[0]
  if (limpia === RUTA_USUARIOS || limpia.startsWith(`${RUTA_USUARIOS}/`)) return false
  return (sesion.permisos ?? []).some(p => p === limpia || (p !== '/' && limpia.startsWith(`${p}/`)))
}

/** Primera pantalla a la que entra la sesión: Agregar compra si puede, si no la primera de su lista */
export function rutaInicio(sesion) {
  if (puedeAcceder('/', sesion)) return '/'
  return RUTAS_ASIGNABLES.find(r => puedeAcceder(r, sesion)) ?? '/'
}
