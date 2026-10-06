import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { ACCESO } from '../utils/mensajes'

const CLAVE_STORAGE = 'depanas_autenticado'
const CLAVE_USUARIO = 'depanas_usuario'

/**
 * Configuración de usuarios y permisos por pantalla.
 * Permite editar o agregar pantallas en el futuro fácilmente.
 * - permisos: ['*'] otorga acceso total.
 * - permisos: ['/','/compras',...] restringe solo a las rutas indicadas.
 */
export const USUARIOS = {
  'Cesar_01': {
    contrasena: '1234',
    nombre: 'César',
    rol: 'admin',
    permisos: ['*'],
  },
  'Marta_02': {
    contrasena: '5678',
    nombre: 'Marta',
    rol: 'operador',
    permisos: ['/', '/compras', '/exportar', '/cargar', '/agregar-compra'],
  },
}

/**
 * Determina si un usuario tiene permiso para acceder a una ruta determinada.
 */
export function puedeAcceder(ruta, nombreUsuario) {
  if (!nombreUsuario) return false
  const usuarioKey = Object.keys(USUARIOS).find(
    (u) => u.toLowerCase() === String(nombreUsuario).toLowerCase()
  )
  if (!usuarioKey) return false
  const config = USUARIOS[usuarioKey]
  if (!config) return false

  const permisos = config.permisos || []
  if (permisos.includes('*')) return true

  const rutaLimpia = String(ruta || '').split('?')[0]
  return permisos.some((p) => {
    if (p === rutaLimpia) return true
    if (p !== '/' && rutaLimpia.startsWith(`${p}/`)) return true
    return false
  })
}

const AuthContext = createContext({
  autenticado: false,
  usuario: null,
  tienePermiso: () => false,
  ingresar: () => ({ ok: false }),
  salir: () => {},
})

export function AuthProvider({ children }) {
  const [autenticado, setAutenticado] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(CLAVE_STORAGE) === 'true'
      }
    } catch {
      // Entornos sin acceso a sessionStorage o modo incógnito restrictivo
    }
    return false
  })

  const [usuario, setUsuario] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(CLAVE_USUARIO) || null
      }
    } catch {
      // Entornos sin acceso a sessionStorage
    }
    return null
  })

  const tienePermiso = useCallback(
    (ruta) => puedeAcceder(ruta, usuario),
    [usuario]
  )

  const ingresar = useCallback((usuarioEntrada, claveEntrada) => {
    let user = usuarioEntrada
    let pass = claveEntrada

    if (pass === undefined && typeof user === 'string') {
      pass = user
      user = 'Cesar_01'
    }

    const uLimpio = String(user ?? '').trim()
    const pLimpio = String(pass ?? '').trim()

    if (!uLimpio) {
      return { ok: false, error: ACCESO.faltaUsuario }
    }
    if (!pLimpio) {
      return { ok: false, error: ACCESO.faltaContrasena }
    }

    const usuarioEncontrado = Object.keys(USUARIOS).find(
      (u) => u.toLowerCase() === uLimpio.toLowerCase()
    )

    if (usuarioEncontrado && USUARIOS[usuarioEncontrado].contrasena === pLimpio) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(CLAVE_STORAGE, 'true')
          window.sessionStorage.setItem(CLAVE_USUARIO, usuarioEncontrado)
        }
      } catch {
        // Ignorar errores de almacenamiento
      }
      setUsuario(usuarioEncontrado)
      setAutenticado(true)
      return { ok: true, usuario: usuarioEncontrado }
    }

    return { ok: false, error: ACCESO.incorrecta }
  }, [])

  const salir = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(CLAVE_STORAGE)
        window.sessionStorage.removeItem(CLAVE_USUARIO)
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
    setUsuario(null)
    setAutenticado(false)
  }, [])

  const valor = useMemo(
    () => ({ autenticado, usuario, tienePermiso, ingresar, salir }),
    [autenticado, usuario, tienePermiso, ingresar, salir]
  )

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
