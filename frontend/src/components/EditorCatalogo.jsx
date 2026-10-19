import { useId, useRef, useState } from 'react'
import { Check, Pencil, Plus, Search } from 'lucide-react'
import { Boton, Campo, CuerpoModal, Insignia, Modal, PieModal } from './common'
import { SelectorOpciones } from './AsignarMaterial'
import { getCategorias, getProductos } from '../services/api'
import { textoBusqueda } from '../utils/formato'
import { PANTALLA_CATALOGO } from '../utils/mensajes'
import estilos from './EditorCatalogo.module.css'

/**
 * EditorCatalogo
 * Ventana para agregar o editar una opción del catálogo (Catálogo).
 * Un material también lleva su categoría y su producto: se eligen con botones
 * y, si se escribe uno que no existe, se agrega. Una categoría o un producto
 * eligen con casillas qué materiales llevan.
 *
 * Props:
 *  - tipo: proveedor | categoria | material | producto
 *  - edicion: null (cerrado) | { registro: null } (agregar) | { registro: { nombre, categoria, producto }, uso }
 *  - materiales: todos los materiales del catálogo [{ nombre, categoria, producto }]
 *  - alGuardar({ nombre, categoria?, producto?, materiales? }): async; si lanza, la ventana sigue abierta
 *  - alCerrar()
 */
export default function EditorCatalogo({ tipo, edicion, materiales = [], alGuardar, alCerrar }) {
  const nombreRef = useRef(null)
  const nuevo = !edicion?.registro
  return (
    <Modal
      abierto={Boolean(edicion)}
      alCerrar={alCerrar}
      titulo={nuevo ? PANTALLA_CATALOGO.tituloNuevo(tipo) : PANTALLA_CATALOGO.tituloEditar(tipo)}
      icono={nuevo ? <Plus /> : <Pencil />}
      focoInicial={nombreRef}
      anchoMax={tipo === 'categoria' || tipo === 'producto' ? 'lg' : 'md'}
    >
      {edicion && (
        <Formulario
          tipo={tipo}
          edicion={edicion}
          todos={materiales}
          alGuardar={alGuardar}
          alCerrar={alCerrar}
          nombreRef={nombreRef}
        />
      )}
    </Modal>
  )
}

function Formulario({ tipo, edicion, todos, alGuardar, alCerrar, nombreRef }) {
  const registro = edicion.registro
  const esMaterial = tipo === 'material'
  const conMateriales = tipo === 'categoria' || tipo === 'producto'
  const [nombre, setNombre] = useState(registro?.nombre ?? '')
  const [categoria, setCategoria] = useState(registro?.categoria ?? '')
  const [producto, setProducto] = useState(registro?.producto ?? '')
  // Los materiales que ya la llevan, sin distinguir mayúsculas
  const [elegidos, setElegidos] = useState(() => new Set(
    registro ? todos.filter(m => textoBusqueda(m[tipo]) === textoBusqueda(registro.nombre)).map(m => m.nombre) : []
  ))
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    const nuevos = {}
    if (!nombre.trim()) nuevos.nombre = PANTALLA_CATALOGO.faltaNombre
    if (esMaterial && !categoria.trim()) nuevos.categoria = 'Elige o escribe una categoría'
    if (esMaterial && !producto.trim()) nuevos.producto = 'Elige o escribe un producto'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    setGuardando(true)
    try {
      if (esMaterial) {
        await alGuardar({ nombre: nombre.trim(), categoria: categoria.trim(), producto: producto.trim() })
      } else if (conMateriales) {
        // En el orden del catálogo
        await alGuardar({ nombre: nombre.trim(), materiales: todos.map(m => m.nombre).filter(m => elegidos.has(m)) })
      } else {
        await alGuardar({ nombre: nombre.trim() })
      }
    } catch {
      // El padre muestra el error; la ventana queda abierta para corregir
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <CuerpoModal>
        <Campo
          ref={nombreRef}
          id="editor-catalogo-nombre"
          etiqueta={PANTALLA_CATALOGO.etiquetaNombre(tipo)}
          value={nombre}
          autoComplete="off"
          onChange={e => {
            setNombre(e.target.value)
            if (errores.nombre) setErrores(prev => ({ ...prev, nombre: undefined }))
          }}
          error={errores.nombre}
          ayuda={registro ? PANTALLA_CATALOGO.ayudaRenombrar(edicion.uso ?? 0) : undefined}
        />
        {esMaterial && (
          <div className={estilos.asignacion}>
            <SelectorOpciones
              titulo="Categoría"
              nombre="categoría"
              opciones={getCategorias()}
              valor={categoria}
              onCambiar={v => {
                setCategoria(v)
                setErrores(prev => ({ ...prev, categoria: undefined }))
              }}
              error={errores.categoria}
            />
            <SelectorOpciones
              titulo="Producto"
              nombre="producto"
              opciones={getProductos()}
              valor={producto}
              onCambiar={v => {
                setProducto(v)
                setErrores(prev => ({ ...prev, producto: undefined }))
              }}
              error={errores.producto}
            />
          </div>
        )}
        {conMateriales && (
          <SelectorMateriales
            tipo={tipo}
            nombreActual={registro?.nombre ?? ''}
            todos={todos}
            elegidos={elegidos}
            onCambiar={setElegidos}
          />
        )}
      </CuerpoModal>
      <PieModal>
        <Boton variante="fantasma" onClick={alCerrar}>{PANTALLA_CATALOGO.cancelar}</Boton>
        <Boton type="submit" variante="primario" icono={<Check />} cargando={guardando}>
          {guardando ? 'Guardando…' : PANTALLA_CATALOGO.guardar}
        </Boton>
      </PieModal>
    </form>
  )
}

/**
 * Casillas con todos los materiales para elegir los que lleva una categoría o un
 * producto. Debajo de cada uno dice dónde está ahora, para saber si se cambia.
 * Los que ya la llevaban van primero (el orden no cambia al marcar o desmarcar).
 */
function SelectorMateriales({ tipo, nombreActual, todos, elegidos, onCambiar }) {
  const id = useId().replace(/:/g, '')
  const [busqueda, setBusqueda] = useState('')
  const textos = PANTALLA_CATALOGO.materiales
  const [orden] = useState(() => [
    ...todos.filter(m => elegidos.has(m.nombre)),
    ...todos.filter(m => !elegidos.has(m.nombre)),
  ])
  const buscado = textoBusqueda(busqueda.trim())
  const visibles = orden.filter(m => textoBusqueda(m.nombre).includes(buscado))

  function alternar(nombre) {
    const nuevos = new Set(elegidos)
    if (nuevos.has(nombre)) nuevos.delete(nombre)
    else nuevos.add(nombre)
    onCambiar(nuevos)
  }

  return (
    <fieldset className={estilos.materiales} aria-describedby={`${id}-nota`}>
      <legend className={estilos.leyenda}>
        {textos.titulo(tipo)}
        <Insignia tono="neutro">{textos.elegidos(elegidos.size)}</Insignia>
      </legend>
      <p id={`${id}-nota`} className={estilos.nota}>{textos.nota(tipo)}</p>

      {todos.length === 0 ? (
        <p className={estilos.vacio}>{textos.ninguno}</p>
      ) : (
        <>
          <Campo
            id={`${id}-buscar`}
            etiqueta={textos.buscar}
            etiquetaOculta
            prefijo={<Search size={16} />}
            placeholder={`${textos.buscar}…`}
            value={busqueda}
            autoComplete="off"
            onChange={e => setBusqueda(e.target.value)}
            // Enter en el buscador no guarda la ventana
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
          />
          {visibles.length === 0 ? (
            <p className={estilos.vacio}>{textos.sinResultados}</p>
          ) : (
            <ul className={estilos.opciones}>
              {visibles.map(m => {
                const enEste = nombreActual !== '' && textoBusqueda(m[tipo]) === textoBusqueda(nombreActual)
                return (
                  <li key={m.nombre}>
                    <label className={estilos.opcion}>
                      <input
                        type="checkbox"
                        className={estilos.casilla}
                        checked={elegidos.has(m.nombre)}
                        onChange={() => alternar(m.nombre)}
                      />
                      <span className={estilos.opcionNombre}>{m.nombre}</span>
                      {!enEste && <span className={estilos.opcionDetalle}>{textos.ahoraEn(tipo, m[tipo])}</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </fieldset>
  )
}
