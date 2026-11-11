import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { ToastProvider, useToast } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DatosSinGuardarProvider, usePedirSalida } from './context/DatosSinGuardarContext'
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
import PantallaApagado from './pages/PantallaApagado'
import { apagarSistema, avisarCierrePestana, detectarModo, puedeApagar, registrarPestana } from './services/api'
import { ConfirmDialog } from './components/common'
import { rutaInicio } from './utils/permisos'
import { ACCESO, APAGADO, CONFIRMAR } from './utils/mensajes'
import estilos from './App.module.css'

/** /configuracion y sus secciones se llaman ahora /catalogo */
function RedirigirACatalogo() {
  const { seccion } = useParams()
  return <Navigate to={seccion ? `/catalogo/${seccion}` : '/catalogo'} replace />
}

function AppContenido() {
  const { autenticado, sesion, salir, tienePermiso, tieneFuncion } = useAuth()
  const { addToast } = useToast()

  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const [apagado, setApagado] = useState(false)
  // Versión del .zip: lo dice /api/health, que al recargar la página responde después del primer dibujo
  const [apagable, setApagable] = useState(puedeApagar)
  const pedirSalida = usePedirSalida()

  useEffect(() => {
    let vigente = true
    detectarModo().then(() => { if (vigente) setApagable(puedeApagar()) })
    return () => { vigente = false }
  }, [])

  // Versión del .zip, con sesión: cerrar la última pestaña apaga el sistema. El navegador pide
  // confirmar con su ventana genérica; al salir se avisa al servidor, que espera unos segundos
  // porque una recarga también pasa por aquí (ver backend/pestanas.js)
  useEffect(() => {
    if (!apagable || !autenticado || apagado) return undefined
    registrarPestana().catch(() => {})
    function avisar(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    // persisted: el navegador trajo la página de su caché al volver atrás
    function alVolver(e) {
      if (e.persisted) registrarPestana().catch(() => {})
    }
    window.addEventListener('beforeunload', avisar)
    window.addEventListener('pagehide', avisarCierrePestana)
    window.addEventListener('pageshow', alVolver)
    return () => {
      window.removeEventListener('beforeunload', avisar)
      window.removeEventListener('pagehide', avisarCierrePestana)
      window.removeEventListener('pageshow', alVolver)
    }
  }, [apagable, autenticado, apagado])

  // Versión del .zip: apaga el servidor de la computadora y deja la pestaña en «apagado»
  async function apagar() {
    try {
      await apagarSistema()
    } catch (error) {
      addToast(APAGADO.error(error.message), 'error')
      return
    }
    setApagado(true)
    salir()
  }

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

  if (apagado) return <PantallaApagado />

  if (!autenticado) {
    return <PantallaContrasena />
  }

  // Cada pantalla se abre solo con permiso; si no, se va a la primera que el usuario sí puede ver
  const inicio = rutaInicio(sesion)
  // En la versión del .zip se sale con «Apagar De Panas SV» (el servidor lo avisa en /api/health)
  // y no hay «Cerrar sesión»: cambiar de usuario es apagar y volver a abrir.
  // Con datos sin guardar, el aviso sale antes de la confirmación de cada uno
  const alApagar = apagable ? () => pedirSalida(() => setConfirmandoApagar(true)) : undefined
  const alCerrarSesion = apagable ? undefined : () => pedirSalida(() => setConfirmandoSalida(true))
  const protegida = (permiso, elemento) => (tienePermiso(permiso) ? elemento : <Navigate to={inicio} replace />)
  // Dentro de cada pantalla, solo aparecen las acciones que el usuario tiene (funciones)
  const accionesCatalogo = Object.fromEntries(
    ['agregar', 'editar', 'eliminar', 'exportar', 'cargar'].map(accion => [accion, tieneFuncion(`catalogo.${accion}`)])
  )

  return (
    <>
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <div className={estilos.layout}>
        <Sidebar onCerrarSesion={alCerrarSesion} onApagar={alApagar} />
        <div className={estilos.areaPrincipal}>
          <Routes>
            {/* Agregar compra es la página principal */}
            <Route
              path="/"
              element={protegida('/', (
                <AgregarCompra puedeEditarArticulo={tieneFuncion('catalogo.editar')} />
              ))}
            />
            <Route path="/compras" element={protegida('/compras', (
              <PantallaMaestra
                puedeAgregar={tienePermiso('/')}
                puedeExportar={tienePermiso('/exportar')}
                puedeCargar={tienePermiso('/cargar')}
                puedeEditar={tieneFuncion('compras.editar')}
                puedeEliminar={tieneFuncion('compras.eliminar')}
                puedeArchivar={tieneFuncion('compras.archivar')}
                puedeEditarArticulo={tieneFuncion('catalogo.editar')}
              />
            ))} />
            {/* Archivo: las compras de más de 3 meses y las archivadas a mano. Mismo permiso que la lista */}
            <Route path="/compras/archivo" element={protegida('/compras', (
              <PantallaMaestra
                vista="archivadas"
                puedeEditar={tieneFuncion('compras.editar')}
                puedeEliminar={tieneFuncion('compras.eliminar')}
                puedeArchivar={tieneFuncion('compras.archivar')}
                puedeEditarArticulo={tieneFuncion('catalogo.editar')}
              />
            ))} />
            <Route path="/catalogo" element={protegida('/catalogo', <PantallaCatalogo acciones={accionesCatalogo} />)} />
            <Route path="/catalogo/:seccion" element={protegida('/catalogo', <PantallaCatalogo acciones={accionesCatalogo} />)} />
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
        <BarraInferior onCerrarSesion={alCerrarSesion} onApagar={alApagar} />
      </div>

      <ConfirmDialog
        isOpen={confirmandoSalida}
        onClose={() => setConfirmandoSalida(false)}
        onConfirm={cerrarSesion}
        title={CONFIRMAR.cerrarSesion.titulo}
        message={CONFIRMAR.cerrarSesion.mensaje}
        confirmLabel={CONFIRMAR.cerrarSesion.confirmar}
      />
      <ConfirmDialog
        isOpen={confirmandoApagar}
        onClose={() => setConfirmandoApagar(false)}
        onConfirm={apagar}
        title={CONFIRMAR.apagar.titulo}
        message={CONFIRMAR.apagar.mensaje}
        confirmLabel={CONFIRMAR.apagar.confirmar}
        danger
      />
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DatosSinGuardarProvider>
          <AppContenido />
        </DatosSinGuardarProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

