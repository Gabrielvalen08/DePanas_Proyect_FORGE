import { useId, useRef, useState } from 'react'
import { Check, Plus, Tags } from 'lucide-react'
import { Boton, Campo, CuerpoModal, Insignia, Modal, PieModal } from './common'
import { getCategorias, getProductos } from '../services/api'
import { textoBusqueda } from '../utils/formato'
import { ASIGNACION } from '../utils/mensajes'
import estilos from './AsignarMaterial.module.css'

/**
 * AsignarMaterial
 * Ventana emergente que pide la categoría y el producto de un material,
 * como las columnas del Excel. Solo muestra lo que le falta al material:
 * si ya tiene categoría, solo pide el producto (y al revés).
 * Las opciones son botones; al escribir se filtran, y si lo escrito no
 * existe se puede agregar como nuevo.
 *
 * Props:
 *  - material: { nombre, existe, categoria, producto } (de getAsignacion) o null para cerrar
 *  - alGuardar({ categoria, producto }): async; si lanza, la ventana sigue abierta
 *  - alCancelar()
 */
export default function AsignarMaterial({ material, alGuardar, alCancelar }) {
  const primerBuscadorRef = useRef(null)
  return (
    <Modal
      abierto={Boolean(material)}
      alCerrar={alCancelar}
      titulo={material?.existe ? ASIGNACION.tituloExistente : ASIGNACION.tituloNuevo}
      icono={<Tags />}
      focoInicial={primerBuscadorRef}
    >
      {material && (
        <Formulario material={material} alGuardar={alGuardar} alCancelar={alCancelar} primerBuscadorRef={primerBuscadorRef} />
      )}
    </Modal>
  )
}

function Formulario({ material, alGuardar, alCancelar, primerBuscadorRef }) {
  const pideCategoria = !material.categoria
  const pideProducto = !material.producto
  const [categoria, setCategoria] = useState(material.categoria)
  const [producto, setProducto] = useState(material.producto)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const nuevos = {}
    if (!categoria.trim()) nuevos.categoria = ASIGNACION.faltaCategoria
    if (!producto.trim()) nuevos.producto = ASIGNACION.faltaProducto
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    setGuardando(true)
    try {
      await alGuardar({ categoria: categoria.trim(), producto: producto.trim() })
    } catch {
      // El padre muestra el error; la ventana queda abierta para reintentar
    } finally {
      setGuardando(false)
    }
  }

  function elegir(campo, valor) {
    if (campo === 'categoria') setCategoria(valor)
    else setProducto(valor)
    setErrores(prev => ({ ...prev, [campo]: undefined }))
  }

  return (
    <>
      <CuerpoModal>
        <p className={estilos.descripcion}>
          {material.existe
            ? ASIGNACION.descripcionExistente(material.nombre, pideCategoria, pideProducto)
            : ASIGNACION.descripcionNuevo(material.nombre)}
        </p>
        {!pideCategoria && (
          <p className={estilos.asignado}>Categoría: <strong>{material.categoria}</strong></p>
        )}
        {!pideProducto && (
          <p className={estilos.asignado}>Producto: <strong>{material.producto}</strong></p>
        )}

        {pideCategoria && (
          <SelectorOpciones
            titulo="Categoría"
            nombre="categoría"
            opciones={getCategorias()}
            valor={categoria}
            onCambiar={v => elegir('categoria', v)}
            error={errores.categoria}
            buscadorRef={primerBuscadorRef}
          />
        )}
        {pideProducto && (
          <SelectorOpciones
            titulo="Producto"
            nombre="producto"
            opciones={getProductos()}
            valor={producto}
            onCambiar={v => elegir('producto', v)}
            error={errores.producto}
            buscadorRef={pideCategoria ? undefined : primerBuscadorRef}
          />
        )}
      </CuerpoModal>
      <PieModal>
        <Boton variante="fantasma" onClick={alCancelar}>{ASIGNACION.ahoraNo}</Boton>
        <Boton variante="primario" icono={<Check />} cargando={guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : ASIGNACION.guardar}
        </Boton>
      </PieModal>
    </>
  )
}

/**
 * Botones de selección con un buscador: escribir filtra las opciones y,
 * si lo escrito no existe, ofrece agregarlo como nuevo.
 */
export function SelectorOpciones({ titulo, nombre, opciones, valor, onCambiar, error, buscadorRef: refExterna }) {
  const id = useId().replace(/:/g, '')
  const refPropia = useRef(null)
  const buscadorRef = refExterna ?? refPropia
  const [busqueda, setBusqueda] = useState('')

  const buscado = textoBusqueda(busqueda.trim())
  const visibles = opciones.filter(o => textoBusqueda(o).includes(buscado))
  const exacta = opciones.find(o => textoBusqueda(o) === buscado)
  const esNueva = Boolean(valor) && !opciones.some(o => textoBusqueda(o) === textoBusqueda(valor))
  const puedeAgregar = Boolean(buscado) && !exacta && textoBusqueda(valor) !== buscado

  function agregar() {
    onCambiar(busqueda.trim())
    setBusqueda('')
    buscadorRef.current?.focus()
  }

  function alTeclear(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (exacta) {
      onCambiar(exacta)
      setBusqueda('')
    } else if (puedeAgregar) {
      agregar()
    }
  }

  return (
    <fieldset className={estilos.grupo} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={estilos.titulo}>{titulo}</legend>
      <Campo
        ref={buscadorRef}
        id={`${id}-buscar`}
        etiqueta={`Buscar o agregar ${nombre}`}
        etiquetaOculta
        placeholder={nombre === 'categoría' ? 'Buscar o escribir categoría nueva…' : 'Buscar o escribir producto nuevo…'}
        value={busqueda}
        autoComplete="off"
        onChange={e => setBusqueda(e.target.value)}
        onKeyDown={alTeclear}
      />

      <div className={estilos.opciones}>
        {esNueva && (
          <button type="button" aria-pressed="true" className={[estilos.opcion, estilos.elegida].join(' ')}>
            <Check size={14} aria-hidden="true" />
            {valor}
            <Insignia tono="marca" className={estilos.nueva}>Nueva</Insignia>
          </button>
        )}
        {visibles.map(o => {
          const elegida = textoBusqueda(o) === textoBusqueda(valor)
          return (
            <button
              key={o}
              type="button"
              aria-pressed={elegida}
              className={[estilos.opcion, elegida && estilos.elegida].filter(Boolean).join(' ')}
              onClick={() => onCambiar(o)}
            >
              {elegida && <Check size={14} aria-hidden="true" />}
              {o}
            </button>
          )
        })}
        {puedeAgregar && (
          <button type="button" className={[estilos.opcion, estilos.agregar].join(' ')} onClick={agregar}>
            <Plus size={14} aria-hidden="true" />
            Agregar «{busqueda.trim()}»
          </button>
        )}
        {visibles.length === 0 && !puedeAgregar && (
          <p className={estilos.vacio}>{ASIGNACION.sinCoincidencias}</p>
        )}
      </div>

      {puedeAgregar && (
        <p className={estilos.aviso} aria-live="polite">
          {ASIGNACION.noExiste(busqueda.trim(), nombre === 'categoría')}
        </p>
      )}
      {error && <p id={`${id}-error`} className={estilos.error} role="alert">{error}</p>}
    </fieldset>
  )
}
