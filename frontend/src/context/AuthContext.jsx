import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { iniciarSesion } from '../services/api'
import { esAdmin, puedeAcceder } from '../utils/permisos'
import { ACCESO } from '../utils/mensajes'

// { usuario, nombre, rol, permisos } de quien entró; dura hasta cerrar la pestaña
const CLAVE_SESION = 'depanas_sesion'

/** Sesión guardada en sessionStorage, o null */
function leerSesion() {
  try {
    const sesion = JSON.parse(window.sessionStorage.getItem(CLAVE_SESION) || 'null')
    return sesion?.usuario && Array.isArray(sesion.permisos) ? sesion : null
  } catch {
    // Sin acceso a sessionStorage o con datos ilegibles: hay que volver a entrar
    return null
  }
}

const AuthContext = createContext(null)

/**
 * Inicio de sesión con usuario y contraseña. Los usuarios y sus permisos viven en
 * la base (Gestor de usuarios); aquí solo se guarda quién entró. Es una barrera
 * de interfaz: la API no pide autenticación.
 */
export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesion)

  const tienePermiso = useCallback(ruta => puedeAcceder(ruta, sesion), [sesion])

  /** Devuelve { ok: true, usuario } o { ok: false, error } */
  const ingresar = useCallback(async (usuarioEntrada, claveEntrada) => {
    const usuario = String(usuarioEntrada ?? '').trim()
    const contrasena = String(claveEntrada ?? '').trim()
    if (!usuario) return { ok: false, error: ACCESO.faltaUsuario }
    if (!contrasena) return { ok: false, error: ACCESO.faltaContrasena }

    let datos
    try {
      datos = await iniciarSesion(usuario, contrasena)
    } catch {
      return { ok: false, error: ACCESO.incorrecta }
    }
    const nueva = { usuario: datos.usuario, nombre: datos.nombre, rol: datos.rol, permisos: datos.permisos }
    try {
      window.sessionStorage.setItem(CLAVE_SESION, JSON.stringify(nueva))
    } catch {
      // Sin sessionStorage la sesión dura hasta recargar
    }
    setSesion(nueva)
    return { ok: true, usuario: nueva.usuario }
  }, [])

  const salir = useCallback(() => {
    try {
      window.sessionStorage.removeItem(CLAVE_SESION)
    } catch {
      // Ignorar errores de almacenamiento
    }
    setSesion(null)
  }, [])

  const valor = useMemo(
    () => ({
      autenticado: sesion !== null,
      usuario: sesion?.usuario ?? null,
      sesion,
      esAdmin: esAdmin(sesion),
      tienePermiso,
      ingresar,
      salir,
    }),
    [sesion, tienePermiso, ingresar, salir]
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
