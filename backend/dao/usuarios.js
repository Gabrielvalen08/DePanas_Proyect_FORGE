/**
 * dao/usuarios.js — Acceso a datos de los usuarios y de los ajustes (patrón DAO).
 *
 * Reglas (iguales al modo local de frontend/src/services/api.js, ver shared/usuarios.js):
 * no se repite el usuario (sin distinguir mayúsculas); toda contraseña nueva cumple los
 * requisitos (no se compara con las de los demás: eso revelaría la de otro); hay un solo
 * administrador (permisos ["*"]), que no se elimina ni cambia de rol; el subadministrador
 * también entra a todo, pero no crea ni edita subadministradores ni edita al administrador
 * (`actor` es quien hace el cambio); nadie más recibe el Gestor de usuarios. Las contraseñas
 * se guardan como hash (contrasenas.js) y nunca salen de aquí: lo que se devuelve es el
 * usuario público.
 *
 *   const dao = usuariosDAO(db)
 *   dao.buscar(usuario) · dao.listar() · dao.crear(cuerpo, actor) · dao.editar(usuario, cuerpo, actor) · dao.eliminar(usuario, actor)
 *   dao.autenticar(usuario, contrasena)   → registro o null (recalcula un hash viejo)
 *   dao.requisitos() · dao.guardarRequisitos(cuerpo)
 */

import { enTransaccion } from '../db.js'
import { hashear, necesitaRehash, verificar } from '../contrasenas.js'
import {
  FUNCIONES, RUTAS_ASIGNABLES, RUTA_USUARIOS, ROLES_ASIGNABLES, ROL_ADMIN,
  esSuPropioPerfil, faltaEnContrasena, funcionesEfectivas, normalizarRequisitos, pantallaDeFuncion, permisosDeRol,
  puedeGestionar, rolesQueAsigna, tieneAccesoTotal, validarRequisitos,
} from '../../shared/usuarios.js'
import { comoNoValido, conflicto, noEncontrado, noValido, prohibido } from './errores.js'

const FORMATO_USUARIO = /^[A-Za-z0-9_.-]{3,30}$/
const CLAVE_REQUISITOS = 'requisitosContrasena'

const texto = v => (typeof v === 'string' ? v.trim() : '')

/** Lo que se puede mostrar de un usuario: { usuario, nombre, rol, permisos, funciones efectivas } */
export function publico(fila) {
  const permisos = JSON.parse(fila.permisos)
  const funciones = fila.funciones === null || fila.funciones === undefined ? null : JSON.parse(fila.funciones)
  return { usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol, permisos, funciones: funcionesEfectivas({ rol: fila.rol, permisos, funciones }) }
}

function validarNombre(nombre) {
  if (!nombre) throw noValido('Escribe el nombre de la persona', 'nombre')
  if (nombre.length > 60) throw noValido('El nombre es muy largo (máximo 60 caracteres)', 'nombre')
}

/** Un rol que `actor` puede dar (sin actor, como el administrador) */
function validarRol(rol, actor) {
  if (rol === ROL_ADMIN) throw prohibido('Solo puede haber un administrador', 'rol')
  if (!ROLES_ASIGNABLES.includes(rol)) throw noValido('Elige un rol', 'rol')
  if (!rolesQueAsigna(actor?.rol ?? ROL_ADMIN).includes(rol)) {
    throw prohibido('Solo el administrador puede dar el rol de subadministrador', 'rol')
  }
  return rol
}

/**
 * Pantallas y funciones que se guardan para un rol: con acceso total, ['*'] y sin lista;
 * si no, las del cuerpo validadas (o las de partida del rol).
 */
function accesoDe(rol, cuerpo, permisosActuales) {
  if (tieneAccesoTotal(rol)) return { permisos: ['*'], funciones: null }
  const base = permisosDeRol(rol)
  const permisos = validarPermisos(cuerpo?.permisos ?? permisosActuales ?? base.permisos)
  return { permisos, funciones: validarFunciones(cuerpo?.funciones ?? base.funciones, permisos) }
}

/** Pantallas sin repetir, todas asignables y al menos una, en el orden del menú */
function validarPermisos(permisos) {
  if (!Array.isArray(permisos)) throw noValido('Elige al menos una pantalla', 'permisos')
  const unicos = [...new Set(permisos)]
  if (unicos.includes(RUTA_USUARIOS) || unicos.includes('*')) {
    throw prohibido('El Gestor de usuarios es solo del administrador', 'permisos')
  }
  const desconocida = unicos.find(p => !RUTAS_ASIGNABLES.includes(p))
  if (desconocida !== undefined) throw noValido(`La pantalla «${desconocida}» no existe`, 'permisos')
  if (unicos.length === 0) throw noValido('Elige al menos una pantalla', 'permisos')
  return RUTAS_ASIGNABLES.filter(r => unicos.includes(r))
}

/** Funciones conocidas, sin repetir; las de pantallas que el usuario no tiene se quitan */
function validarFunciones(funciones, permisos) {
  if (!Array.isArray(funciones)) throw noValido('Las funciones deben ser una lista', 'funciones')
  const desconocida = funciones.find(f => !FUNCIONES.includes(f))
  if (desconocida !== undefined) throw noValido(`La función «${desconocida}» no existe`, 'funciones')
  return FUNCIONES.filter(f => funciones.includes(f) && permisos.includes(pantallaDeFuncion(f)))
}

export function usuariosDAO(db) {
  /** Registro completo (con hash) de un usuario, sin distinguir mayúsculas; undefined si no existe */
  const buscar = usuario => db.prepare('SELECT * FROM usuarios WHERE usuario = ? COLLATE NOCASE').get(usuario)

  function requisitos() {
    const fila = db.prepare('SELECT valor FROM ajustes WHERE clave = ?').get(CLAVE_REQUISITOS)
    try {
      return normalizarRequisitos(fila ? JSON.parse(fila.valor) : null)
    } catch {
      return normalizarRequisitos(null)
    }
  }

  function validarContrasena(contrasena) {
    const falta = faltaEnContrasena(contrasena, requisitos())
    if (falta) throw noValido(falta, 'contrasena')
  }

  function existente(usuario) {
    const registro = buscar(texto(usuario))
    if (!registro) throw noEncontrado(`No existe el usuario «${usuario}»`)
    return registro
  }

  return {
    buscar,
    requisitos,

    /** El administrador primero; después por usuario */
    listar() {
      return db.prepare("SELECT * FROM usuarios ORDER BY rol = 'admin' DESC, rol = 'subadmin' DESC, usuario COLLATE NOCASE").all().map(publico)
    },

    /** { usuario, nombre, contrasena, rol, permisos?, funciones? }: lo que no se manda sale del rol */
    crear(cuerpo, actor) {
      return enTransaccion(db, () => {
        const usuario = texto(cuerpo?.usuario)
        const nombre = texto(cuerpo?.nombre)
        const contrasena = texto(cuerpo?.contrasena)
        if (!FORMATO_USUARIO.test(usuario)) {
          throw noValido('El usuario lleva de 3 a 30 letras, números, _ . o - (sin espacios)', 'usuario')
        }
        const repetido = buscar(usuario)
        if (repetido) throw conflicto(`Ya existe el usuario «${repetido.usuario}». Elige otro`, 'usuario')
        validarNombre(nombre)
        validarContrasena(contrasena)
        const rol = validarRol(cuerpo?.rol ?? 'operador', actor)
        const { permisos, funciones } = accesoDe(rol, cuerpo)
        db.prepare('INSERT INTO usuarios (usuario, nombre, contrasena, rol, permisos, funciones) VALUES (?, ?, ?, ?, ?, ?)')
          .run(usuario, nombre, hashear(contrasena), rol, JSON.stringify(permisos), funciones && JSON.stringify(funciones))
        return publico(buscar(usuario))
      })
    },

    /**
     * { nombre?, contrasena?, rol?, permisos?, funciones? }. Al administrador y a quien se edita a
     * sí mismo solo se les cambian nombre y contraseña. El subadministrador no edita al
     * administrador ni a otros subadministradores (403).
     */
    editar(usuario, cuerpo, actor) {
      return enTransaccion(db, () => {
        const registro = existente(usuario)
        const propio = esSuPropioPerfil(actor, registro)
        if (registro.rol === ROL_ADMIN && actor && actor.rol !== ROL_ADMIN) throw prohibido('No puedes editar al administrador')
        if (!propio && !puedeGestionar(actor, registro)) throw prohibido('No puedes editar a otro subadministrador')
        if (cuerpo?.nombre !== undefined) {
          const nombre = texto(cuerpo.nombre)
          validarNombre(nombre)
          db.prepare('UPDATE usuarios SET nombre = ? WHERE id = ?').run(nombre, registro.id)
        }
        // Contraseña vacía o ausente: se deja la que tenía
        const contrasena = texto(cuerpo?.contrasena)
        if (contrasena) {
          validarContrasena(contrasena)
          db.prepare('UPDATE usuarios SET contrasena = ? WHERE id = ?').run(hashear(contrasena), registro.id)
        }
        // El administrador siempre entra a todo y nadie cambia su propio rol: ahí solo nombre y contraseña
        const cambiaAcceso = cuerpo?.rol !== undefined || cuerpo?.permisos !== undefined || cuerpo?.funciones !== undefined
        if (registro.rol !== ROL_ADMIN && !propio && cambiaAcceso) {
          const rol = cuerpo?.rol !== undefined ? validarRol(cuerpo.rol, actor) : registro.rol
          // Con el mismo rol se conservan sus pantallas; con otro, se parte de las del rol nuevo
          const actuales = rol === registro.rol && !tieneAccesoTotal(rol) ? JSON.parse(registro.permisos) : undefined
          const conservar = rol === registro.rol && cuerpo?.funciones === undefined && registro.funciones !== null
          const { permisos, funciones } = accesoDe(rol, conservar ? { ...cuerpo, funciones: JSON.parse(registro.funciones) } : cuerpo, actuales)
          db.prepare('UPDATE usuarios SET rol = ?, permisos = ?, funciones = ? WHERE id = ?')
            .run(rol, JSON.stringify(permisos), funciones && JSON.stringify(funciones), registro.id)
        }
        return publico(buscar(registro.usuario))
      })
    },

    /** Devuelve el nombre de usuario eliminado. El administrador no se elimina; el subadministrador no elimina a otro */
    eliminar(usuario, actor) {
      const registro = existente(usuario)
      if (registro.rol === ROL_ADMIN) throw prohibido('El administrador no se puede eliminar')
      if (!puedeGestionar(actor, registro)) throw prohibido('No puedes eliminar a un subadministrador')
      db.prepare('DELETE FROM usuarios WHERE id = ?').run(registro.id)
      return registro.usuario
    },

    /**
     * Comprueba usuario y contraseña. Devuelve el registro o null (no dice cuál de los dos
     * falló). Un hash de antes, con menos iteraciones, se recalcula ahora que se conoce la contraseña.
     */
    autenticar(usuario, contrasena) {
      const registro = buscar(texto(usuario))
      const clave = texto(contrasena)
      if (!registro || !clave || !verificar(clave, registro.contrasena)) return null
      if (necesitaRehash(registro.contrasena)) {
        db.prepare('UPDATE usuarios SET contrasena = ? WHERE id = ?').run(hashear(clave), registro.id)
      }
      return registro
    },

    guardarRequisitos(cuerpo) {
      let nuevos
      try {
        nuevos = validarRequisitos(cuerpo)
      } catch (err) {
        throw comoNoValido(err)
      }
      db.prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor')
        .run(CLAVE_REQUISITOS, JSON.stringify(nuevos))
      return nuevos
    },
  }
}
