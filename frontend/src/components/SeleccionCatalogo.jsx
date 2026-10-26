import { useId, useRef, useState } from 'react'
import { Download, Search, Upload } from 'lucide-react'
import { Boton, Campo, ConfirmDialog, CuerpoModal, Insignia, Modal, PieModal } from './common'
import { textoBusqueda } from '../utils/formato'
import { PANTALLA_CATALOGO } from '../utils/mensajes'
import estilos from './SeleccionCatalogo.module.css'

/**
 * SeleccionCatalogo
 * Ventana para elegir qué ítems de una sección del Catálogo se exportan o se cargan.
 * Todo empieza elegido; el buscador filtra sin perder lo elegido y «Elegir todos» /
 * «Quitar todos» actúan sobre lo que se ve. El botón del pie pide confirmación
 * (ConfirmDialog) con la cantidad elegida.
 *
 * Props:
 *  - tipo: proveedor | categoria | material | producto
 *  - accion: null (cerrada) | 'xlsx' | 'json' | 'cargar'
 *  - filas: filas en formato de respaldo (shared/catalogo-json.js)
 *  - archivo: nombre del archivo (al cargar)
 *  - existentes: Set de nombres en minúsculas del catálogo (al cargar: «Nuevo» o «Ya existe»)
 *  - alConfirmar(filasElegidas): async
 *  - alCerrar()
 */
export default function SeleccionCatalogo({ tipo, accion, filas = [], archivo, existentes, alConfirmar, alCerrar }) {
  const buscadorRef = useRef(null)
  return (
    <Modal
      abierto={Boolean(accion)}
      alCerrar={alCerrar}
      titulo={accion ? PANTALLA_CATALOGO.archivo.seleccion.titulo(tipo, accion, archivo) : ''}
      icono={accion === 'cargar' ? <Upload /> : <Download />}
      focoInicial={buscadorRef}
      anchoMax="md"
    >
      {accion && (
        // key: si se abre otra ventana mientras la anterior aún se cierra (animación), la
        // lista empieza de cero en vez de conservar lo elegido en la anterior
        <Lista
          key={`${accion}|${archivo ?? ''}`}
          tipo={tipo}
          accion={accion}
          filas={filas}
          archivo={archivo}
          existentes={existentes}
          alConfirmar={alConfirmar}
          alCerrar={alCerrar}
          buscadorRef={buscadorRef}
        />
      )}
    </Modal>
  )
}

const clave = nombre => nombre.toLowerCase()

/** Dato que acompaña a cada ítem, según la sección */
function detalleDe(tipo, fila) {
  const S = PANTALLA_CATALOGO.archivo.seleccion
  if (tipo === 'proveedor') return fila.ubicacion || S.sinUbicacion
  if (tipo === 'material') return fila.categoria || S.sinCategoria
  const n = S.articulos(fila.articulos?.length ?? 0)
  return tipo === 'categoria' && fila.proveedores?.length ? `${n} · ${fila.proveedores.join(', ')}` : n
}

function Lista({ tipo, accion, filas, archivo, existentes, alConfirmar, alCerrar, buscadorRef }) {
  const id = useId().replace(/:/g, '')
  const S = PANTALLA_CATALOGO.archivo.seleccion
  const A = PANTALLA_CATALOGO.archivo
  const [elegidos, setElegidos] = useState(() => new Set(filas.map(f => clave(f.nombre))))
  const [busqueda, setBusqueda] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const cargar = accion === 'cargar'

  const buscado = textoBusqueda(busqueda.trim())
  const visibles = filas.filter(f => textoBusqueda(f.nombre).includes(buscado))
  const elegidas = filas.filter(f => elegidos.has(clave(f.nombre)))

  function alternar(nombre) {
    setElegidos(prev => {
      const nuevos = new Set(prev)
      if (nuevos.has(clave(nombre))) nuevos.delete(clave(nombre))
      else nuevos.add(clave(nombre))
      return nuevos
    })
  }

  /** Elige o quita todos los que se ven con el buscador; los ocultos quedan como estaban */
  function marcarVisibles(elegir) {
    setElegidos(prev => {
      const nuevos = new Set(prev)
      for (const f of visibles) {
        if (elegir) nuevos.add(clave(f.nombre))
        else nuevos.delete(clave(f.nombre))
      }
      return nuevos
    })
  }

  return (
    <>
      <CuerpoModal>
        <p className={estilos.ayuda}>{S.ayuda(accion)}</p>
        <div className={estilos.barra}>
          <Campo
            ref={buscadorRef}
            id={`${id}-buscar`}
            etiqueta={S.buscar(tipo)}
            etiquetaOculta
            prefijo={<Search size={16} />}
            placeholder={`${S.buscar(tipo)}…`}
            value={busqueda}
            autoComplete="off"
            onChange={e => setBusqueda(e.target.value)}
            className={estilos.buscador}
          />
          <div className={estilos.acciones}>
            <Boton variante="secundario" onClick={() => marcarVisibles(true)} disabled={visibles.length === 0}>
              {S.elegirTodos}
            </Boton>
            <Boton variante="fantasma" onClick={() => marcarVisibles(false)} disabled={visibles.length === 0}>
              {S.quitarTodos}
            </Boton>
          </div>
        </div>

        <fieldset className={estilos.grupo} aria-describedby={`${id}-cuenta`}>
          <legend className="solo-lector">{PANTALLA_CATALOGO.secciones[tipo].titulo}</legend>
          {visibles.length === 0 ? (
            <p className={estilos.vacio}>{S.sinResultados}</p>
          ) : (
            <ul className={estilos.lista}>
              {visibles.map(f => {
                const existe = existentes?.has(clave(f.nombre))
                return (
                  <li key={f.nombre}>
                    <label className={estilos.opcion}>
                      <input
                        type="checkbox"
                        className={estilos.casilla}
                        checked={elegidos.has(clave(f.nombre))}
                        onChange={() => alternar(f.nombre)}
                      />
                      <span className={estilos.nombre}>{f.nombre}</span>
                      {cargar && (
                        <Insignia tono={existe ? 'neutro' : 'marca'} className={estilos.insignia}>
                          {existe ? S.yaExiste : S.nuevo}
                        </Insignia>
                      )}
                      <span className={estilos.detalle}>{detalleDe(tipo, f)}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </fieldset>
        <p id={`${id}-cuenta`} className={estilos.cuenta} aria-live="polite">
          {elegidas.length === 0 ? S.ninguno : S.cuenta(elegidas.length, filas.length)}
        </p>
      </CuerpoModal>
      <PieModal>
        <Boton variante="fantasma" onClick={alCerrar}>{S.cancelar}</Boton>
        <Boton
          variante="primario"
          icono={cargar ? <Upload /> : <Download />}
          disabled={elegidas.length === 0}
          onClick={() => setConfirmando(true)}
        >
          {S.boton(accion, elegidas.length)}
        </Boton>
      </PieModal>

      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={() => alConfirmar(elegidas)}
        title={cargar ? A.confirmarCargar.titulo(tipo) : A.confirmarExportar.titulo}
        message={cargar
          ? A.confirmarCargar.mensaje(tipo, elegidas.length, archivo)
          : A.confirmarExportar.mensaje(tipo, elegidas.length, accion)}
        confirmLabel={cargar ? A.confirmarCargar.confirmar : A.confirmarExportar.confirmar}
      />
    </>
  )
}
