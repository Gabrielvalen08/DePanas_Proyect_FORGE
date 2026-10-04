import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import Sidebar from './components/Sidebar'
import BarraInferior from './components/BarraInferior'
import { tituloDeRuta } from './components/navegacion'
import PantallaMaestra from './pages/PantallaMaestra'
import AgregarCompra from './pages/AgregarCompra'
import estilos from './App.module.css'

export default function App() {
  const { pathname } = useLocation()
  const primeraCarga = useRef(true)

  // Al cambiar de ruta: actualiza el título y lleva el foco al contenido
  useEffect(() => {
    document.title = `${tituloDeRuta(pathname)} | De Panas SV`
    if (primeraCarga.current) {
      primeraCarga.current = false
      return
    }
    document.getElementById('contenido')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <ToastProvider>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <div className={estilos.layout}>
        <Sidebar />
        <div className={estilos.areaPrincipal}>
          <Routes>
            {/* Agregar compra es la página principal */}
            <Route path="/" element={<AgregarCompra />} />
            <Route path="/compras" element={<PantallaMaestra />} />
            <Route path="/agregar-compra" element={<Navigate to="/" replace />} />
            {/* Redirige cualquier ruta desconocida a la principal */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BarraInferior />
      </div>
    </ToastProvider>
  )
}
