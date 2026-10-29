import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { EVENTO_SESION_VENCIDA, cerrarSesionServidor, fijarTokenSesion, iniciarSesion } from '../services/api'
import { useToast } from './ToastContext'
import { esAdmin, migrarPermisos, puedeAcceder, puedeHacer } from '../utils/permisos'
import { ACCESO } from '../utils/mensajes'

// { usuario, nombre, rol, permisos, funciones, token } de quien entró; dura hasta cerrar la pestaña.
// token: el de la sesión del servidor (modo servidor), que cada pedido manda a la API.
// Una sesión de antes de las funciones (sin la lista) las tiene todas en sus pantallas.
const CLAVE_SESION = 'depanas_sesion'

/** Sesión guardada en sessionStorage, o null */
function leerSesion() {
  try {
    const sesion = JSON.parse(window.sessionStorage.getItem(CLAVE_SESION) || 'null')
    return sesion?.usuario && Array.isArray(sesion.permisos) ? { ...sesion, permisos: migrarPermisos(sesion.permisos) } : null
  } catch {
    // Sin acceso a sessionStorage o con datos ilegibles: hay que volver a entrar
    return null
  }
}

const AuthContext = createContext(null)

/**
 * Inicio de sesión con usuario y contraseña. Los usuarios y sus permisos viven en
 * la base (Gestor de usuarios). Con servidor, la API exige el token de la sesión y
 * revisa los permisos (backend/permisos.js); en modo local es solo una barrera de interfaz.
 * Si el servidor rechaza el token (8 h sin uso, servidor reiniciado o usuario eliminado),
 * se cierra la sesión y se avisa.
 */
export function AuthProvider({ children }) {
  // Puede no haber ToastProvider (p. ej. en pruebas): entonces no se avisa
  const addToast = useToast()?.addToast
  const [sesion, setSesion] = useState(() => {
    const guardada = leerSesion()
    fijarTokenSesion(guardada?.token)
    return guardada
  })

  const tienePermiso = useCallback(ruta => puedeAcceder(ruta, sesion), [sesion])
  const tieneFuncion = useCallback(funcion => puedeHacer(funcion, sesion), [sesion])

  /** Devuelve { ok: true, usuario } o { ok: false, error } */
  const ingresar = useCallback(async (usuarioEntrada, claveEntrada) => {
    const usuario = String(usuarioEntrada ?? '').trim()
    const contrasena = String(claveEntrada ?? '').trim()
    if (!usuario) return { ok: false, error: ACCESO.faltaUsuario }
    if (!contrasena) return { ok: false, error: ACCESO.faltaContrasena }

    let datos
    try {
      datos = await iniciarSesion(usuario, contrasena)
    } catch (error) {
      // Demasiados intentos fallidos: el servidor dice cuántos minutos esperar
      if (error?.status === 429) return { ok: false, error: ACCESO.demasiadosIntentos(error.minutos ?? 5) }
      return { ok: false, error: ACCESO.incorrecta }
    }
    const nueva = {
      usuario: datos.usuario, nombre: datos.nombre, rol: datos.rol, permisos: datos.permisos, funciones: datos.funciones,
      ...(datos.token ? { token: datos.token } : {}),
    }
    fijarTokenSesion(nueva.token)
    try {
      window.sessionStorage.setItem(CLAVE_SESION, JSON.stringify(nueva))
    } catch {
      // Sin sessionStorage la sesión dura hasta recargar
    }
    setSesion(nueva)
    return { ok: true, usuario: nueva.usuario }
  }, [])

  const salir = useCallback(() => {
    cerrarSesionServidor()
    try {
      window.sessionStorage.removeItem(CLAVE_SESION)
    } catch {
      // Ignorar errores de almacenamiento
    }
    setSesion(null)
  }, [])

  // El servidor rechazó el token: se vuelve a pedir entrar
  useEffect(() => {
    function alVencer() {
      salir()
      addToast?.(ACCESO.sesionVencida, 'error')
    }
    window.addEventListener(EVENTO_SESION_VENCIDA, alVencer)
    return () => window.removeEventListener(EVENTO_SESION_VENCIDA, alVencer)
  }, [salir, addToast])

  const valor = useMemo(
    () => ({
      autenticado: sesion !== null,
      usuario: sesion?.usuario ?? null,
      sesion,
      esAdmin: esAdmin(sesion),
      tienePermiso,
      tieneFuncion,
      ingresar,
      salir,
    }),
    [sesion, tienePermiso, tieneFuncion, ingresar, salir]
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
