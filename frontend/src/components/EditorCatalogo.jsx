import { useId, useRef, useState } from 'react'
import { Check, Pencil, Plus, Search } from 'lucide-react'
import { Boton, Campo, ConfirmDialog, CuerpoModal, Insignia, Modal, PieModal } from './common'
import { SelectorOpciones } from './AsignarMaterial'
import FichaProveedor, { fichaInicial } from './FichaProveedor'
import { getCategorias, getProductos } from '../services/api'
import { textoBusqueda } from '../utils/formato'
import { listaProductos, sinProducto, tieneProducto } from '../../../shared/productos.js'
import { normalizarFicha } from '../../../shared/proveedores.js'
import { CONFIRMAR, PANTALLA_CATALOGO } from '../utils/mensajes'
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
  const esProveedor = tipo === 'proveedor'
  const conMateriales = tipo === 'categoria' || tipo === 'producto'
  const [nombre, setNombre] = useState(registro?.nombre ?? '')
  const [ficha, setFicha] = useState(() => fichaInicial(registro?.ficha))
  const [categoria, setCategoria] = useState(registro?.categoria ?? '')
  const [productos, setProductos] = useState(() => listaProductos(registro?.producto))
  // Los materiales que ya la llevan, sin distinguir mayúsculas (un producto puede estar en la lista de varios)
  const [elegidos, setElegidos] = useState(() => new Set(
    registro ? todos.filter(m => llevaA(m, tipo, registro.nombre)).map(m => m.nombre) : []
  ))
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(null) // null | 'guardar' | 'descartar'
  const [inicial] = useState(() => ({
    nombre, categoria, productos: productos.join('\n'), elegidos: [...elegidos].sort().join('\n'), ficha: JSON.stringify(ficha),
  }))
  const cambiado = nombre !== inicial.nombre || categoria !== inicial.categoria || productos.join('\n') !== inicial.productos ||
    [...elegidos].sort().join('\n') !== inicial.elegidos || JSON.stringify(ficha) !== inicial.ficha

  // Sin cambios no hay nada que descartar: se cierra sin preguntar
  function pedirCancelar() {
    if (cambiado) setConfirmando('descartar')
    else alCerrar()
  }

  function guardar(e) {
    e.preventDefault()
    const nuevos = {}
    if (!nombre.trim()) nuevos.nombre = PANTALLA_CATALOGO.faltaNombre
    if (esMaterial && !categoria.trim()) nuevos.categoria = 'Elige o escribe una categoría'
    if (esMaterial && !productos.length) nuevos.producto = PANTALLA_CATALOGO.faltaProductos
    // La ficha se revisa con las mismas reglas que el backend (shared/proveedores.js)
    if (esProveedor) {
      try {
        normalizarFicha(ficha)
      } catch (err) {
        nuevos[err.campo] = err.message
      }
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return
    setConfirmando('guardar')
  }

  async function guardarConfirmado() {
    setGuardando(true)
    try {
      if (esMaterial) {
        await alGuardar({ nombre: nombre.trim(), categoria: categoria.trim(), productos })
      } else if (conMateriales) {
        // En el orden del catálogo
        await alGuardar({ nombre: nombre.trim(), materiales: todos.map(m => m.nombre).filter(m => elegidos.has(m)) })
      } else if (esProveedor) {
        await alGuardar({ nombre: nombre.trim(), ficha })
      } else {
        await alGuardar({ nombre: nombre.trim() })
      }
    } catch (err) {
      // El padre muestra el error; la ventana queda abierta para corregir el campo que lo causó
      if (err?.campo) setErrores(prev => ({ ...prev, [err.campo]: err.message }))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
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
          {esProveedor && (
            <FichaProveedor
              ficha={ficha}
              onCambiar={nueva => {
                setFicha(nueva)
                setErrores(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k === 'nombre')))
              }}
              errores={errores}
            />
          )}
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
                titulo={PANTALLA_CATALOGO.columnaProductos}
                nombre="producto"
                multiple
                opciones={getProductos()}
                valor={productos}
                onCambiar={v => {
                  setProductos(v)
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
          <Boton variante="fantasma" onClick={pedirCancelar}>{PANTALLA_CATALOGO.cancelar}</Boton>
          <Boton type="submit" variante="primario" icono={<Check />} cargando={guardando}>
            {guardando ? 'Guardando…' : PANTALLA_CATALOGO.guardar}
          </Boton>
        </PieModal>
      </form>

      {/* Fuera del <form>: los eventos del portal no deben llegar a su onSubmit */}
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
                const enEste = nombreActual !== '' && llevaA(m, tipo, nombreActual)
                // En un producto se dice en qué otros está (puede ir en varios); en una categoría, dónde está ahora
                const detalle = tipo === 'producto'
                  ? textos.tambienEn(sinProducto(m.producto, nombreActual))
                  : !enEste && textos.ahoraEn(tipo, m[tipo])
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
                      {detalle && <span className={estilos.opcionDetalle}>{detalle}</span>}
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

/** ¿El material va en esa categoría o en ese producto? (en un producto, dentro de su lista) */
function llevaA(material, tipo, nombre) {
  return tipo === 'producto' ? tieneProducto(material.producto, nombre) : textoBusqueda(material[tipo]) === textoBusqueda(nombre)
}
