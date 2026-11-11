import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import AutocompleteInput from './AutocompleteInput'
import AsignarMaterial from './AsignarMaterial'
import { AvisoDestacado, Boton, Campo, CampoMoneda, ConfirmDialog, Selector } from './common'
import ResumenCompra from './ResumenCompra'
import { asignarMaterial, editarEnCatalogo, getAsignacion, getIvaPorProveedor, getMaterialesPorProveedor, getPrecioSugerido, getProveedores, necesitaAsignacion } from '../services/api'
import { aCentavos, calcularIva, ivaDe } from '../../../shared/iva.js'
import { useToast } from '../context/ToastContext'
import { useDatosSinGuardar } from '../context/DatosSinGuardarContext'
import { EVENTO_ARTICULO_RENOMBRADO } from '../utils/eventos'
import { ASIGNACION, COMPRA, NOMBRE_PARECIDO, VALIDACION } from '../utils/mensajes'
import { nombreParecido } from '../utils/parecidos'
import { fechaHoyISO, formatearPrecio, textoBusqueda } from '../utils/formato'
import { springSuave } from '../styles/movimiento'
import estilos from './BloqueCompra.module.css'

export const UNIDADES = ['lb', 'kg', 'g', 'oz', 'galon', 'litro', 'ml', 'unidad', 'caja', 'bolsa']
// La unidad arranca en blanco: se elige (o la trae el precio sugerido)
const OPCIONES_UNIDAD = [{ valor: '', texto: '' }, ...UNIDADES]

// Campos obligatorios de cada fila (en el orden en que aparecen)
const CAMPOS_FILA = [
  { clave: 'material', nombre: 'Artículo' },
  { clave: 'cantidad', nombre: 'Cantidad' },
  { clave: 'unidad',   nombre: 'Unidad' },
  { clave: 'precio',   nombre: 'Precio unitario' },
]

let siguienteIdFila = 1

const redondear = (valor, decimales) => Math.round(valor * 10 ** decimales) / 10 ** decimales
// Como el catálogo: sin distinguir mayúsculas ni espacios en los extremos
const claveNombre = nombre => (nombre || '').trim().toLowerCase()

function filaVacia() {
  return { id: siguienteIdFila++, material: '', cantidad: '', unidad: '', precio: '' }
}

/**
 * Monto de la fila: cantidad × precio unitario, redondeado a centavos. Un monto
 * escrito a mano (montoEscrito) se conserva exacto aunque cambie la cantidad; el
 * de una compra guardada, hasta que se toque la cantidad o el precio (el precio
 * unitario mostrado va redondeado).
 */
function montoDe(fila) {
  if (fila.montoOriginal !== undefined) return fila.montoOriginal
  const cantidad = Number(fila.cantidad)
  const precio = Number(fila.precio)
  return cantidad > 0 && precio > 0 ? redondear(cantidad * precio, 2) : 0
}

/** Precio unitario de un monto escrito; sin cantidad válida todavía no hay precio */
function precioDesdeMonto(monto, cantidad) {
  return Number(cantidad) > 0 ? String(redondear(monto / Number(cantidad), 4)) : ''
}

function filasDesde(materiales) {
  if (!materiales?.length) return [filaVacia()]
  return materiales.map(m => {
    const monto = Number(m.monto !== undefined ? m.monto : m.precio) || 0
    const cantidad = Number(m.cantidad)
    return {
      id: siguienteIdFila++,
      material: m.material,
      cantidad: String(m.cantidad),
      unidad: m.unidad || '',
      // Precio exacto (puede ser de menos de un centavo, p. ej. por gramo) y monto guardado intacto
      precio: monto > 0 && cantidad > 0 ? String(redondear(monto / cantidad, 4)) : '',
      montoOriginal: monto > 0 ? monto : undefined,
    }
  })
}

// Una fila sin material, cantidad ni monto no cuenta: se ignora al guardar
function estaVacia(fila) {
  return !fila.material.trim() && !fila.cantidad && !fila.precio && fila.montoOriginal === undefined
}

/** Lo que se guardaría, para saber si una compra cambió. Llevar o no IVA también cuenta */
function firmaCompra(proveedor, fecha, filas, conIva) {
  return JSON.stringify([
    proveedor.trim(),
    fecha,
    Boolean(conIva),
    filas.filter(f => !estaVacia(f)).map(f => [f.material.trim(), Number(f.cantidad), f.unidad, montoDe(f)]),
  ])
}

function validarFila(fila) {
  const errores = {}
  if (!fila.material.trim()) errores.material = VALIDACION.material
  const cantidadValida = Boolean(fila.cantidad) && !isNaN(fila.cantidad) && Number(fila.cantidad) > 0
  if (!cantidadValida) errores.cantidad = VALIDACION.cantidad
  if (!fila.unidad) errores.unidad = VALIDACION.unidad
  // Con cantidad válida, el monto (cantidad × precio, a centavos) tampoco puede quedar en 0
  // Un monto escrito, o el de una compra guardada que nadie tocó, se conserva: su precio no se revisa
  const precioIntacto = fila.montoOriginal !== undefined
  if (!precioIntacto && (!fila.precio || isNaN(fila.precio) || Number(fila.precio) <= 0 || (cantidadValida && montoDe(fila) <= 0)))
    errores.precio = VALIDACION.precio
  return errores
}

/** La fila tiene todo lo que hace falta para guardarla: artículo, cantidad, unidad y monto */
const filaCompleta = fila => Object.keys(validarFila(fila)).length === 0

function validarEncabezado(campo, valor) {
  if (campo === 'proveedor' && !valor.trim()) return VALIDACION.proveedor
  if (campo === 'fecha' && !valor) return VALIDACION.fecha
  return undefined
}

const clave   = (filaId, campo) => `${filaId}-${campo}`
// Como el buscador de Excel: coincide en cualquier parte y sin distinguir tildes ni mayúsculas
const filtrar = (lista, texto) => lista.filter(x => textoBusqueda(x).includes(textoBusqueda(texto.trim())))

/**
 * BloqueCompra
 * Formulario de una lista de compra: fecha y proveedor en el encabezado,
 * y filas de materiales (material, cantidad + unidad, precio unitario y monto).
 * Se escribe el precio unitario o el monto y el otro se calcula; al cambiar la
 * cantidad se mantiene el último escrito. Al elegir un material se sugiere el
 * precio unitario de su última compra (con su unidad); se puede cambiar y la
 * compra guardada pasa a ser la nueva referencia.
 * Cada material lleva su categoría y su producto (como en el Excel): si se
 * escribe uno nuevo o sin asignar, se piden en una ventana emergente
 * (AsignarMaterial) al elegirlo, al salir del campo o al guardar, solo si el
 * artículo nunca se ha comprado. Con «Ahora no» la compra se guarda igual y la
 * fila queda en rojo con una señal; la siguiente compra ya no pide nada.
 * Junto a cada artículo hay un botón: «+» si el campo está vacío o el artículo no
 * está registrado (crea uno nuevo); lápiz si ya está registrado (edita su nombre,
 * categoría y productos en el catálogo y en sus compras).
 *
 * Compra nueva, por pasos (solo se ve lo que toca llenar, nada apagado en gris):
 *  1. Fecha y proveedor.
 *  2. Con proveedor, la primera fila.
 *  3. Con una fila completa: la fila «Agregar otro artículo» (solo si la última está
 *     completa), subtotal, IVA, total, Guardar y Cancelar.
 * Al editar una compra guardada (inicial) se ve todo de una vez.
 *
 * Props:
 *  - titulo: texto del encabezado (por defecto "Detalle de compra")
 *  - inicial: { proveedor, fecha, materiales } para editar
 *  - alGuardar(lista): async; si se resuelve, se llama a alGuardado
 *  - alGuardado(lista), alCancelar()
 *  - cancelarVacio: deja Cancelar activo aunque no haya nada (para quitar un bloque vacío)
 *  - textoGuardar, enfocarAlMontar, plano (sin tarjeta, p. ej. dentro de un modal;
 *    el título solo queda para lectores de pantalla porque el modal ya trae el suyo)
 *  - cierreRef: dentro de una ventana, para que su X, Esc y clic fuera pasen por el aviso
 *    de datos sin guardar (ver context/DatosSinGuardarContext.jsx)
 *  - puedeEditarArticulo: el usuario tiene catalogo.editar; sin él, el lápiz sale apagado
 *  - alCambiarProgreso(listo): avisa cuándo la compra nueva llega (o deja de llegar) al paso 3
 */
export default function BloqueCompra({
  titulo = 'Detalle de compra',
  inicial,
  alGuardar,
  alGuardado,
  alCancelar,
  textoGuardar = 'Guardar compra',
  enfocarAlMontar = false,
  plano = false,
  cancelarVacio = false,
  cierreRef,
  puedeEditarArticulo = false,
  alCambiarProgreso,
}) {
  const id = useId().replace(/:/g, '')
  const [proveedor, setProveedor] = useState(inicial?.proveedor ?? '')
  const [fecha, setFecha]         = useState(inicial?.fecha ?? fechaHoyISO())
  const [filas, setFilas]         = useState(() => filasDesde(inicial?.materiales || inicial?.productos))
  const [conIva, setConIva]       = useState(() => ivaDe(inicial) > 0)
  const ivaTocado = useRef(false) // en una compra nueva la casilla sigue al proveedor hasta que alguien la toque
  const [errores, setErrores]     = useState({})
  const [guardando, setGuardando] = useState(false)
  // Tras un error (datos inválidos o fallo al guardar) Guardar se apaga hasta que se cambie algo
  const [bloqueado, setBloqueado] = useState(false)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [porAsignar, setPorAsignar] = useState(null) // material en la ventana emergente
  const [porConfirmar, setPorConfirmar] = useState(null) // lista lista para guardar, a la espera del Sí
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
  const { addToast } = useToast()

  const formRef        = useRef(null)
  const [omitidos, setOmitidos] = useState(() => new Set()) // "Ahora no": no se vuelve a pedir y la fila queda marcada
  const [proveedorRevisado, setProveedorRevisado] = useState(false) // al salir del campo se avisa si se parece a otro
  const guardarDespues = useRef(false)     // la ventana se abrió al guardar: se guarda al terminar

  const campoPorEnfocar = useRef(null) // tras un intento fallido de guardar, el primer campo con error
  const filaPorEnfocar = useRef(null)

  // Sin guardar: una compra nueva si tiene datos (solo la fecha de hoy no cuenta); una guardada, si cambió
  const [filasIniciales, setFilasIniciales] = useState(() => filasDesde(inicial?.materiales || inicial?.productos))
  const firmaInicial = firmaCompra(inicial?.proveedor ?? '', inicial?.fecha ?? '', filasIniciales, ivaDe(inicial) > 0)
  const hayDatos = Boolean(proveedor.trim()) || filas.some(f => !estaVacia(f))
  const sucio = inicial ? firmaCompra(proveedor, fecha, filas, conIva) !== firmaInicial : hayDatos
  const registrarDesdeAviso = useCallback(() => formRef.current?.requestSubmit(), [])
  const registro = useDatosSinGuardar({ sucio, registrar: registrarDesdeAviso, cierreRef })

  useEffect(() => {
    if (enfocarAlMontar) document.getElementById(`${id}-proveedor`)?.focus()
  }, [enfocarAlMontar, id])

  useEffect(() => {
    if (campoPorEnfocar.current) {
      document.getElementById(campoPorEnfocar.current)?.focus()
      campoPorEnfocar.current = null
    }
  }, [errores])

  useEffect(() => {
    if (filaPorEnfocar.current !== null) {
      document.getElementById(`${id}-material-${filaPorEnfocar.current}`)?.focus()
      filaPorEnfocar.current = null
    }
  }, [filas, id])

  // Un artículo renombrado (aquí o en otra compra abierta): el cambio ya está guardado,
  // así que no cuenta como dato sin guardar
  useEffect(() => {
    function alRenombrar({ detail: { anterior, nombre } }) {
      const renombrar = lista => lista.map(f => (claveNombre(f.material) === claveNombre(anterior) ? { ...f, material: nombre } : f))
      setFilas(renombrar)
      setFilasIniciales(renombrar)
      setOmitidos(prev => {
        const next = new Set(prev)
        next.delete(claveNombre(anterior))
        return next
      })
    }
    window.addEventListener(EVENTO_ARTICULO_RENOMBRADO, alRenombrar)
    return () => window.removeEventListener(EVENTO_ARTICULO_RENOMBRADO, alRenombrar)
  }, [])

  const sugerirProveedores = useCallback(texto => filtrar(getProveedores(), texto), [])
  const sugerirMateriales  = useCallback(
    texto => filtrar(getMaterialesPorProveedor(proveedor), texto),
    [proveedor]
  )

  function fijarError(claveError, mensaje) {
    setErrores(prev => {
      const next = { ...prev }
      if (mensaje) next[claveError] = mensaje
      else delete next[claveError]
      return next
    })
  }

  // --- Encabezado ---
  function cambiarEncabezado(campo, valor) {
    setBloqueado(false)
    if (campo === 'proveedor') {
      setProveedor(valor)
      setProveedorRevisado(false)
      // Compra nueva: toma el IVA de la última compra del proveedor. Al editar se respeta el guardado
      if (!inicial && !ivaTocado.current) setConIva(getIvaPorProveedor(valor))
    } else if (campo === 'fecha') setFecha(valor)
    if (errores[campo]) fijarError(campo, validarEncabezado(campo, valor))
  }

  function cambiarIva(marcada) {
    ivaTocado.current = true
    setBloqueado(false)
    setConIva(marcada)
  }

  function salirDeEncabezado(campo) {
    if (campo === 'proveedor') setProveedorRevisado(true)
    if (!intentoGuardar) return
    const valor = campo === 'proveedor' ? proveedor : fecha
    fijarError(campo, validarEncabezado(campo, valor))
  }

  // --- Filas ---
  /** Sin proveedor no se agregan materiales: se avisa y el foco vuelve al proveedor */
  function exigirProveedor() {
    if (proveedor.trim()) return true
    fijarError('proveedor', VALIDACION.proveedorPrimero)
    document.getElementById(`${id}-proveedor`)?.focus()
    return false
  }

  function cambiarFila(filaId, campo, valor) {
    if (campo === 'material' && valor.trim() && !exigirProveedor()) return
    setBloqueado(false)
    const filaActual = filas.find(f => f.id === filaId)
    const actualizada = { ...filaActual, [campo]: valor }
    // Se mantiene el último escrito: con un monto escrito, la cantidad recalcula el precio;
    // si no, recalcula el monto. El precio escrito deja de ser el sugerido
    if (campo === 'cantidad') {
      if (filaActual.montoEscrito) actualizada.precio = precioDesdeMonto(filaActual.montoOriginal, valor)
      else actualizada.montoOriginal = undefined
    }
    if (campo === 'precio') {
      actualizada.montoOriginal = undefined
      actualizada.montoEscrito = false
      actualizada.precioSugerido = false
    }

    setFilas(prev => prev.map(f => (f.id === filaId ? actualizada : f)))
    if (errores[clave(filaId, campo)]) fijarError(clave(filaId, campo), validarFila(actualizada)[campo])
  }

  /** Monto escrito a mano: se guarda exacto y de él sale el precio unitario; borrarlo limpia los dos */
  function cambiarMonto(filaId, valor) {
    setBloqueado(false)
    const filaActual = filas.find(f => f.id === filaId)
    const monto = Number(valor)
    const actualizada = {
      ...filaActual,
      montoOriginal: monto > 0 ? monto : undefined,
      montoEscrito: monto > 0,
      precio: monto > 0 ? precioDesdeMonto(monto, filaActual.cantidad) : '',
      precioSugerido: false,
    }

    setFilas(prev => prev.map(f => (f.id === filaId ? actualizada : f)))
    if (errores[clave(filaId, 'precio')]) fijarError(clave(filaId, 'precio'), validarFila(actualizada).precio)
  }

  /** Pone el precio y la unidad de la última compra del material, salvo que el precio ya lo haya escrito la persona */
  function sugerirPrecio(filaId, material) {
    // El campo es en centavos (tipo cajero): un precio de menos de un centavo no se sugiere
    const encontrado = getPrecioSugerido(material)
    const sugerido = encontrado && redondear(encontrado.precio, 2) > 0 ? encontrado : null
    setFilas(prev => prev.map(f => {
      if (f.id !== filaId || f.montoEscrito || (f.precio !== '' && !f.precioSugerido)) return f
      if (!sugerido) return f.precioSugerido ? { ...f, precio: '', precioSugerido: false } : f
      return {
        ...f,
        precio: String(redondear(sugerido.precio, 2)),
        unidad: UNIDADES.includes(sugerido.unidad) ? sugerido.unidad : f.unidad,
        precioSugerido: true,
        montoOriginal: undefined,
      }
    }))
  }

  function salirDeCampoFila(filaId, campo) {
    if (!intentoGuardar) return
    const fila = filas.find(f => f.id === filaId)
    if (fila && !estaVacia(fila)) fijarError(clave(filaId, campo), validarFila(fila)[campo])
  }

  // --- Categoría y producto de cada material ---
  /**
   * Abre la ventana del artículo de una fila. pedido: la abrió el sistema o el «+»; si no, el lápiz.
   * Un artículo registrado se edita con permiso; sin él, solo se completa lo que le falte.
   */
  function abrirFormulario(filaId, nombre, pedido) {
    const asignacion = getAsignacion(nombre)
    const modo = !asignacion.existe ? 'nuevo' : puedeEditarArticulo ? 'editar' : 'completar'
    setPorAsignar({ ...asignacion, filaId, modo, pedido, marcado: omitidos.has(claveNombre(nombre)) })
  }

  function revisarMaterial(filaId, valor) {
    const nombre = (valor || '').trim()
    if (porAsignar || !necesitaAsignacion(nombre) || omitidos.has(claveNombre(nombre))) return
    abrirFormulario(filaId, nombre, true)
  }

  /** Siguiente fila con un artículo que se debe preguntar (y al que no se le dijo «Ahora no») */
  function pendienteDeAsignar() {
    return filas.find(f => !estaVacia(f) && necesitaAsignacion(f.material) && !omitidos.has(claveNombre(f.material)))
  }

  /** La fila queda en rojo: se dijo «Ahora no» y al artículo aún le falta información */
  function filaMarcada(fila) {
    return omitidos.has(claveNombre(fila.material)) && necesitaAsignacion(fila.material)
  }

  /** Qué botón lleva la fila: «+» para crear o completar, lápiz para editar (apagado sin permiso) */
  function botonDeFila(fila) {
    const nombre = fila.material.trim()
    if (!nombre || !getAsignacion(nombre).existe) return { Icono: Plus, activo: true, etiqueta: COMPRA.agregarArticulo(nombre) }
    if (puedeEditarArticulo) return { Icono: Pencil, activo: true, etiqueta: COMPRA.editarArticulo(nombre), lapiz: true }
    if (necesitaAsignacion(nombre)) return { Icono: Plus, activo: true, etiqueta: COMPRA.asignarArticulo(nombre) }
    return { Icono: Pencil, activo: false, etiqueta: COMPRA.sinPermisoEditarArticulo(nombre), lapiz: true }
  }

  function alTocarBotonDeFila(fila, lapiz) {
    if (!exigirProveedor()) return
    abrirFormulario(fila.id, fila.material.trim(), !lapiz)
  }

  async function asignar({ nombre, categoria, productos }) {
    const { modo, nombre: anterior, filaId } = porAsignar
    let final
    try {
      // Con el proveedor de la compra: la categoría elegida queda como suya
      if (modo === 'editar') {
        const editado = await editarEnCatalogo('material', anterior, { nombre, categoria, productos, proveedor })
        addToast(ASIGNACION.editado(editado))
        final = editado.nombre
      } else {
        const asignado = await asignarMaterial(nombre, {
          categoria, productos, proveedor, ...(modo === 'nuevo' ? { nuevo: true } : {}),
        })
        addToast(ASIGNACION.asignado(asignado))
        final = asignado.material.nombre
      }
    } catch (error) {
      addToast(ASIGNACION.errorGuardar(error.message), 'error')
      throw error
    }
    // La fila (y las que llevaban ese nombre) toman el nombre con que quedó
    setFilas(prev => prev.map(f => (
      f.id === filaId || (anterior && claveNombre(f.material) === claveNombre(anterior)) ? { ...f, material: final } : f
    )))
    fijarError(clave(filaId, 'material'), undefined)
    sugerirPrecio(filaId, final)
    // Guardado sin productos: ya se sabe que le falta y la fila se marca de una vez, sin volver a preguntar
    setOmitidos(prev => {
      const next = new Set(prev)
      next.delete(claveNombre(anterior))
      if (!productos.length) next.add(claveNombre(final))
      return next
    })
    setPorAsignar(null)
    setBloqueado(false)
    seguirGuardando()
  }

  /** La ventana se abrió al guardar: si otro artículo también falta, se pide; si no, sigue la compra */
  function seguirGuardando() {
    if (!guardarDespues.current) return
    guardarDespues.current = false
    setTimeout(() => formRef.current?.requestSubmit(), 0)
  }

  /** Lo pedido por el sistema o el «+» y no completado no se vuelve a preguntar, y la fila queda marcada */
  function marcarOmitido() {
    if (porAsignar?.pedido) setOmitidos(prev => new Set(prev).add(claveNombre(porAsignar.nombre)))
  }

  /** «Ahora no»: el artículo queda sin esos datos y, si se estaba guardando, la compra se guarda igual */
  function omitirAsignacion() {
    marcarOmitido()
    setPorAsignar(null)
    seguirGuardando()
  }

  /** Cancelar, la X, Esc o el clic fuera: cierra sin guardar la compra */
  function cerrarAsignacion() {
    marcarOmitido()
    if (guardarDespues.current) registro.terminar(false)
    guardarDespues.current = false
    setPorAsignar(null)
  }

  function agregarFila() {
    const nueva = filaVacia()
    filaPorEnfocar.current = nueva.id
    setBloqueado(false)
    setFilas(prev => [...prev, nueva])
  }

  function quitarFila(filaId) {
    if (filas.length === 1) return
    setBloqueado(false)
    setFilas(prev => prev.filter(f => f.id !== filaId))
    setErrores(prev => {
      const next = { ...prev }
      CAMPOS_FILA.forEach(({ clave: campo }) => delete next[clave(filaId, campo)])
      return next
    })
  }

  async function guardar(e) {
    e.preventDefault()
    setIntentoGuardar(true)

    const nuevos = {}
    ;['proveedor', 'fecha'].forEach(campo => {
      const valor = campo === 'proveedor' ? proveedor : fecha
      const mensaje = validarEncabezado(campo, valor)
      if (mensaje) nuevos[campo] = mensaje
    })

    const filasConDatos = filas.filter(f => !estaVacia(f))
    const aValidar = filasConDatos.length > 0 ? filasConDatos : [filas[0]]
    aValidar.forEach(f => {
      Object.entries(validarFila(f)).forEach(([campo, mensaje]) => { nuevos[clave(f.id, campo)] = mensaje })
    })

    // Sin cuadro de resumen: cada campo se marca en rojo con su mensaje y el foco va al primero
    if (Object.keys(nuevos).length > 0) {
      campoPorEnfocar.current = primerCampoConError(nuevos)
      setErrores(nuevos)
      setBloqueado(true)
      registro.terminar(false)
      return
    }

    // Todos los materiales necesitan categoría y producto antes de guardar
    const pendiente = pendienteDeAsignar()
    if (pendiente) {
      guardarDespues.current = true
      abrirFormulario(pendiente.id, pendiente.material.trim(), true)
      return
    }

    const lista = {
      proveedor,
      fecha,
      categoria: '',
      iva,
      materiales: filasConDatos.map(fila => {
        const { categoria, producto } = getAsignacion(fila.material)
        const monto = montoDe(fila)
        return {
          material: fila.material,
          cantidad: Number(fila.cantidad),
          unidad: fila.unidad,
          monto,
          precio: monto,
          categoria,
          producto,
        }
      }),
      productos: filasConDatos.map(fila => ({
        producto: fila.material,
        cantidad: Number(fila.cantidad),
        unidad: fila.unidad,
        precio: montoDe(fila),
      })),
    }

    // Todo en orden: se pide confirmar antes de guardar
    setPorConfirmar(lista)
  }

  async function guardarConfirmada() {
    const lista = porConfirmar
    registro.aceptar()
    setGuardando(true)
    try {
      const guardada = await alGuardar(lista)
      alGuardado?.(guardada ?? lista)
      registro.terminar(true)
    } catch {
      // El padre notifica el error; no se reintenta igual: hay que cambiar algo primero
      setBloqueado(true)
      registro.terminar(false)
    } finally {
      setGuardando(false)
    }
  }

  // Con datos escritos se confirma; un bloque vacío se quita sin preguntar
  function pedirCancelar() {
    if (hayDatos) setConfirmandoCancelar(true)
    else alCancelar?.()
  }

  // No se abre una fila nueva mientras la última no tenga material, cantidad, unidad y precio
  const ultimaIncompleta = !filaCompleta(filas[filas.length - 1])

  // Por pasos (solo en una compra nueva): con proveedor, las filas; con una fila completa, el resto
  const porPasos = !inicial
  const verFilas = !porPasos || Boolean(proveedor.trim()) || filas.some(f => !estaVacia(f))
  const verResto = !porPasos || filas.length > 1 || filas.some(filaCompleta)

  useEffect(() => {
    alCambiarProgreso?.(verResto)
  }, [verResto, alCambiarProgreso])

  // Los montos van sin IVA: se suma encima
  const subtotal = filas.reduce((suma, f) => suma + montoDe(f), 0)
  const iva = conIva ? calcularIva(subtotal) : 0
  const total = aCentavos(subtotal + iva)

  // Solo una sugerencia, al salir del campo: mientras se escribe, casi todo «se parece» a algo
  const proveedorParecido = proveedorRevisado ? nombreParecido(proveedor, getProveedores()) : null

  /** Id del primer campo con error, en el orden en que aparecen en pantalla */
  function primerCampoConError(conError) {
    if (conError.fecha) return `${id}-fecha`
    if (conError.proveedor) return `${id}-proveedor`
    for (const fila of filas) {
      const campo = CAMPOS_FILA.find(({ clave: c }) => conError[clave(fila.id, c)])
      if (campo) return `${id}-${campo.clave}-${fila.id}`
    }
    return null
  }

  return (
    <>
      <form ref={formRef} onSubmit={guardar} noValidate className={estilos.bloque} aria-labelledby={`${id}-titulo`}>
        <section className={[estilos.tarjeta, plano && estilos.plano].filter(Boolean).join(' ')}>
          <header className={estilos.encabezado}>
            <h2 id={`${id}-titulo`} className={plano ? 'solo-lector' : estilos.titulo}>{titulo}</h2>
            <div className={estilos.encabezadoCampos}>
              <Campo
                id={`${id}-fecha`}
                etiqueta="Fecha"
                tipo="date"
                value={fecha}
                onChange={e => cambiarEncabezado('fecha', e.target.value)}
                onBlur={() => salirDeEncabezado('fecha')}
                error={errores.fecha}
                className={estilos.campoFecha}
              />
              <div className={estilos.campoProveedor}>
                <AutocompleteInput
                  id={`${id}-proveedor`}
                  etiqueta="Proveedor"
                  value={proveedor}
                  onChange={valor => cambiarEncabezado('proveedor', valor)}
                  onBlur={() => salirDeEncabezado('proveedor')}
                  getSuggestions={sugerirProveedores}
                  error={errores.proveedor}
                  aria-describedby={proveedorParecido ? `${id}-proveedor-parecido` : undefined}
                />
                <AvisoDestacado
                  id={`${id}-proveedor-parecido`}
                  texto={proveedorParecido && NOMBRE_PARECIDO.aviso(proveedor, proveedorParecido, 'proveedor')}
                />
              </div>
            </div>
          </header>

          <AnimatePresence initial={false}>
          {verFilas && (
          <motion.div
            key="filas"
            className={estilos.zonaFilas}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={springSuave}
          >
          <table className={estilos.tabla}>
            <caption className="solo-lector">Artículos de la compra</caption>
            <thead>
              <tr>
                <th scope="col" className={estilos.colMaterial}>Artículo</th>
                <th scope="col" className={estilos.colCantidad}>Cantidad</th>
                <th scope="col" className={estilos.colUnidad}>Unidad</th>
                {/* Corto para que el encabezado no se sature; el lector de pantalla oye el nombre completo */}
                <th scope="col" className={estilos.colPrecio}>
                  <span aria-hidden="true">Precio u.</span>
                  <span className="solo-lector">Precio unitario</span>
                </th>
                <th scope="col" className={estilos.colMonto}>Monto</th>
                <th scope="col" className={estilos.colAcciones}><span className="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filas.map((fila, i) => {
                  const n = i + 1
                  const boton = botonDeFila(fila)
                  const marcada = filaMarcada(fila)
                  return (
                    <motion.tr
                      key={fila.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={springSuave}
                    >
                      {/* Material */}
                      <td>
                        {/* Categoría y producto: en un tooltip, para que la fila no crezca */}
                        <div className={estilos.materialConBoton} title={textoAsignacion(fila.material)}>
                          <button
                            type="button"
                            className={estilos.botonAsignarMini}
                            aria-label={boton.etiqueta}
                            title={boton.etiqueta}
                            disabled={!boton.activo}
                            onClick={() => alTocarBotonDeFila(fila, boton.lapiz)}
                          >
                            <boton.Icono size={14} aria-hidden="true" />
                          </button>
                          {marcada && (
                            <span className={estilos.faltaInformacion} title={COMPRA.articuloIncompleto}>
                              <AlertCircle size={18} aria-hidden="true" />
                            </span>
                          )}
                          <AutocompleteInput
                            id={`${id}-material-${fila.id}`}
                            etiqueta={`Artículo, fila ${n}`}
                            etiquetaOculta
                            value={fila.material}
                            onChange={valor => cambiarFila(fila.id, 'material', valor)}
                            onSeleccionar={valor => {
                              if (!proveedor.trim()) return
                              sugerirPrecio(fila.id, valor)
                              revisarMaterial(fila.id, valor)
                            }}
                            onBlur={() => {
                              salirDeCampoFila(fila.id, 'material')
                              sugerirPrecio(fila.id, fila.material)
                              revisarMaterial(fila.id, fila.material)
                            }}
                            ayuda={marcada ? COMPRA.articuloIncompleto : textoAsignacion(fila.material)}
                            ayudaOculta
                            marcado={marcada}
                            getSuggestions={sugerirMateriales}
                            error={errores[clave(fila.id, 'material')]}
                          />
                        </div>
                      </td>

                      {/* Cantidad */}
                      <td>
                        <Campo
                          id={`${id}-cantidad-${fila.id}`}
                          etiqueta={`Cantidad, fila ${n}`}
                          etiquetaOculta
                          tipo="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={fila.cantidad}
                          onChange={e => cambiarFila(fila.id, 'cantidad', e.target.value)}
                          onBlur={() => salirDeCampoFila(fila.id, 'cantidad')}
                          error={errores[clave(fila.id, 'cantidad')]}
                        />
                      </td>

                      {/* Unidad */}
                      <td>
                        <Selector
                          id={`${id}-unidad-${fila.id}`}
                          etiqueta={`Unidad, fila ${n}`}
                          etiquetaOculta
                          opciones={OPCIONES_UNIDAD}
                          value={fila.unidad}
                          onChange={e => cambiarFila(fila.id, 'unidad', e.target.value)}
                          onBlur={() => salirDeCampoFila(fila.id, 'unidad')}
                          error={errores[clave(fila.id, 'unidad')]}
                        />
                      </td>

                      {/* Precio unitario (editable; sugerido desde la última compra) */}
                      <td>
                        <CampoMoneda
                          id={`${id}-precio-${fila.id}`}
                          etiqueta={`Precio unitario, fila ${n}`}
                          etiquetaOculta
                          prefijo="$"
                          value={fila.precio}
                          onChange={valor => cambiarFila(fila.id, 'precio', valor)}
                          onBlur={() => salirDeCampoFila(fila.id, 'precio')}
                          error={errores[clave(fila.id, 'precio')]}
                        />
                      </td>

                      {/* Monto = cantidad × precio unitario, o escrito a mano (y de él sale el precio) */}
                      <td>
                        <CampoMoneda
                          id={`${id}-monto-${fila.id}`}
                          etiqueta={`Monto, fila ${n}`}
                          etiquetaOculta
                          prefijo="$"
                          value={montoDe(fila) > 0 ? montoDe(fila) : ''}
                          onChange={valor => cambiarMonto(fila.id, valor)}
                          onBlur={() => salirDeCampoFila(fila.id, 'precio')}
                        />
                      </td>

                      {/* Eliminar fila */}
                      <td className={estilos.colAcciones}>
                        <Boton
                          variante="icono"
                          icono={<Trash2 />}
                          aria-label={`Eliminar fila ${n}`}
                          onClick={() => quitarFila(fila.id)}
                          disabled={filas.length === 1}
                          className={estilos.eliminar}
                        />
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
            {/* Fila fantasma al final: aparece cuando la última fila está completa */}
            {verResto && !ultimaIncompleta && (
              <tfoot className={estilos.pieFilas}>
                <tr>
                  <td colSpan={6}>
                    <button type="button" className={estilos.filaFantasma} onClick={agregarFila}>
                      <Plus size={16} aria-hidden="true" />
                      <span>{COMPRA.agregarFila}</span>
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          </motion.div>
          )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {verResto && (
              <motion.div
                key="resumen"
                className={estilos.pieTabla}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={springSuave}
              >
                <ResumenCompra subtotal={subtotal} conIva={conIva} iva={iva} total={total} onCambiarIva={cambiarIva} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Guardar y Cancelar aparecen con una fila completa; una compra extra vacía se puede quitar desde el inicio */}
        {(verResto || cancelarVacio) && (
          <div className={estilos.acciones}>
            {bloqueado && <p id={`${id}-ayuda-guardar`} className={estilos.ayudaGuardar}>{COMPRA.cambiaParaReintentar}</p>}
            <Boton variante="fantasma" onClick={pedirCancelar} disabled={!hayDatos && !cancelarVacio}>
              Cancelar
            </Boton>
            {verResto && (
              <Boton
                type="submit"
                variante="primario"
                sombra
                icono={<Save />}
                cargando={guardando}
                disabled={!hayDatos || bloqueado}
                aria-describedby={bloqueado ? `${id}-ayuda-guardar` : undefined}
              >
                {guardando ? 'Guardando…' : textoGuardar}
              </Boton>
            )}
          </div>
        )}
      </form>

      {/* Fuera del <form>: los eventos del portal no deben llegar a su onSubmit */}
      <AsignarMaterial
        material={porAsignar}
        proveedor={proveedor}
        alGuardar={asignar}
        alOmitir={omitirAsignacion}
        alCerrar={cerrarAsignacion}
      />

      <ConfirmDialog
        isOpen={porConfirmar !== null}
        onClose={() => {
          setPorConfirmar(null)
          registro.cerrar()
        }}
        onConfirm={guardarConfirmada}
        title={COMPRA.confirmarGuardar.titulo}
        message={COMPRA.confirmarGuardar.mensaje(
          porConfirmar?.proveedor ?? '',
          porConfirmar?.materiales.length ?? 0,
          formatearPrecio(total),
        ).map(({ texto, negrita }, i) => (negrita ? <strong key={i}>{texto}</strong> : texto))}
        confirmLabel={COMPRA.confirmarGuardar.confirmar}
      />

      <ConfirmDialog
        isOpen={confirmandoCancelar}
        onClose={() => setConfirmandoCancelar(false)}
        onConfirm={() => {
          registro.descartar()
          alCancelar?.()
        }}
        title={COMPRA.confirmarCancelar.titulo}
        message={COMPRA.confirmarCancelar.mensaje}
        confirmLabel={COMPRA.confirmarCancelar.confirmar}
        cancelLabel={COMPRA.confirmarCancelar.volver}
        danger
      />
    </>
  )
}

/** "Materia Prima · Cachitos" (o solo la categoría, si no va en ningún producto) en el tooltip del material */
function textoAsignacion(material) {
  if (!material.trim()) return undefined
  const { categoria, producto } = getAsignacion(material)
  if (!categoria) return undefined
  return producto ? `${categoria} · ${producto}` : categoria
}
