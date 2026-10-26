/**
 * shared/usuarios.js
 * Reglas de los usuarios que usan igual el backend (routes/usuarios.js, db.js) y el
 * frontend (services/api.js, utils/permisos.js, EditorUsuario):
 *
 *  - Pantallas y funciones que se pueden asignar. Una función es una acción dentro de
 *    una pantalla (p. ej. eliminar compras en la Lista de compras); solo cuenta si el
 *    usuario también tiene la pantalla.
 *  - Roles: el administrador (único, entra a todo) y los roles que se asignan al crear
 *    un usuario. Cada rol trae sus pantallas y funciones; el administrador puede
 *    ajustarlas después usuario por usuario.
 *  - Requisitos de las contraseñas, que el administrador configura.
 *
 * Un usuario guarda `permisos` (rutas) y `funciones` (ids). `funciones` null o ausente
 * es un usuario de antes de las funciones: tiene todas las de sus pantallas.
 */

/** Pantallas que el administrador puede dar a los demás usuarios (rutas del frontend) */
export const RUTAS_ASIGNABLES = ['/', '/compras', '/catalogo', '/exportar', '/cargar']

/** El Gestor de usuarios: solo el administrador entra, nunca se asigna */
export const RUTA_USUARIOS = '/usuarios'

/** Funciones de cada pantalla, en el orden en que se muestran */
export const FUNCIONES_POR_PANTALLA = {
  '/compras': ['compras.editar', 'compras.eliminar'],
  '/catalogo': ['catalogo.agregar', 'catalogo.editar', 'catalogo.eliminar', 'catalogo.exportar', 'catalogo.cargar'],
}

export const FUNCIONES = Object.values(FUNCIONES_POR_PANTALLA).flat()

/** Pantalla a la que pertenece una función */
export const pantallaDeFuncion = funcion =>
  Object.keys(FUNCIONES_POR_PANTALLA).find(ruta => FUNCIONES_POR_PANTALLA[ruta].includes(funcion))

export const ROL_ADMIN = 'admin'

/** Roles que se asignan al crear un usuario, con sus pantallas y funciones de partida */
export const ROLES_ASIGNABLES = ['operador', 'empleado']

export const PERMISOS_POR_ROL = {
  // Todo menos el Gestor de usuarios
  operador: { permisos: [...RUTAS_ASIGNABLES], funciones: [...FUNCIONES] },
  // Registra compras y las consulta y corrige; sin Catálogo, sin eliminar compras y sin exportar ni cargar
  empleado: { permisos: ['/', '/compras'], funciones: ['compras.editar'] },
}

export const ROLES = [ROL_ADMIN, ...ROLES_ASIGNABLES]

/** Pantallas y funciones de partida de un rol (copias, para poder modificarlas) */
export function permisosDeRol(rol) {
  const base = PERMISOS_POR_ROL[rol] ?? PERMISOS_POR_ROL.operador
  return { permisos: [...base.permisos], funciones: [...base.funciones] }
}

/**
 * Funciones que de verdad tiene un usuario: el administrador, todas ('*'); un usuario sin
 * lista (de antes de las funciones), todas las de sus pantallas; si no, las de su lista cuya
 * pantalla tiene.
 */
export function funcionesEfectivas({ rol, permisos = [], funciones }) {
  if (rol === ROL_ADMIN) return ['*']
  const lista = Array.isArray(funciones) ? funciones : FUNCIONES
  return FUNCIONES.filter(f => lista.includes(f) && permisos.includes(pantallaDeFuncion(f)))
}

// ---------------------------------------------------------------------------
// Requisitos de las contraseñas
// ---------------------------------------------------------------------------

export const MINIMO_ABSOLUTO = 4
export const MAXIMO_LARGO = 64

/** Lo que pide una base nueva; el administrador puede cambiarlo en el Gestor de usuarios */
export const REQUISITOS_INICIALES = Object.freeze({
  minimo: 8, mayuscula: true, minuscula: true, numero: true, especial: true,
})

const PRUEBAS = {
  mayuscula: c => /\p{Lu}/u.test(c),
  minuscula: c => /\p{Ll}/u.test(c),
  numero: c => /\p{Nd}/u.test(c),
  // Cualquier cosa que no sea letra, número ni espacio: ! @ # $ % & * . - _ …
  especial: c => /[^\p{L}\p{Nd}\s]/u.test(c),
}

export const MENSAJES_CONTRASENA = {
  minimo: n => `Al menos ${n} caracteres`,
  mayuscula: 'Una letra mayúscula',
  minuscula: 'Una letra minúscula',
  numero: 'Un número',
  especial: 'Un carácter especial (! @ # $ % & * …)',
  noCumple: faltan => `La contraseña no cumple los requisitos: ${faltan.join(', ').toLowerCase()}`,
  minimoInvalido: `El mínimo de caracteres va de ${MINIMO_ABSOLUTO} a ${MAXIMO_LARGO}`,
}

/** Requisitos limpios: lo que falte o venga mal toma el valor inicial */
export function normalizarRequisitos(valor) {
  const r = valor && typeof valor === 'object' ? valor : {}
  const minimo = Number(r.minimo)
  return {
    minimo: Number.isInteger(minimo) && minimo >= MINIMO_ABSOLUTO && minimo <= MAXIMO_LARGO ? minimo : REQUISITOS_INICIALES.minimo,
    mayuscula: typeof r.mayuscula === 'boolean' ? r.mayuscula : REQUISITOS_INICIALES.mayuscula,
    minuscula: typeof r.minuscula === 'boolean' ? r.minuscula : REQUISITOS_INICIALES.minuscula,
    numero: typeof r.numero === 'boolean' ? r.numero : REQUISITOS_INICIALES.numero,
    especial: typeof r.especial === 'boolean' ? r.especial : REQUISITOS_INICIALES.especial,
  }
}

/** Valida lo que manda el administrador; lanza un Error con `campo` si el mínimo no sirve */
export function validarRequisitos(valor) {
  const minimo = Number(valor?.minimo)
  if (!Number.isInteger(minimo) || minimo < MINIMO_ABSOLUTO || minimo > MAXIMO_LARGO) {
    throw Object.assign(new Error(MENSAJES_CONTRASENA.minimoInvalido), { campo: 'minimo' })
  }
  return normalizarRequisitos(valor)
}

/** Cada requisito activo con su texto y si la contraseña lo cumple, en orden */
export function revisarContrasena(contrasena, requisitos) {
  const r = normalizarRequisitos(requisitos)
  const c = String(contrasena ?? '')
  const lista = [{ clave: 'minimo', texto: MENSAJES_CONTRASENA.minimo(r.minimo), cumple: [...c].length >= r.minimo }]
  for (const clave of ['mayuscula', 'minuscula', 'numero', 'especial']) {
    if (r[clave]) lista.push({ clave, texto: MENSAJES_CONTRASENA[clave], cumple: PRUEBAS[clave](c) })
  }
  return lista
}

/** null si la contraseña cumple todo; si no, el mensaje con lo que falta */
export function faltaEnContrasena(contrasena, requisitos) {
  const faltan = revisarContrasena(contrasena, requisitos).filter(r => !r.cumple).map(r => r.texto)
  return faltan.length ? MENSAJES_CONTRASENA.noCumple(faltan) : null
}
