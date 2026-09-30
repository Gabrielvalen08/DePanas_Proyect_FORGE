import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import Sidebar from './components/Sidebar'
import Inicio from './pages/Inicio'
import PantallaMaestra from './pages/PantallaMaestra'
import AgregarCompra from './pages/AgregarCompra'

export default function App() {
  return (
    <ToastProvider>
      <div className="layout">
        <Sidebar />
        <div className="main-area">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/compras" element={<PantallaMaestra />} />
            <Route path="/agregar-compra" element={<AgregarCompra />} />
            {/* Redirige cualquier ruta desconocida al inicio */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </ToastProvider>
  )
}
