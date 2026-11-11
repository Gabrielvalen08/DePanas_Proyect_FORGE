import { Home, MapPinOff } from 'lucide-react'
import Header from '../components/Header'
import { Boton, EstadoVacio, Tarjeta } from '../components/common'
import { NO_ENCONTRADA } from '../utils/mensajes'

/**
 * PantallaNoEncontrada
 * Una dirección que no existe (p. ej. /compras/xyz): lo dice con la marca y ofrece volver
 * al inicio del usuario, en vez de mandarlo ahí sin avisar. Las pantallas que existen pero
 * a las que el usuario no tiene permiso siguen llevando a su inicio (App.jsx, protegida).
 *
 * Props: inicio (la ruta de inicio del usuario, utils/permisos.js → rutaInicio)
 */
export default function PantallaNoEncontrada({ inicio = '/' }) {
  return (
    <>
      <Header title={NO_ENCONTRADA.titulo} />
      <main id="contenido" tabIndex={-1}>
        <Tarjeta>
          <EstadoVacio
            icono={<MapPinOff />}
            titulo={NO_ENCONTRADA.titulo}
            texto={NO_ENCONTRADA.texto}
            accion={<Boton variante="primario" icono={<Home />} a={inicio}>{NO_ENCONTRADA.accion}</Boton>}
          />
        </Tarjeta>
      </main>
    </>
  )
}
