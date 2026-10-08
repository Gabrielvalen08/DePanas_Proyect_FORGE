import { PlusCircle, Settings, ShoppingCart, UsersRound } from 'lucide-react'

// Lista única de navegación: la usan Sidebar, BarraInferior y App (títulos).
// etiquetaCorta se usa en la barra inferior, donde el espacio es menor.
// Agregar compra es la página principal: es lo que el cliente hace más seguido.
export const itemsNavegacion = [
  { a: '/', Icono: PlusCircle, etiqueta: 'Agregar compra', etiquetaCorta: 'Agregar', titulo: 'Agregar compra' },
  { a: '/compras', Icono: ShoppingCart, etiqueta: 'Compras', etiquetaCorta: 'Compras', titulo: 'Compras' },
]

// Van aparte, al pie del menú y justo arriba de "Bloquear"
export const itemConfiguracion = {
  a: '/configuracion', Icono: Settings, etiqueta: 'Configuración', etiquetaCorta: 'Configuración', titulo: 'Configuración',
}

// Solo lo ve el administrador (ver utils/permisos.js)
export const itemUsuarios = {
  a: '/usuarios', Icono: UsersRound, etiqueta: 'Gestor de usuarios', etiquetaCorta: 'Usuarios', titulo: 'Gestor de usuarios',
}

/** Ítems del pie del menú, en orden */
export const itemsPie = [itemUsuarios, itemConfiguracion]

// Páginas sin botón propio en el menú (se abren desde Agregar compra)
const otrasPaginas = [
  { a: '/exportar', titulo: 'Exportar datos' },
  { a: '/cargar', titulo: 'Cargar datos' },
]

/** Título de la página para document.title según la ruta (las subrutas heredan el de su sección) */
export function tituloDeRuta(ruta) {
  const todas = [...itemsNavegacion, ...itemsPie, ...otrasPaginas]
  const exacta = todas.find(item => item.a === ruta)
  const seccion = todas.find(item => item.a !== '/' && ruta.startsWith(`${item.a}/`))
  return (exacta ?? seccion)?.titulo ?? 'Agregar compra'
}
