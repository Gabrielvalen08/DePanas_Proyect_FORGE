import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { ToastProvider, useToast } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import BarraInferior from './components/BarraInferior'
import { tituloDeRuta } from './components/navegacion'
import PantallaMaestra from './pages/PantallaMaestra'
import AgregarCompra from './pages/AgregarCompra'
import PantallaContrasena from './pages/PantallaContrasena'
import PantallaCatalogo from './pages/PantallaCatalogo'
import PantallaExportar from './pages/PantallaExportar'
import PantallaCargar from './pages/PantallaCargar'
import PantallaUsuarios from './pages/PantallaUsuarios'
import { ConfirmDialog } from './components/common'
import { rutaInicio } from './utils/permisos'
import { ACCESO, CONFIRMAR } from './utils/mensajes'
import estilos from './App.module.css'

/** /configuracion y sus secciones se llaman ahora /catalogo */
function RedirigirACatalogo() {
  const { seccion } = useParams()
  return <Navigate to={seccion ? `/catalogo/${seccion}` : '/catalogo'} replace />
}

function AppContenido() {
  const { autenticado, sesion, salir, tienePermiso } = useAuth()
  const { addToast } = useToast()

  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

  function cerrarSesion() {
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
        <Sidebar onCerrarSesion={() => setConfirmandoSalida(true)} />
        <div className={estilos.areaPrincipal}>
          <Routes>
            {/* Agregar compra es la página principal */}
            <Route
              path="/"
              element={protegida('/', (
                <AgregarCompra />
              ))}
            />
            <Route path="/compras" element={protegida('/compras', <PantallaMaestra puedeAgregar={tienePermiso('/')} puedeExportar={tienePermiso('/exportar')} puedeCargar={tienePermiso('/cargar')} />)} />
            <Route path="/catalogo" element={protegida('/catalogo', <PantallaCatalogo />)} />
            <Route path="/catalogo/:seccion" element={protegida('/catalogo', <PantallaCatalogo />)} />
            <Route path="/configuracion" element={<RedirigirACatalogo />} />
            <Route path="/configuracion/:seccion" element={<RedirigirACatalogo />} />
            <Route path="/exportar" element={protegida('/exportar', <PantallaExportar />)} />
            <Route path="/cargar" element={protegida('/cargar', <PantallaCargar />)} />
            <Route path="/usuarios" element={protegida('/usuarios', <PantallaUsuarios />)} />
            <Route path="/agregar-compra" element={<Navigate to="/" replace />} />
            {/* Redirige cualquier ruta desconocida a la principal */}
            <Route path="*" element={<Navigate to={inicio} replace />} />
          </Routes>
        </div>
        <BarraInferior onCerrarSesion={() => setConfirmandoSalida(true)} />
      </div>

      <ConfirmDialog
        isOpen={confirmandoSalida}
        onClose={() => setConfirmandoSalida(false)}
        onConfirm={cerrarSesion}
        title={CONFIRMAR.cerrarSesion.titulo}
        message={CONFIRMAR.cerrarSesion.mensaje}
        confirmLabel={CONFIRMAR.cerrarSesion.confirmar}
      />
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

