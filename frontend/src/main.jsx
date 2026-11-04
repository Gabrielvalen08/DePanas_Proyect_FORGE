import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import App from './App.jsx'
import { detectarModo } from './services/api'
import './styles/global.css'

// Servidor o local, y en servidor el catálogo de los autocompletados, desde el arranque
detectarModo()

// Router de datos: lo exige useBlocker (aviso de datos sin guardar). Las rutas siguen en App
const router = createBrowserRouter([{ path: '*', element: <App /> }])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* reducedMotion="user": con movimiento reducido solo quedan fundidos */}
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </React.StrictMode>
)
