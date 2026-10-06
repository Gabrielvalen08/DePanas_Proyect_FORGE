import { ArrowLeft, Construction } from 'lucide-react'
import Header from '../components/Header'
import { Boton, EstadoVacio, Tarjeta } from '../components/common'
import { CARGAR, fraseDelDia } from '../utils/mensajes'

/** Cargar datos (/cargar): por ahora solo avisa que está en construcción */
export default function PantallaCargar() {
  return (
    <>
      <Header title="Cargar datos" frase={fraseDelDia('/cargar')} />

      <main id="contenido" tabIndex={-1}>
        <Tarjeta>
          <EstadoVacio
            icono={<Construction />}
            titulo={CARGAR.titulo}
            texto={CARGAR.texto}
            accion={<Boton variante="secundario" icono={<ArrowLeft />} a="/">{CARGAR.volver}</Boton>}
          />
        </Tarjeta>
      </main>
    </>
  )
}
