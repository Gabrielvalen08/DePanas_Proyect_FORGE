import { useRef, useState } from 'react'
import { Check, KeyRound } from 'lucide-react'
import { Boton, Campo, ConfirmDialog, CuerpoModal, Modal, PieModal } from './common'
import { MAXIMO_LARGO, MINIMO_ABSOLUTO } from '../../../shared/usuarios.js'
import { CONFIRMAR, USUARIOS } from '../utils/mensajes'
import estilos from './EditorUsuario.module.css'

const R = USUARIOS.requisitos
const OPCIONES = ['mayuscula', 'minuscula', 'numero', 'especial']

/**
 * EditorRequisitos
 * Ventana del Gestor de usuarios (solo el administrador) para elegir qué pide toda
 * contraseña nueva: un mínimo de caracteres y, si se quiere, mayúscula, minúscula,
 * número y carácter especial.
 *
 * Props:
 *  - requisitos: los actuales, o null con la ventana cerrada
 *  - alGuardar(requisitos): async; si lanza un error con `campo`, se marca y la ventana sigue abierta
 *  - alCerrar()
 */
export default function EditorRequisitos({ requisitos, abierto, alGuardar, alCerrar }) {
  const minimoRef = useRef(null)
  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo={R.tituloEditor} icono={<KeyRound />} focoInicial={minimoRef}>
      {abierto && requisitos && (
        <Formulario requisitos={requisitos} alGuardar={alGuardar} alCerrar={alCerrar} minimoRef={minimoRef} />
      )}
    </Modal>
  )
}

function Formulario({ requisitos, alGuardar, alCerrar, minimoRef }) {
  const [minimo, setMinimo] = useState(String(requisitos.minimo))
  const [opciones, setOpciones] = useState(() => Object.fromEntries(OPCIONES.map(o => [o, requisitos[o]])))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(null) // null | 'guardar' | 'descartar'
  const cambiado = Number(minimo) !== requisitos.minimo || OPCIONES.some(o => opciones[o] !== requisitos[o])

  function guardar(e) {
    e.preventDefault()
    const n = Number(minimo)
    if (!Number.isInteger(n) || n < MINIMO_ABSOLUTO || n > MAXIMO_LARGO) {
      setError(R.ayudaMinimo(MINIMO_ABSOLUTO, MAXIMO_LARGO))
      minimoRef.current?.focus()
      return
    }
    setConfirmando('guardar')
  }

  async function guardarConfirmado() {
    setGuardando(true)
    try {
      await alGuardar({ minimo: Number(minimo), ...opciones })
    } catch (err) {
      if (err?.campo === 'minimo') {
        setError(err.message)
        minimoRef.current?.focus()
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <form onSubmit={guardar} noValidate>
        <CuerpoModal>
          <div className={estilos.campos}>
            <p className={estilos.nota}>{R.intro}</p>
            <Campo
              ref={minimoRef}
              id="requisitos-minimo"
              tipo="number"
              inputMode="numeric"
              min={MINIMO_ABSOLUTO}
              max={MAXIMO_LARGO}
              step="1"
              etiqueta={R.minimo}
              value={minimo}
              onChange={e => {
                setMinimo(e.target.value)
                setError('')
              }}
              error={error}
              ayuda={R.ayudaMinimo(MINIMO_ABSOLUTO, MAXIMO_LARGO)}
            />
            <ul className={estilos.opciones}>
              {OPCIONES.map(o => (
                <li key={o}>
                  <label className={estilos.opcion}>
                    <input
                      type="checkbox"
                      className={estilos.casilla}
                      checked={opciones[o]}
                      onChange={() => setOpciones(prev => ({ ...prev, [o]: !prev[o] }))}
                    />
                    <span className={estilos.opcionTitulo}>{R.opciones[o]}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </CuerpoModal>
        <PieModal>
          <Boton variante="fantasma" onClick={() => (cambiado ? setConfirmando('descartar') : alCerrar())}>
            {USUARIOS.cancelar}
          </Boton>
          <Boton type="submit" variante="primario" icono={<Check />} cargando={guardando}>
            {guardando ? 'Guardando…' : USUARIOS.guardar}
          </Boton>
        </PieModal>
      </form>

      <ConfirmDialog
        isOpen={confirmando === 'guardar'}
        onClose={() => setConfirmando(null)}
        onConfirm={guardarConfirmado}
        title={CONFIRMAR.guardarCambios.titulo}
        message={CONFIRMAR.guardarCambios.mensaje}
        confirmLabel={CONFIRMAR.guardarCambios.confirmar}
      />
      <ConfirmDialog
        isOpen={confirmando === 'descartar'}
        onClose={() => setConfirmando(null)}
        onConfirm={alCerrar}
        title={CONFIRMAR.descartar.titulo}
        message={CONFIRMAR.descartar.mensaje}
        confirmLabel={CONFIRMAR.descartar.confirmar}
        cancelLabel={CONFIRMAR.descartar.volver}
        danger
      />
    </>
  )
}
