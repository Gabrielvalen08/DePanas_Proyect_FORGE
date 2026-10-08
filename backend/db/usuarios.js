/**
 * usuarios.js — Usuarios iniciales y pantallas que se pueden asignar.
 * db.js los siembra en la tabla `usuarios` cuando la tabla está vacía.
 * El frontend tiene una copia en src/services/api.js (USUARIOS_INICIALES) y en
 * src/utils/permisos.js (RUTAS_ASIGNABLES), para el modo local.
 *
 * Las contraseñas nunca se guardan en texto plano: van como hash PBKDF2
 * (ver contrasenas.js). Las de aquí son 1234 (Cesar_01) y 5678 (Marta_02).
 */

/** Pantallas que el administrador puede dar a los demás usuarios (rutas del frontend) */
export const RUTAS_ASIGNABLES = ['/', '/compras', '/configuracion', '/exportar', '/cargar']

/** El Gestor de usuarios: solo el administrador entra, nunca se asigna */
export const RUTA_USUARIOS = '/usuarios'

/** El administrador tiene '*': todas las pantallas, también las que se creen después */
export const USUARIOS_INICIALES = [
  {
    usuario: 'Cesar_01',
    nombre: 'César',
    rol: 'admin',
    permisos: ['*'],
    contrasena: 'pbkdf2$100000$5a43060896bd80a84a7d4224a028b545$c19cba8f54fc5c6afa5638a7ac9be25b870d6a132d9a64f6f96f597121b3d54e',
  },
  {
    usuario: 'Marta_02',
    nombre: 'Marta',
    rol: 'operador',
    permisos: [...RUTAS_ASIGNABLES],
    contrasena: 'pbkdf2$100000$d0f24824a99bff7180d523f67b5b6ff5$e1f9aaceda70ab381493fc4662cc7c561c76aef0415446fcb0b3d7c90fdda447',
  },
]
