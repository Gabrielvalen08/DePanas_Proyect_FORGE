import { LayoutDashboard, PlusCircle, ShoppingCart } from 'lucide-react'

// Lista única de navegación: la usan Sidebar y BarraInferior.
// etiquetaCorta se usa en la barra inferior, donde el espacio es menor.
export const itemsNavegacion = [
  { a: '/', Icono: LayoutDashboard, etiqueta: 'Inicio', etiquetaCorta: 'Inicio', titulo: 'Inicio' },
  { a: '/compras', Icono: ShoppingCart, etiqueta: 'Compras', etiquetaCorta: 'Compras', titulo: 'Compras' },
  { a: '/agregar-compra', Icono: PlusCircle, etiqueta: 'Agregar compra', etiquetaCorta: 'Agregar', titulo: 'Agregar compra' },
]

/** Título de la página para document.title según la ruta */
export function tituloDeRuta(ruta) {
  return itemsNavegacion.find(item => item.a === ruta)?.titulo ?? 'Inicio'
}
