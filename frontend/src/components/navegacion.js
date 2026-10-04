import { PlusCircle, ShoppingCart } from 'lucide-react'

// Lista única de navegación: la usan Sidebar, BarraInferior y App (títulos).
// etiquetaCorta se usa en la barra inferior, donde el espacio es menor.
// Agregar compra es la página principal: es lo que el cliente hace más seguido.
export const itemsNavegacion = [
  { a: '/', Icono: PlusCircle, etiqueta: 'Agregar compra', etiquetaCorta: 'Agregar', titulo: 'Agregar compra' },
  { a: '/compras', Icono: ShoppingCart, etiqueta: 'Compras', etiquetaCorta: 'Compras', titulo: 'Compras' },
]

/** Título de la página para document.title según la ruta */
export function tituloDeRuta(ruta) {
  return itemsNavegacion.find(item => item.a === ruta)?.titulo ?? 'Agregar compra'
}
