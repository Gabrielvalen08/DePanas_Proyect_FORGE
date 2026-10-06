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
import { ACCESO } from './utils/mensajes'
import estilos from './App.module.css'

function AppContenido() {
  const { autenticado, salir } = useAuth()
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

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <div className={estilos.layout}>
        <Sidebar onBloquear={bloquear} />
        <div className={estilos.areaPrincipal}>
          <Routes>
            {/* Agregar compra es la página principal */}
            <Route path="/" element={<AgregarCompra />} />
            <Route path="/compras" element={<PantallaMaestra />} />
            <Route path="/configuracion" element={<PantallaConfiguracion />} />
            <Route path="/configuracion/:seccion" element={<PantallaConfiguracion />} />
            <Route path="/exportar" element={<PantallaExportar />} />
            <Route path="/cargar" element={<PantallaCargar />} />
            <Route path="/agregar-compra" element={<Navigate to="/" replace />} />
            {/* Redirige cualquier ruta desconocida a la principal */}
            <Route path="*" element={<Navigate to="/" replace />} />
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

