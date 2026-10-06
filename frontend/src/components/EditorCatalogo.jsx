import { useRef, useState } from 'react'
import { Check, Pencil, Plus } from 'lucide-react'
import { Boton, Campo, CuerpoModal, Modal, PieModal } from './common'
import { SelectorOpciones } from './AsignarMaterial'
import { getCategorias, getProductos } from '../services/api'
import { CONFIGURACION } from '../utils/mensajes'
import estilos from './EditorCatalogo.module.css'

/**
 * EditorCatalogo
 * Ventana para agregar o editar una opción del catálogo (Configuración).
 * Un material también lleva su categoría y su producto: se eligen con botones
 * y, si se escribe uno que no existe, se agrega.
 *
 * Props:
 *  - tipo: proveedor | categoria | material | producto
 *  - edicion: null (cerrado) | { registro: null } (agregar) | { registro: { nombre, categoria, producto }, uso }
 *  - alGuardar({ nombre, categoria?, producto? }): async; si lanza, la ventana sigue abierta
 *  - alCerrar()
 */
export default function EditorCatalogo({ tipo, edicion, alGuardar, alCerrar }) {
  const nombreRef = useRef(null)
  const nuevo = !edicion?.registro
  return (
    <Modal
      abierto={Boolean(edicion)}
      alCerrar={alCerrar}
      titulo={nuevo ? CONFIGURACION.tituloNuevo(tipo) : CONFIGURACION.tituloEditar(tipo)}
      icono={nuevo ? <Plus /> : <Pencil />}
      focoInicial={nombreRef}
    >
      {edicion && (
        <Formulario tipo={tipo} edicion={edicion} alGuardar={alGuardar} alCerrar={alCerrar} nombreRef={nombreRef} />
      )}
    </Modal>
  )
}

function Formulario({ tipo, edicion, alGuardar, alCerrar, nombreRef }) {
  const registro = edicion.registro
  const esMaterial = tipo === 'material'
  const [nombre, setNombre] = useState(registro?.nombre ?? '')
  const [categoria, setCategoria] = useState(registro?.categoria ?? '')
  const [producto, setProducto] = useState(registro?.producto ?? '')
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    const nuevos = {}
    if (!nombre.trim()) nuevos.nombre = CONFIGURACION.faltaNombre
    if (esMaterial && !categoria.trim()) nuevos.categoria = 'Elige o escribe una categoría'
    if (esMaterial && !producto.trim()) nuevos.producto = 'Elige o escribe un producto'
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    setGuardando(true)
    try {
      await alGuardar(esMaterial
        ? { nombre: nombre.trim(), categoria: categoria.trim(), producto: producto.trim() }
        : { nombre: nombre.trim() })
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
          etiqueta={CONFIGURACION.nombre}
          value={nombre}
          autoComplete="off"
          onChange={e => {
            setNombre(e.target.value)
            if (errores.nombre) setErrores(prev => ({ ...prev, nombre: undefined }))
          }}
          error={errores.nombre}
          ayuda={registro ? CONFIGURACION.ayudaRenombrar(edicion.uso ?? 0) : undefined}
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
      </CuerpoModal>
      <PieModal>
        <Boton variante="fantasma" onClick={alCerrar}>{CONFIGURACION.cancelar}</Boton>
        <Boton type="submit" variante="primario" icono={<Check />} cargando={guardando}>
          {guardando ? 'Guardando…' : CONFIGURACION.guardar}
        </Boton>
      </PieModal>
    </form>
  )
}
