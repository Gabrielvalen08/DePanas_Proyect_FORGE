import { useEffect } from 'react'
import { Power } from 'lucide-react'
import { EstadoVacio, Tarjeta } from '../components/common'
import { APAGADO } from '../utils/mensajes'
import estilos from './PantallaApagado.module.css'

/**
 * PantallaApagado
 * Lo que queda en la pestaña después de «Apagar De Panas SV» (versión del .zip):
 * el servidor ya no responde, así que no hay nada más que hacer aquí.
 */
export default function PantallaApagado() {
  useEffect(() => {
    document.title = `${APAGADO.titulo} | De Panas SV`
  }, [])

  return (
    <main id="contenido" tabIndex={-1} className={estilos.contenedor}>
      <h1 className="solo-lector">De Panas SV</h1>
      <Tarjeta>
        <EstadoVacio icono={<Power />} titulo={APAGADO.titulo} texto={APAGADO.texto} />
      </Tarjeta>
    </main>
  )
}
