/**
 * usuarios.js — Usuarios iniciales.
 * db.js los siembra en la tabla `usuarios` cuando la tabla está vacía.
 * Las pantallas, funciones, roles y requisitos de contraseña viven en
 * shared/usuarios.js (los usan igual el backend y el frontend).
 * El frontend tiene una copia de estos usuarios en src/services/api.js
 * (USUARIOS_INICIALES), para el modo local.
 *
 * Las contraseñas nunca se guardan en texto plano: van como hash PBKDF2
 * (ver contrasenas.js). Las de aquí son DePanas#2026 (Cesar_01) y 5678 (Marta_02).
 */

import { permisosDeRol } from '../../shared/usuarios.js'

export { RUTAS_ASIGNABLES, RUTA_USUARIOS } from '../../shared/usuarios.js'

/**
 * Hash de la contraseña anterior de Cesar_01 (1234). db.js lo cambia por la nueva
 * en las bases que aún lo tienen; si el administrador ya la cambió, no se toca.
 */
export const HASH_CESAR_ANTERIOR =
  'pbkdf2$100000$5a43060896bd80a84a7d4224a028b545$c19cba8f54fc5c6afa5638a7ac9be25b870d6a132d9a64f6f96f597121b3d54e'

/** El administrador tiene '*': todas las pantallas, también las que se creen después */
export const USUARIOS_INICIALES = [
  {
    usuario: 'Cesar_01',
    nombre: 'César',
    rol: 'admin',
    permisos: ['*'],
    funciones: null,
    contrasena: 'pbkdf2$100000$318e543084955bfa70320484de53a2e7$d6e7f7d39165aedc706475dfe3356116926420fe75f9158acdc9cc674b890b9c',
  },
  {
    usuario: 'Marta_02',
    nombre: 'Marta',
    rol: 'operador',
    ...permisosDeRol('operador'),
    contrasena: 'pbkdf2$100000$d0f24824a99bff7180d523f67b5b6ff5$e1f9aaceda70ab381493fc4662cc7c561c76aef0415446fcb0b3d7c90fdda447',
  },
]
