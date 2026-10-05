import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const CLAVE_STORAGE = 'depanas_autenticado'
const CONTRASENA_CORRECTA = '1234'

const AuthContext = createContext({
  autenticado: false,
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

  const ingresar = useCallback((clave) => {
    if (String(clave ?? '').trim() === CONTRASENA_CORRECTA) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(CLAVE_STORAGE, 'true')
        }
      } catch {
        // Ignorar errores de almacenamiento
      }
      setAutenticado(true)
      return { ok: true }
    }
    return { ok: false, error: 'Contraseña incorrecta. Inténtalo de nuevo.' }
  }, [])

  const salir = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(CLAVE_STORAGE)
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
    setAutenticado(false)
  }, [])

  const valor = useMemo(() => ({ autenticado, ingresar, salir }), [autenticado, ingresar, salir])

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
