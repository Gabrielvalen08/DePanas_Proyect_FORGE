import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Plus, Save, Trash2 } from 'lucide-react'
import AutocompleteInput from './AutocompleteInput'
import AsignarMaterial from './AsignarMaterial'
import { Boton, Campo, ConfirmDialog, Selector } from './common'
import { asignarMaterial, getAsignacion, getMateriales, getPrecioSugerido, getProveedores, necesitaAsignacion } from '../services/api'
import { useToast } from '../context/ToastContext'
import { ASIGNACION, COMPRA, VALIDACION } from '../utils/mensajes'
import { fechaHoyISO, formatearPrecio, textoBusqueda } from '../utils/formato'
import { springSuave } from '../styles/movimiento'
import estilos from './BloqueCompra.module.css'

export const UNIDADES = ['lb', 'kg', 'g', 'oz', 'galon', 'litro', 'ml', 'unidad', 'caja', 'bolsa']

// Campos obligatorios de cada fila (en el orden en que aparecen)
const CAMPOS_FILA = [
  { clave: 'material', nombre: 'Material' },
  { clave: 'cantidad', nombre: 'Cantidad' },
  { clave: 'precio',   nombre: 'Precio unitario' },
]

let siguienteIdFila = 1

const redondear = (valor, decimales) => Math.round(valor * 10 ** decimales) / 10 ** decimales

function filaVacia() {
  return { id: siguienteIdFila++, material: '', cantidad: '', unidad: 'lb', precio: '' }
}

/**
 * Monto de la fila: cantidad × precio unitario, redondeado a centavos. Una fila
 * que viene de una compra guardada conserva su monto exacto hasta que se toque
 * la cantidad o el precio (el precio unitario mostrado va redondeado).
 */
function montoDe(fila) {
  if (fila.montoOriginal !== undefined) return fila.montoOriginal
  const cantidad = Number(fila.cantidad)
  const precio = Number(fila.precio)
  return cantidad > 0 && precio > 0 ? redondear(cantidad * precio, 2) : 0
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
      unidad: m.unidad || 'lb',
      precio: monto > 0 && cantidad > 0 ? String(redondear(monto / cantidad, 4)) : '',
      montoOriginal: monto > 0 ? monto : undefined,
    }
  })
}

// Una fila sin material, cantidad ni monto no cuenta: se ignora al guardar
function estaVacia(fila) {
  return !fila.material.trim() && !fila.cantidad && !fila.precio
}

function validarFila(fila) {
  const errores = {}
  if (!fila.material.trim()) errores.material = VALIDACION.material
  const cantidadValida = Boolean(fila.cantidad) && !isNaN(fila.cantidad) && Number(fila.cantidad) > 0
  if (!cantidadValida) errores.cantidad = VALIDACION.cantidad
  // Con cantidad válida, el monto (cantidad × precio, a centavos) tampoco puede quedar en 0
  if (!fila.precio || isNaN(fila.precio) || Number(fila.precio) <= 0 || (cantidadValida && montoDe(fila) <= 0))
    errores.precio = VALIDACION.precio
  return errores
}

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
 * El monto de cada fila es cantidad × precio unitario. Al elegir un material se
 * sugiere el precio unitario de su última compra (con su unidad); se puede cambiar
 * y la compra guardada pasa a ser la nueva referencia.
 * Cada material lleva su categoría y su producto (como en el Excel): si se
 * escribe uno nuevo o sin asignar, se piden en una ventana emergente
 * (AsignarMaterial) al elegirlo, al salir del campo o, si faltan, al guardar.
 *
 * Props:
 *  - titulo: texto del encabezado (por defecto "Detalle de compra")
 *  - inicial: { proveedor, fecha, materiales } para editar
 *  - alGuardar(lista): async; si se resuelve, se llama a alGuardado
 *  - alGuardado(lista), alCancelar()
 *  - cancelarVacio: deja Cancelar activo aunque no haya nada (para quitar un bloque vacío)
 *  - textoGuardar, enfocarAlMontar, plano (sin tarjeta, p. ej. dentro de un modal;
 *    el título solo queda para lectores de pantalla porque el modal ya trae el suyo)
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
}) {
  const id = useId().replace(/:/g, '')
  const [proveedor, setProveedor] = useState(inicial?.proveedor ?? '')
  const [fecha, setFecha]         = useState(inicial?.fecha ?? fechaHoyISO())
  const [filas, setFilas]         = useState(() => filasDesde(inicial?.materiales || inicial?.productos))
  const [errores, setErrores]     = useState({})
  const [guardando, setGuardando] = useState(false)
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [porAsignar, setPorAsignar] = useState(null) // material en la ventana emergente
  const [porConfirmar, setPorConfirmar] = useState(null) // lista lista para guardar, a la espera del Sí
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
  const { addToast } = useToast()

  const formRef        = useRef(null)
  const omitidos       = useRef(new Set()) // "Ahora no": no se vuelve a pedir al salir del campo
  const guardarDespues = useRef(false)     // la ventana se abrió al guardar: se guarda al terminar

  const resumenRef     = useRef(null)
  const enfocarResumen = useRef(false)
  const filaPorEnfocar = useRef(null)

  useEffect(() => {
    if (enfocarAlMontar) document.getElementById(`${id}-proveedor`)?.focus()
  }, [enfocarAlMontar, id])

  useEffect(() => {
    if (enfocarResumen.current && resumenRef.current) {
      resumenRef.current.focus()
      enfocarResumen.current = false
    }
  }, [errores])

  useEffect(() => {
    if (filaPorEnfocar.current !== null) {
      document.getElementById(`${id}-material-${filaPorEnfocar.current}`)?.focus()
      filaPorEnfocar.current = null
    }
  }, [filas, id])

  const sugerirProveedores = useCallback(texto => filtrar(getProveedores(), texto), [])
  const sugerirMateriales  = useCallback(texto => filtrar(getMateriales(), texto), [])

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
    if (campo === 'proveedor') setProveedor(valor)
    else if (campo === 'fecha') setFecha(valor)
    if (errores[campo]) fijarError(campo, validarEncabezado(campo, valor))
  }

  function salirDeEncabezado(campo) {
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
    const filaActual = filas.find(f => f.id === filaId)
    const actualizada = { ...filaActual, [campo]: valor }
    // Tocar la cantidad o el precio vuelve a calcular el monto; el precio escrito deja de ser el sugerido
    if (campo === 'cantidad' || campo === 'precio') actualizada.montoOriginal = undefined
    if (campo === 'precio') actualizada.precioSugerido = false

    setFilas(prev => prev.map(f => (f.id === filaId ? actualizada : f)))
    if (errores[clave(filaId, campo)]) fijarError(clave(filaId, campo), validarFila(actualizada)[campo])
  }

  /** Pone el precio y la unidad de la última compra del material, salvo que el precio ya lo haya escrito la persona */
  function sugerirPrecio(filaId, material) {
    const sugerido = getPrecioSugerido(material)
    setFilas(prev => prev.map(f => {
      if (f.id !== filaId || (f.precio !== '' && !f.precioSugerido)) return f
      if (!sugerido) return f.precioSugerido ? { ...f, precio: '', precioSugerido: false } : f
      return {
        ...f,
        precio: String(sugerido.precio),
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
  function revisarMaterial(valor) {
    const nombre = (valor || '').trim()
    if (porAsignar || !necesitaAsignacion(nombre) || omitidos.current.has(nombre.toLowerCase())) return
    setPorAsignar(getAsignacion(nombre))
  }

  /** Siguiente fila con un material sin categoría o producto */
  function pendienteDeAsignar() {
    return filas.find(f => !estaVacia(f) && necesitaAsignacion(f.material))
  }

  async function asignar(eleccion) {
    try {
      addToast(ASIGNACION.asignado(await asignarMaterial(porAsignar.nombre, eleccion)))
    } catch (error) {
      addToast(ASIGNACION.errorGuardar(error.message), 'error')
      throw error
    }
    setPorAsignar(null)
    if (guardarDespues.current) {
      guardarDespues.current = false
      // Si otro material también falta, se pide; si no, se guarda la compra
      setTimeout(() => formRef.current?.requestSubmit(), 0)
    }
  }

  function omitirAsignacion() {
    if (porAsignar) omitidos.current.add(porAsignar.nombre.toLowerCase())
    if (guardarDespues.current && porAsignar) addToast(COMPRA.faltaAsignacion(porAsignar.nombre), 'error')
    guardarDespues.current = false
    setPorAsignar(null)
  }

  function agregarFila() {
    const nueva = filaVacia()
    filaPorEnfocar.current = nueva.id
    setFilas(prev => [...prev, nueva])
  }

  function quitarFila(filaId) {
    if (filas.length === 1) return
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

    if (Object.keys(nuevos).length > 0) {
      enfocarResumen.current = true
      setErrores(nuevos)
      return
    }

    // Todos los materiales necesitan categoría y producto antes de guardar
    const pendiente = pendienteDeAsignar()
    if (pendiente) {
      guardarDespues.current = true
      setPorAsignar(getAsignacion(pendiente.material))
      return
    }

    const lista = {
      proveedor,
      fecha,
      categoria: '',
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
    setGuardando(true)
    try {
      const guardada = await alGuardar(lista)
      alGuardado?.(guardada ?? lista)
    } catch {
      // El padre notifica el error
    } finally {
      setGuardando(false)
    }
  }

  // Con datos escritos se confirma; un bloque vacío se quita sin preguntar
  function pedirCancelar() {
    if (hayDatos) setConfirmandoCancelar(true)
    else alCancelar?.()
  }

  // Sin proveedor ni filas con datos no hay nada que guardar ni que cancelar
  const hayDatos = Boolean(proveedor.trim()) || filas.some(f => !estaVacia(f))

  // No se abre una fila nueva mientras la última no tenga material, cantidad y precio
  const ultimaIncompleta = Object.keys(validarFila(filas[filas.length - 1])).length > 0

  const total = filas.reduce((suma, f) => suma + montoDe(f), 0)

  const resumen = [
    errores.fecha     && { idCampo: `${id}-fecha`,     texto: `Fecha: ${errores.fecha}` },
    errores.proveedor && { idCampo: `${id}-proveedor`, texto: `Proveedor: ${errores.proveedor}` },
    ...filas.flatMap((fila, i) =>
      CAMPOS_FILA.filter(({ clave: campo }) => errores[clave(fila.id, campo)]).map(({ clave: campo, nombre }) => ({
        idCampo: `${id}-${campo}-${fila.id}`,
        texto: `Fila ${i + 1} · ${nombre}: ${errores[clave(fila.id, campo)]}`,
      }))
    ),
  ].filter(Boolean)

  function irACampo(e, idCampo) {
    e.preventDefault()
    document.getElementById(idCampo)?.focus()
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
                />
              </div>
            </div>
          </header>

          {resumen.length > 0 && (
            <div ref={resumenRef} role="alert" tabIndex={-1} className={estilos.resumen} aria-labelledby={`${id}-resumen`}>
              <h3 id={`${id}-resumen`} className={estilos.resumenTitulo}>
                <AlertCircle size={18} aria-hidden="true" />
                {VALIDACION.resumen}
              </h3>
              <ul className={estilos.resumenLista}>
                {resumen.map(item => (
                  <li key={item.idCampo}>
                    <a href={`#${item.idCampo}`} onClick={e => irACampo(e, item.idCampo)}>{item.texto}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <table className={estilos.tabla}>
            <caption className="solo-lector">Materiales de la compra</caption>
            <thead>
              <tr>
                <th scope="col" className={estilos.colMaterial}>Material</th>
                <th scope="col" className={estilos.colCantidad}>Cantidad</th>
                <th scope="col" className={estilos.colPrecio}>Precio unitario</th>
                <th scope="col" className={estilos.colMonto}>Monto</th>
                <th scope="col" className={estilos.colAcciones}><span className="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filas.map((fila, i) => {
                  const n = i + 1
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
                        <AutocompleteInput
                          id={`${id}-material-${fila.id}`}
                          etiqueta={`Material, fila ${n}`}
                          etiquetaOculta
                          value={fila.material}
                          onChange={valor => cambiarFila(fila.id, 'material', valor)}
                          onSeleccionar={valor => {
                            if (!proveedor.trim()) return
                            sugerirPrecio(fila.id, valor)
                            revisarMaterial(valor)
                          }}
                          onBlur={() => {
                            salirDeCampoFila(fila.id, 'material')
                            sugerirPrecio(fila.id, fila.material)
                            revisarMaterial(fila.material)
                          }}
                          ayuda={textoAsignacion(fila.material)}
                          getSuggestions={sugerirMateriales}
                          error={errores[clave(fila.id, 'material')]}
                        />
                      </td>

                      {/* Cantidad + Unidad */}
                      <td>
                        <div className={estilos.cantidadGrupo}>
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
                            className={estilos.cantidad}
                          />
                          <Selector
                            id={`${id}-unidad-${fila.id}`}
                            etiqueta={`Unidad, fila ${n}`}
                            etiquetaOculta
                            opciones={UNIDADES}
                            value={fila.unidad}
                            onChange={e => cambiarFila(fila.id, 'unidad', e.target.value)}
                            className={estilos.unidad}
                          />
                        </div>
                      </td>

                      {/* Precio unitario (editable; sugerido desde la última compra) */}
                      <td>
                        <Campo
                          id={`${id}-precio-${fila.id}`}
                          etiqueta={`Precio unitario, fila ${n}`}
                          etiquetaOculta
                          tipo="number"
                          inputMode="decimal"
                          min="0.0001"
                          step="any"
                          prefijo="$"
                          placeholder="0.00"
                          value={fila.precio}
                          onChange={e => cambiarFila(fila.id, 'precio', e.target.value)}
                          onBlur={() => salirDeCampoFila(fila.id, 'precio')}
                          ayuda={textoUltimoPrecio(fila.material)}
                          error={errores[clave(fila.id, 'precio')]}
                        />
                      </td>

                      {/* Monto = cantidad × precio unitario (se calcula solo) */}
                      <td>
                        <Campo
                          id={`${id}-monto-${fila.id}`}
                          etiqueta={`Monto, fila ${n}`}
                          etiquetaOculta
                          prefijo="$"
                          placeholder="0.00"
                          readOnly
                          tabIndex={-1}
                          value={montoDe(fila) > 0 ? montoDe(fila).toFixed(2) : ''}
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
          </table>

          <div className={estilos.pieTabla}>
            <div className={estilos.agregarFila}>
              <Boton
                variante="secundario"
                icono={<Plus />}
                onClick={agregarFila}
                disabled={ultimaIncompleta}
                aria-describedby={ultimaIncompleta ? `${id}-ayuda-fila` : undefined}
                className={estilos.botonPunteado}
              >
                Agregar otra fila
              </Boton>
              {ultimaIncompleta && (
                <p id={`${id}-ayuda-fila`} className={estilos.ayudaFila}>{VALIDACION.filaIncompleta}</p>
              )}
            </div>
            <p className={estilos.total}>
              <span className={estilos.totalEtiqueta}>Total</span>
              <span className={estilos.totalValor} aria-live="polite">{formatearPrecio(total)}</span>
            </p>
          </div>
        </section>

        <div className={estilos.acciones}>
          <Boton variante="fantasma" onClick={pedirCancelar} disabled={!hayDatos && !cancelarVacio}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" sombra icono={<Save />} cargando={guardando} disabled={!hayDatos}>
            {guardando ? 'Guardando…' : textoGuardar}
          </Boton>
        </div>
      </form>

      {/* Fuera del <form>: los eventos del portal no deben llegar a su onSubmit */}
      <AsignarMaterial material={porAsignar} alGuardar={asignar} alCancelar={omitirAsignacion} />

      <ConfirmDialog
        isOpen={porConfirmar !== null}
        onClose={() => setPorConfirmar(null)}
        onConfirm={guardarConfirmada}
        title={COMPRA.confirmarGuardar.titulo}
        message={COMPRA.confirmarGuardar.mensaje(
          porConfirmar?.proveedor ?? '',
          porConfirmar?.materiales.length ?? 0,
          formatearPrecio(total),
        )}
        confirmLabel={COMPRA.confirmarGuardar.confirmar}
      />

      <ConfirmDialog
        isOpen={confirmandoCancelar}
        onClose={() => setConfirmandoCancelar(false)}
        onConfirm={() => alCancelar?.()}
        title={COMPRA.confirmarCancelar.titulo}
        message={COMPRA.confirmarCancelar.mensaje}
        confirmLabel={COMPRA.confirmarCancelar.confirmar}
        cancelLabel={COMPRA.confirmarCancelar.volver}
        danger
      />
    </>
  )
}

/** "Última compra: $1.00 por bolsa" bajo el precio, cuando el material ya se compró antes */
function textoUltimoPrecio(material) {
  const sugerido = getPrecioSugerido(material)
  return sugerido ? COMPRA.ultimoPrecio(formatearPrecio(sugerido.precio), sugerido.unidad) : undefined
}

/** "Materia Prima · Cachitos" bajo el material, cuando ya tiene ambos asignados */
function textoAsignacion(material) {
  if (!material.trim() || necesitaAsignacion(material)) return undefined
  const { categoria, producto } = getAsignacion(material)
  return `${categoria} · ${producto}`
}
