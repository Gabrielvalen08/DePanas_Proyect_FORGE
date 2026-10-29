/**
 * permisos.js — Qué hace falta para cada ruta de la API y si un usuario lo tiene.
 *
 * Las mismas reglas que el frontend (shared/usuarios.js): el administrador entra a todo;
 * los demás, a las pantallas de su lista y a las funciones que tengan de esas pantallas.
 * Una regla { pantallas, funciones } se cumple con cualquiera de sus pantallas o funciones;
 * 'admin' es solo el administrador; null, cualquier sesión.
 */

import { ROL_ADMIN } from '../shared/usuarios.js'

// Las compras se leen desde Agregar compra (precios), Lista de compras, Exportar y Cargar
const LEER_COMPRAS = { pantallas: ['/', '/compras', '/exportar', '/cargar'] }

/**
 * Lo que exige `metodo` en `ruta` (relativa a /api, p. ej. '/compras/abc').
 * @returns {null | 'admin' | { pantallas?: string[], funciones?: string[] }}
 */
export function permisoRequerido(metodo, ruta) {
  const partes = ruta.split('?')[0].split('/').filter(Boolean)
  const [recurso, segundo, tercero] = partes

  if (recurso === 'sesion') return null
  if (recurso === 'usuarios' || recurso === 'requisitos-contrasena') return 'admin'

  if (recurso === 'compras' || recurso === 'ingresos') {
    if (metodo === 'GET') return LEER_COMPRAS
    if (metodo === 'POST') return { pantallas: ['/'] }
    if (metodo === 'PUT') return { funciones: ['compras.editar'] }
    if (metodo === 'DELETE') return { funciones: ['compras.eliminar'] }
  }

  if (recurso === 'catalogo') {
    // Las opciones de los autocompletados las usan varias pantallas
    if (metodo === 'GET') return null
    // Asignar categoría y productos a un artículo desde una compra (nueva o editada) o desde el Catálogo
    if (segundo === 'materiales' && metodo === 'PUT') {
      return { pantallas: ['/'], funciones: ['compras.editar', 'catalogo.editar'] }
    }
    if (tercero === 'importar' && metodo === 'POST') return { funciones: ['catalogo.cargar'] }
    if (metodo === 'POST') return { funciones: ['catalogo.agregar'] }
    if (metodo === 'PUT') return { funciones: ['catalogo.editar'] }
    if (metodo === 'DELETE') return { funciones: ['catalogo.eliminar'] }
  }

  if (recurso === 'db') {
    if (metodo === 'GET' && segundo?.startsWith('exportar')) return { pantallas: ['/exportar'] }
    if (metodo === 'POST' && segundo?.startsWith('importar')) return { pantallas: ['/cargar'] }
  }

  // Lo que no está en la lista es solo del administrador
  return 'admin'
}

/**
 * ¿`usuario` ({ rol, permisos, funciones } con las funciones efectivas) cumple `regla`?
 */
export function cumple(usuario, regla) {
  if (regla === null) return true
  if (usuario.rol === ROL_ADMIN) return true
  if (regla === 'admin') return false
  return (regla.pantallas ?? []).some(p => usuario.permisos.includes(p)) ||
    (regla.funciones ?? []).some(f => usuario.funciones.includes(f))
}
