import { useCallback, useId, useRef, useState } from 'react'
import { Check, Pencil, Plus, Tags } from 'lucide-react'
import { AvisoDestacado, Boton, Campo, ConfirmDialog, CuerpoModal, Insignia, Modal, PieModal } from './common'
import { useCierreConAviso, useDatosSinGuardar } from '../context/DatosSinGuardarContext'
import { getAsignacion, getCategorias, getCategoriasDeProveedor, getComprasDeMaterial, getMateriales, getProductos } from '../services/api'
import { textoBusqueda } from '../utils/formato'
import { ASIGNACION, CONFIRMAR, NOMBRE_PARECIDO } from '../utils/mensajes'
import { nombreParecido } from '../utils/parecidos'
import estilos from './AsignarMaterial.module.css'

const mismoNombre = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()

/**
 * AsignarMaterial
 * Ventana para crear un artículo o editar su nombre, su categoría y sus productos,
 * como las columnas del Excel (un artículo puede ir en varios productos). Las opciones
 * son botones; al escribir se filtran, y si lo escrito no existe se puede agregar como nuevo.
 *
 * Según material.modo:
 *  - nuevo: aún no está registrado; todo se llena (el nombre viene de lo escrito en la fila).
 *  - editar: ya registrado y con permiso; todo viene lleno y se puede cambiar.
 *  - completar: ya registrado y sin permiso para editar; solo se pide lo que le falta.
 *
 * Props:
 * La categoría es obligatoria al guardar; los productos no (no todo artículo va en un producto).
 *
 * Props:
 *  - material: { nombre, existe, categoria, producto, productos, modo, pedido, marcado } o null para cerrar.
 *    pedido: la ventana la abrió el sistema o el «+» (ofrece «Ahora no»); si no, el lápiz (ofrece «Cancelar»).
 *    marcado: ya se dijo «Ahora no»; se recuerda qué le falta
 *  - proveedor: el de la compra (sus categorías van primero)
 *  - alGuardar({ nombre, categoria, productos }): async; si lanza, la ventana sigue abierta
 *  - alOmitir(): «Ahora no» (o Guardar sin nada nuevo); la compra sigue su curso sin estos datos
 *  - alCerrar(): Cancelar, la X, Esc o el clic fuera
 */
export default function AsignarMaterial({ material, proveedor, alGuardar, alOmitir, alCerrar }) {
  const nombreRef = useRef(null)
  const primerBuscadorRef = useRef(null)
  const { intentarCerrar, cierreRef } = useCierreConAviso(alCerrar)
  // Con el nombre ya escrito se sigue con la categoría; al editar o sin nombre, se empieza por él
  const empiezaEnNombre = material?.modo === 'editar' ? !material.pedido : material?.modo === 'nuevo' && !material.nombre
  const titulo = material?.modo === 'nuevo'
    ? ASIGNACION.tituloNuevo
    : material?.pedido ? ASIGNACION.tituloExistente : ASIGNACION.tituloEditar
  return (
    <Modal
      abierto={Boolean(material)}
      alCerrar={intentarCerrar}
      titulo={titulo}
      icono={material && !material.pedido ? <Pencil /> : <Tags />}
      focoInicial={empiezaEnNombre ? nombreRef : primerBuscadorRef}
    >
      {material && (
        <Formulario
          material={material}
          proveedor={proveedor}
          alGuardar={alGuardar}
          alSalir={material.pedido ? alOmitir : alCerrar}
          nombreRef={nombreRef}
          primerBuscadorRef={primerBuscadorRef}
          cierreRef={cierreRef}
        />
      )}
    </Modal>
  )
}

function Formulario({ material, proveedor, alGuardar, alSalir, nombreRef, primerBuscadorRef, cierreRef }) {
  const completando = material.modo === 'completar'
  // Al completar, lo que ya tiene se muestra y no se cambia (eso es editar el catálogo)
  const pideCategoria = !completando || !material.categoria
  const pideProducto = !completando || !material.productos?.length
  const [nombre, setNombre] = useState(material.nombre)
  const [categoria, setCategoria] = useState(material.categoria)
  const [productos, setProductos] = useState(material.productos ?? [])
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(null) // null | 'guardar' | 'descartar'
  // Las categorías que ya surte el proveedor de la compra van primero
  const [categorias] = useState(() => {
    const delProveedor = getCategoriasDeProveedor(proveedor)
    const suyas = new Set(delProveedor.map(c => textoBusqueda(c)))
    return [...delProveedor, ...getCategorias().filter(c => !suyas.has(textoBusqueda(c)))]
  })

  const cambiado = nombre.trim() !== material.nombre.trim() || categoria.trim() !== material.categoria ||
    productos.join('\n') !== (material.productos ?? []).join('\n')
  const formRef = useRef(null)
  const registrarDesdeAviso = useCallback(() => formRef.current?.requestSubmit(), [])
  const avisoSalida = useDatosSinGuardar({ sucio: cambiado, registrar: registrarDesdeAviso, cierreRef })

  // Sin cambios no hay nada que descartar: se cierra sin preguntar
  function pedirCancelar() {
    if (cambiado) setConfirmando('descartar')
    else alSalir()
  }

  // Solo una sugerencia: no impide guardar. Un artículo ya registrado no se compara consigo mismo
  const parecido = completando ? null : nombreParecido(nombre, getMateriales(), { excluir: material.existe ? material.nombre : undefined })

  function guardar(e) {
    e.preventDefault()
    const nuevos = {}
    const limpio = nombre.trim()
    if (!limpio) nuevos.nombre = ASIGNACION.faltaNombre
    else if (!mismoNombre(limpio, material.nombre) && getAsignacion(limpio).existe) {
      nuevos.nombre = ASIGNACION.yaExiste(getAsignacion(limpio).nombre)
    }
    if (!categoria.trim()) nuevos.categoria = ASIGNACION.faltaCategoria
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) {
      avisoSalida.terminar(false)
      return
    }
    // Un artículo registrado sin ningún cambio: no hay nada que confirmar ni guardar
    if (material.existe && !cambiado) {
      avisoSalida.terminar(true)
      alSalir()
      return
    }
    setConfirmando('guardar')
  }

  async function guardarConfirmado() {
    avisoSalida.aceptar()
    setGuardando(true)
    try {
      await alGuardar({ nombre: nombre.trim(), categoria: categoria.trim(), productos })
      avisoSalida.terminar(true)
    } catch (err) {
      // El padre muestra el error; la ventana queda abierta para corregir el campo que lo causó
      if (err?.campo) setErrores(prev => ({ ...prev, [err.campo]: err.message }))
      avisoSalida.terminar(false)
    } finally {
      setGuardando(false)
    }
  }

  function elegir(campo, valor) {
    if (campo === 'categoria') setCategoria(valor)
    else setProductos(valor)
    setErrores(prev => ({ ...prev, [campo]: undefined }))
  }

  return (
    <>
      <form ref={formRef} onSubmit={guardar} noValidate>
        <CuerpoModal>
          {material.marcado && (
            <AvisoDestacado texto={ASIGNACION.faltaInformacion(!material.categoria, !material.productos?.length)} />
          )}
          {proveedor && (
            <p className={estilos.asignado}>Proveedor: <strong>{proveedor}</strong></p>
          )}
          {completando && (
            <p className={estilos.asignado}>{ASIGNACION.etiquetaArticulo}: <strong>{material.nombre}</strong></p>
          )}
          {!pideCategoria && (
            <p className={estilos.asignado}>Categoría: <strong>{material.categoria}</strong></p>
          )}
          {!pideProducto && (
            <p className={estilos.asignado}>{ASIGNACION.etiquetaProductos}: <strong>{material.producto}</strong></p>
          )}

          {!completando && (
            <fieldset className={estilos.grupo}>
              <legend className={estilos.titulo}>{ASIGNACION.etiquetaArticulo}</legend>
              <div>
                <Campo
                  ref={nombreRef}
                  id="asignar-material-nombre"
                  etiqueta={ASIGNACION.nombreArticulo}
                  etiquetaOculta
                  value={nombre}
                  autoComplete="off"
                  aria-describedby={parecido ? 'asignar-material-parecido' : undefined}
                  onChange={e => {
                    setNombre(e.target.value)
                    setErrores(prev => ({ ...prev, nombre: undefined }))
                  }}
                  error={errores.nombre}
                />
                <AvisoDestacado
                  id="asignar-material-parecido"
                  texto={parecido && NOMBRE_PARECIDO.aviso(nombre, parecido, 'material')}
                />
              </div>
            </fieldset>
          )}
          {(pideCategoria || pideProducto) && <p className={estilos.ayuda}>{ASIGNACION.ayudaBuscador}</p>}
          {pideCategoria && (
            <SelectorOpciones
              titulo="Categoría"
              nombre="categoría"
              opciones={categorias}
              valor={categoria}
              onCambiar={v => elegir('categoria', v)}
              error={errores.categoria}
              buscadorRef={primerBuscadorRef}
            />
          )}
          {pideProducto && (
            <SelectorOpciones
              titulo={ASIGNACION.etiquetaProductos}
              nombre="producto"
              multiple
              opciones={getProductos()}
              valor={productos}
              onCambiar={v => elegir('producto', v)}
              error={errores.producto}
              buscadorRef={pideCategoria ? undefined : primerBuscadorRef}
            />
          )}
        </CuerpoModal>
        <PieModal>
          <Boton variante="fantasma" onClick={pedirCancelar}>{material.pedido ? ASIGNACION.ahoraNo : ASIGNACION.cancelar}</Boton>
          <Boton type="submit" variante="primario" icono={<Check />} cargando={guardando}>
            {guardando ? 'Guardando…' : ASIGNACION.guardar}
          </Boton>
        </PieModal>
      </form>

      {/* Fuera del <form>: los eventos del portal no deben llegar a su onSubmit */}
      <ConfirmDialog
        isOpen={confirmando === 'guardar'}
        onClose={() => {
          setConfirmando(null)
          avisoSalida.cerrar()
        }}
        onConfirm={guardarConfirmado}
        title={ASIGNACION.confirmar.titulo}
        message={ASIGNACION.confirmar.mensaje({
          modo: material.modo,
          anterior: material.nombre,
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          productos,
          compras: material.existe ? getComprasDeMaterial(material.nombre) : 0,
        })}
        confirmLabel={ASIGNACION.confirmar.confirmar}
      />
      <ConfirmDialog
        isOpen={confirmando === 'descartar'}
        onClose={() => setConfirmando(null)}
        onConfirm={() => {
          avisoSalida.descartar()
          alSalir()
        }}
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
 * Botones de selección con un buscador: escribir filtra las opciones y,
 * si lo escrito no existe, ofrece agregarlo como nuevo.
 * Con `multiple`, `valor` es una lista y cada botón suma o quita su opción
 * (un artículo puede ir en varios productos); si no, `valor` es un texto.
 * Con `permitirNuevas={false}` solo se elige entre las opciones (p. ej. proveedores,
 * que se crean con su ficha). `ayuda` es un texto bajo el título.
 */
export function SelectorOpciones({
  titulo, nombre, opciones, valor, onCambiar, error, buscadorRef: refExterna, multiple = false, permitirNuevas = true, ayuda,
}) {
  const id = useId().replace(/:/g, '')
  const refPropia = useRef(null)
  const buscadorRef = refExterna ?? refPropia
  const [busqueda, setBusqueda] = useState('')

  const elegidas = multiple ? valor : valor ? [valor] : []
  const estaElegida = o => elegidas.some(e => textoBusqueda(e) === textoBusqueda(o))
  const buscado = textoBusqueda(busqueda.trim())
  const visibles = opciones.filter(o => textoBusqueda(o).includes(buscado))
  const exacta = opciones.find(o => textoBusqueda(o) === buscado)
  // Lo escrito que aún no está en el catálogo (se crea al guardar)
  const nuevas = elegidas.filter(e => !opciones.some(o => textoBusqueda(o) === textoBusqueda(e)))
  const puedeAgregar = permitirNuevas && Boolean(buscado) && !exacta && !elegidas.some(e => textoBusqueda(e) === buscado)
  // Con nombres de producto la coma separa la lista: no se puede agregar uno con coma
  const conComa = multiple && nombre === 'producto' && busqueda.includes(',')
  // Lo escrito (o lo último agregado como nuevo) puede ser un error de dedo de una opción que ya existe
  const porRevisar = !permitirNuevas ? '' : puedeAgregar ? busqueda : nuevas[nuevas.length - 1] ?? ''
  const parecida = nombreParecido(porRevisar, opciones)

  function alternar(opcion) {
    if (!multiple) return onCambiar(opcion)
    onCambiar(estaElegida(opcion) ? elegidas.filter(e => textoBusqueda(e) !== textoBusqueda(opcion)) : [...elegidas, opcion])
  }

  function agregar() {
    if (conComa) return
    alternar(busqueda.trim())
    setBusqueda('')
    buscadorRef.current?.focus()
  }

  function alTeclear(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (exacta) {
      if (!multiple || !estaElegida(exacta)) alternar(exacta)
      setBusqueda('')
    } else if (puedeAgregar) {
      agregar()
    }
  }

  return (
    <fieldset
      className={estilos.grupo}
      aria-describedby={[ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
    >
      <legend className={estilos.titulo}>{titulo}</legend>
      {ayuda && <p id={`${id}-ayuda`} className={estilos.ayuda}>{ayuda}</p>}
      <div>
        <Campo
          ref={buscadorRef}
          id={`${id}-buscar`}
          etiqueta={permitirNuevas ? `Buscar o agregar ${nombre}` : `Buscar ${nombre}`}
          etiquetaOculta
          placeholder={!permitirNuevas
            ? `Buscar ${nombre}…`
            : nombre === 'categoría' ? 'Buscar o escribir categoría nueva…' : `Buscar o escribir ${nombre} nuevo…`}
          value={busqueda}
          autoComplete="off"
          aria-describedby={parecida ? `${id}-parecido` : undefined}
          onChange={e => setBusqueda(e.target.value)}
          onKeyDown={alTeclear}
        />
        <AvisoDestacado
          id={`${id}-parecido`}
          texto={parecida && NOMBRE_PARECIDO.aviso(porRevisar, parecida, nombre === 'categoría' ? 'categoria' : 'producto')}
        />
      </div>

      <div className={estilos.opciones}>
        {nuevas.map(n => (
          <button
            key={`nueva-${n}`}
            type="button"
            aria-pressed="true"
            className={[estilos.opcion, estilos.elegida].join(' ')}
            onClick={() => multiple && alternar(n)}
          >
            <Check size={14} aria-hidden="true" />
            {n}
            <Insignia tono="marca" className={estilos.nueva}>Nueva</Insignia>
          </button>
        ))}
        {visibles.map(o => {
          const elegida = estaElegida(o)
          return (
            <button
              key={o}
              type="button"
              aria-pressed={elegida}
              className={[estilos.opcion, elegida && estilos.elegida].filter(Boolean).join(' ')}
              onClick={() => alternar(o)}
            >
              {elegida && <Check size={14} aria-hidden="true" />}
              {o}
            </button>
          )
        })}
        {puedeAgregar && !conComa && (
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
          {conComa ? ASIGNACION.productoConComa : ASIGNACION.noExiste(busqueda.trim(), nombre === 'categoría', nombre === 'proveedor')}
        </p>
      )}
      {error && <p id={`${id}-error`} className={estilos.error} role="alert">{error}</p>}
    </fieldset>
  )
}
