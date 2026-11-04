import { useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Boton, CuerpoModal, Modal, PieModal } from './common'
import { AVISO_SALIDA } from '../utils/mensajes'

/**
 * AvisoSalida
 * Lo que sale antes de perder datos sin guardar (ver context/DatosSinGuardarContext.jsx).
 * La X y Esc solo cierran el aviso: se sigue editando. Al abrir, el foco va a la opción
 * que no pierde nada.
 *
 * Props: abierto, conRegistrar (sin ella, «Seguir aquí» en vez de «Registrar»: en Exportar
 * no hay nada que registrar), alSalir, alRegistrar, alSeguir
 */
export default function AvisoSalida({ abierto, conRegistrar, alSalir, alRegistrar, alSeguir }) {
  const seguroRef = useRef(null)

  return (
    <Modal
      abierto={abierto}
      alCerrar={alSeguir}
      titulo={AVISO_SALIDA.titulo}
      icono={<AlertTriangle />}
      rol="alertdialog"
      anchoMax="sm"
      focoInicial={seguroRef}
    >
      <CuerpoModal>
        <p>{conRegistrar ? AVISO_SALIDA.mensaje : AVISO_SALIDA.mensajeSinRegistrar}</p>
      </CuerpoModal>
      <PieModal>
        <Boton variante="fantasma" onClick={alSalir}>{AVISO_SALIDA.salir}</Boton>
        <Boton ref={seguroRef} variante="primario" onClick={conRegistrar ? alRegistrar : alSeguir}>
          {conRegistrar ? AVISO_SALIDA.registrar : AVISO_SALIDA.seguir}
        </Boton>
      </PieModal>
    </Modal>
  )
}
