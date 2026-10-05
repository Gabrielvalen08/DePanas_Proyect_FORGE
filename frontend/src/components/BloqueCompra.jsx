import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Plus, Save, Trash2 } from 'lucide-react'
import AutocompleteInput from './AutocompleteInput'
import { Boton, Campo, Selector } from './common'
import { getMateriales, getProveedores } from '../services/api'
import { fechaHoyISO, formatearPrecio } from '../utils/formato'
import { springSuave } from '../styles/movimiento'
import estilos from './BloqueCompra.module.css'

export const UNIDADES = ['lb', 'kg', 'g', 'oz', 'galon', 'litro', 'ml', 'unidad', 'caja', 'bolsa']

// Campos obligatorios de cada fila (en el orden en que aparecen)
const CAMPOS_FILA = [
  { clave: 'material', nombre: 'Material' },
  { clave: 'cantidad', nombre: 'Cantidad' },
  { clave: 'monto',    nombre: 'Precio' },
]

let siguienteIdFila = 1

function filaVacia() {
  return { id: siguienteIdFila++, material: '', cantidad: '', unidad: 'lb', monto: '' }
}

function filasDesde(materiales) {
  if (!materiales?.length) return [filaVacia()]
  return materiales.map(m => ({
    id: siguienteIdFila++,
    material: m.material,
    cantidad: String(m.cantidad),
    unidad: m.unidad || 'lb',
    monto: String(m.monto !== undefined ? m.monto : m.precio || ''),
  }))
}

// Una fila sin material, cantidad ni monto no cuenta: se ignora al guardar
function estaVacia(fila) {
  return !fila.material.trim() && !fila.cantidad && !fila.monto
}

function validarFila(fila) {
  const errores = {}
  if (!fila.material.trim()) errores.material = 'Escribe el material'
  if (!fila.cantidad || isNaN(fila.cantidad) || Number(fila.cantidad) <= 0)
    errores.cantidad = 'Ingresa una cantidad mayor a 0'
  if (!fila.monto || isNaN(fila.monto) || Number(fila.monto) <= 0)
    errores.monto = 'Ingresa un precio mayor a 0'
  return errores
}

function validarEncabezado(campo, valor) {
  if (campo === 'proveedor' && !valor.trim()) return 'Escribe el proveedor'
  if (campo === 'fecha' && !valor) return 'Elige la fecha de la compra'
  return undefined
}

const clave   = (filaId, campo) => `${filaId}-${campo}`
const filtrar = (lista, texto) => lista.filter(x => x.toLowerCase().includes(texto.toLowerCase()))

/**
 * BloqueCompra
 * Formulario de una lista de compra: proveedor y fecha en el encabezado,
 * y filas de materiales (material, cantidad + unidad, monto).
 *
 * Props:
 *  - titulo: texto del encabezado (por defecto "Detalle de compra")
 *  - inicial: { proveedor, fecha, materiales } para editar
 *  - alGuardar(lista): async; si se resuelve, se llama a alGuardado
 *  - alGuardado(lista), alCancelar()
 *  - textoGuardar, enfocarAlMontar, plano (sin tarjeta, p. ej. dentro de un modal)
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
}) {
  const id = useId().replace(/:/g, '')
  const [proveedor, setProveedor] = useState(inicial?.proveedor ?? '')
  const [fecha, setFecha]         = useState(inicial?.fecha ?? fechaHoyISO())
  const [filas, setFilas]         = useState(() => filasDesde(inicial?.materiales || inicial?.productos))
  const [errores, setErrores]     = useState({})
  const [guardando, setGuardando] = useState(false)
  const [intentoGuardar, setIntentoGuardar] = useState(false)

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
  function cambiarFila(filaId, campo, valor) {
    const filaActual = filas.find(f => f.id === filaId)
    const actualizada = { ...filaActual, [campo]: valor }

    setFilas(prev => prev.map(f => (f.id === filaId ? actualizada : f)))
    if (errores[clave(filaId, campo)]) fijarError(clave(filaId, campo), validarFila(actualizada)[campo])
  }

  function salirDeCampoFila(filaId, campo) {
    if (!intentoGuardar) return
    const fila = filas.find(f => f.id === filaId)
    if (fila && !estaVacia(fila)) fijarError(clave(filaId, campo), validarFila(fila)[campo])
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

    const lista = {
      proveedor,
      fecha,
      categoria: '',
      materiales: filasConDatos.map(({ material, cantidad, unidad, monto }) => ({
        material,
        cantidad: Number(cantidad),
        unidad,
        monto: Number(monto),
        precio: Number(monto),
        producto: '',
      })),
      productos: filasConDatos.map(({ material, cantidad, unidad, monto }) => ({
        producto: material,
        cantidad: Number(cantidad),
        unidad,
        precio: Number(monto),
      })),
    }

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

  const total = filas.reduce((suma, f) => suma + (Number(f.monto) > 0 ? Number(f.monto) : 0), 0)

  const resumen = [
    errores.proveedor && { idCampo: `${id}-proveedor`, texto: `Proveedor: ${errores.proveedor}` },
    errores.fecha     && { idCampo: `${id}-fecha`,     texto: `Fecha: ${errores.fecha}` },
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
    <form onSubmit={guardar} noValidate className={estilos.bloque} aria-labelledby={`${id}-titulo`}>
      <section className={[estilos.tarjeta, plano && estilos.plano].filter(Boolean).join(' ')}>
        <header className={estilos.encabezado}>
          <h2 id={`${id}-titulo`} className={estilos.titulo}>{titulo}</h2>
          <div className={estilos.encabezadoCampos}>
            <div className={estilos.campoProveedor}>
              <AutocompleteInput
                id={`${id}-proveedor`}
                etiqueta="Proveedor"
                value={proveedor}
                onChange={valor => cambiarEncabezado('proveedor', valor)}
                onBlur={() => salirDeEncabezado('proveedor')}
                placeholder="Súper Selectos…"
                getSuggestions={sugerirProveedores}
                error={errores.proveedor}
              />
            </div>
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
          </div>
        </header>

        {resumen.length > 0 && (
          <div ref={resumenRef} role="alert" tabIndex={-1} className={estilos.resumen} aria-labelledby={`${id}-resumen`}>
            <h3 id={`${id}-resumen`} className={estilos.resumenTitulo}>
              <AlertCircle size={18} aria-hidden="true" />
              Revisa estos campos
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
              <th scope="col" className={estilos.colPrecio}>Precio</th>
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
                        onBlur={() => salirDeCampoFila(fila.id, 'material')}
                        placeholder="Ej: Harina de maíz…"
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
                          placeholder="3"
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

                    {/* Precio / Monto */}
                    <td>
                      <Campo
                        id={`${id}-monto-${fila.id}`}
                        etiqueta={`Precio, fila ${n}`}
                        etiquetaOculta
                        tipo="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        prefijo="$"
                        placeholder="0.00"
                        value={fila.monto}
                        onChange={e => cambiarFila(fila.id, 'monto', e.target.value)}
                        onBlur={() => salirDeCampoFila(fila.id, 'monto')}
                        error={errores[clave(fila.id, 'monto')]}
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
          <Boton variante="secundario" icono={<Plus />} onClick={agregarFila} className={estilos.botonPunteado}>
            Agregar otra fila
          </Boton>
          <p className={estilos.total}>
            <span className={estilos.totalEtiqueta}>Total</span>
            <span className={estilos.totalValor} aria-live="polite">{formatearPrecio(total)}</span>
          </p>
        </div>
      </section>

      <div className={estilos.acciones}>
        <Boton variante="fantasma" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" variante="primario" sombra icono={<Save />} cargando={guardando}>
          {guardando ? 'Guardando…' : textoGuardar}
        </Boton>
      </div>
    </form>
  )
}
