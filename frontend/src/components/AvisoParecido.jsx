import { useState } from 'react'
import { AvisoDestacado, Boton } from './common'
import { textoBusqueda } from '../utils/formato'
import { NOMBRE_PARECIDO } from '../utils/mensajes'

/**
 * AvisoParecido
 * «X se parece a Y, que ya está registrado» con dos salidas: usar el registrado
 * (alUsar(parecido)) o mantener lo escrito (alMantener(escrito), opcional). Mantener
 * oculta el aviso para ese texto; si se escribe otro, vuelve a revisarse.
 * Sin alUsar es solo el aviso, como antes.
 *
 * Props: id, escrito, parecido (o null), tipo (proveedor | categoria | material | producto),
 * alUsar, alMantener
 */
export default function AvisoParecido({ id, escrito, parecido, tipo, alUsar, alMantener }) {
  const [mantenido, setMantenido] = useState(null)
  const visible = Boolean(parecido) && textoBusqueda(escrito.trim()) !== mantenido
  const nuevo = escrito.trim()

  function mantener() {
    setMantenido(textoBusqueda(nuevo))
    alMantener?.(nuevo)
  }

  return (
    <AvisoDestacado
      id={id}
      texto={visible ? NOMBRE_PARECIDO.aviso(escrito, parecido, tipo) : null}
      acciones={alUsar && (
        <>
          <Boton tamano="sm" variante="secundario" onClick={() => alUsar(parecido)}>
            {NOMBRE_PARECIDO.usar(parecido)}
          </Boton>
          <Boton tamano="sm" variante="secundario" onClick={mantener}>
            {NOMBRE_PARECIDO.mantener(nuevo)}
          </Boton>
        </>
      )}
    />
  )
}
