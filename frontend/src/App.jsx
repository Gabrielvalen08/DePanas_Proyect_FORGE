import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider, useToast } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import BarraInferior from './components/BarraInferior'
import { tituloDeRuta } from './components/navegacion'
import PantallaMaestra from './pages/PantallaMaestra'
import AgregarCompra from './pages/AgregarCompra'
import PantallaContrasena from './pages/PantallaContrasena'
import PantallaConfiguracion from './pages/PantallaConfiguracion'
import PantallaExportar from './pages/PantallaExportar'
import PantallaCargar from './pages/PantallaCargar'
import PantallaUsuarios from './pages/PantallaUsuarios'
import { rutaInicio } from './utils/permisos'
import { ACCESO } from './utils/mensajes'
import estilos from './App.module.css'

function AppContenido() {
  const { autenticado, sesion, salir, tienePermiso } = useAuth()
  const { addToast } = useToast()

  function bloquear() {
    salir()
    addToast(ACCESO.bloqueado)
  }
  const { pathname } = useLocation()
  const primeraCarga = useRef(true)

  // Al cambiar de ruta o estado de autenticación: actualiza el título y lleva el foco al contenido
  useEffect(() => {
    if (!autenticado) {
      document.title = 'Acceso al sistema | De Panas SV'
      return
    }

    document.title = `${tituloDeRuta(pathname)} | De Panas SV`
    if (primeraCarga.current) {
      primeraCarga.current = false
      return
    }
    document.getElementById('contenido')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname, autenticado])

  if (!autenticado) {
    return <PantallaContrasena />
  }

  // Cada pantalla se abre solo con permiso; si no, se va a la primera que el usuario sí puede ver
  const inicio = rutaInicio(sesion)
  const protegida = (permiso, elemento) => (tienePermiso(permiso) ? elemento : <Navigate to={inicio} replace />)

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <div className={estilos.layout}>
        <Sidebar onBloquear={bloquear} />
        <div className={estilos.areaPrincipal}>
          <Routes>
            {/* Agregar compra es la página principal */}
            <Route
              path="/"
              element={protegida('/', (
                <AgregarCompra puedeExportar={tienePermiso('/exportar')} puedeCargar={tienePermiso('/cargar')} />
              ))}
            />
            <Route path="/compras" element={protegida('/compras', <PantallaMaestra puedeAgregar={tienePermiso('/')} />)} />
            <Route path="/configuracion" element={protegida('/configuracion', <PantallaConfiguracion />)} />
            <Route path="/configuracion/:seccion" element={protegida('/configuracion', <PantallaConfiguracion />)} />
            <Route path="/exportar" element={protegida('/exportar', <PantallaExportar />)} />
            <Route path="/cargar" element={protegida('/cargar', <PantallaCargar puedeVolver={tienePermiso('/')} />)} />
            <Route path="/usuarios" element={protegida('/usuarios', <PantallaUsuarios />)} />
            <Route path="/agregar-compra" element={<Navigate to="/" replace />} />
            {/* Redirige cualquier ruta desconocida a la principal */}
            <Route path="*" element={<Navigate to={inicio} replace />} />
          </Routes>
        </div>
        <BarraInferior onBloquear={bloquear} />
      </div>
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContenido />
      </AuthProvider>
    </ToastProvider>
  )
}
