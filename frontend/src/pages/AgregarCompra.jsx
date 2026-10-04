import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, ArrowLeft, CalendarDays, Plus, Save, Trash2 } from 'lucide-react'
import Header from '../components/Header'
import AutocompleteInput from '../components/AutocompleteInput'
import { Boton, Campo, Selector, Tarjeta } from '../components/common'
import { guardarCompras, getProveedores, getProductos } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fechaHoyISO, formatearFechaTexto } from '../utils/formato'
import { springSuave } from '../styles/movimiento'
import estilos from './AgregarCompra.module.css'

const UNIDADES = ['lb', 'kg', 'g', 'oz', 'galon', 'litro', 'ml', 'unidad', 'caja', 'bolsa']

// Campos validados, en el orden en que aparecen en la fila
const CAMPOS = [
  { clave: 'proveedor', nombre: 'Proveedor' },
  { clave: 'producto', nombre: 'Producto' },
  { clave: 'cantidad', nombre: 'Cantidad' },
  { clave: 'precio', nombre: 'Precio' },
]

let siguienteId = 1

function emptyFila() {
  return {
    id: siguienteId++,
    proveedor: '',
    producto: '',
    cantidad: '',
    unidad: 'lb',
    precio: '',
    fecha: fechaHoyISO(),
  }
}

function validateFila(fila) {
  const errors = {}
  if (!fila.proveedor.trim()) errors.proveedor = 'Escribe el proveedor'
  if (!fila.producto.trim()) errors.producto = 'Escribe el producto'
  if (!fila.cantidad || isNaN(fila.cantidad) || Number(fila.cantidad) <= 0)
    errors.cantidad = 'Ingresa una cantidad mayor a 0'
  if (!fila.precio || isNaN(fila.precio) || Number(fila.precio) <= 0)
    errors.precio = 'Ingresa un precio mayor a 0'
  return errors
}

const clave = (filaId, campo) => `${filaId}-${campo}`

export default function AgregarCompra() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const today = fechaHoyISO()

  const [filas, setFilas] = useState(() => [emptyFila()])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const resumenRef = useRef(null)
  const enfocarResumen = useRef(false)
  const filaPorEnfocar = useRef(null)

  // Tras un envío fallido, el foco va al resumen de errores
  useEffect(() => {
    if (enfocarResumen.current && resumenRef.current) {
      resumenRef.current.focus()
      enfocarResumen.current = false
    }
  }, [errors])

  // Una fila recién agregada recibe el foco en su campo Proveedor
  useEffect(() => {
    if (filaPorEnfocar.current !== null) {
      document.getElementById(`proveedor-${filaPorEnfocar.current}`)?.focus()
      filaPorEnfocar.current = null
    }
  }, [filas])

  // Sugerencias para autocompletado
  const suggestProveedores = useCallback((text) => {
    const lista = getProveedores()
    return lista.filter(p => p.toLowerCase().includes(text.toLowerCase()))
  }, [])

  const suggestProductos = useCallback((text) => {
    const lista = getProductos()
    return lista.filter(p => p.toLowerCase().includes(text.toLowerCase()))
  }, [])

  function validarCampo(fila, campo) {
    const mensaje = validateFila(fila)[campo]
    setErrors(prev => {
      const next = { ...prev }
      if (mensaje) next[clave(fila.id, campo)] = mensaje
      else delete next[clave(fila.id, campo)]
      return next
    })
  }

  function updateFila(id, field, value) {
    const actual = filas.find(f => f.id === id)
    const actualizada = { ...actual, [field]: value }
    setFilas(prev => prev.map(f => (f.id === id ? actualizada : f)))
    // Si el campo ya tenía error, se revalida en vivo para que desaparezca al corregirlo
    if (errors[clave(id, field)]) validarCampo(actualizada, field)
  }

  function alSalirDeCampo(id, field) {
    const fila = filas.find(f => f.id === id)
    if (fila) validarCampo(fila, field)
  }

  function addFila() {
    const nueva = emptyFila()
    filaPorEnfocar.current = nueva.id
    setFilas(prev => [...prev, nueva])
  }

  function removeFila(id) {
    if (filas.length === 1) return // siempre al menos 1 fila
    setFilas(prev => prev.filter(f => f.id !== id))
    setErrors(prev => {
      const next = { ...prev }
      CAMPOS.forEach(({ clave: campo }) => delete next[clave(id, campo)])
      return next
    })
  }

  async function handleGuardar() {
    const newErrors = {}
    filas.forEach(f => {
      Object.entries(validateFila(f)).forEach(([field, msg]) => {
        newErrors[clave(f.id, field)] = msg
      })
    })

    if (Object.keys(newErrors).length > 0) {
      enfocarResumen.current = true
      setErrors(newErrors)
      return
    }

    setSaving(true)
    try {
      const payload = filas.map(f => ({
        proveedor: f.proveedor.trim(),
        producto: f.producto.trim(),
        cantidad: parseFloat(f.cantidad),
        unidad: f.unidad,
        precio: parseFloat(f.precio),
        fecha: f.fecha || today,
      }))
      await guardarCompras(payload)
      addToast(`${filas.length} compra${filas.length > 1 ? 's' : ''} guardada${filas.length > 1 ? 's' : ''} correctamente`)
      navigate('/compras')
    } catch {
      addToast('Error al guardar las compras', 'error')
    } finally {
      setSaving(false)
    }
  }

  function fieldError(filaId, field) {
    return errors[clave(filaId, field)]
  }

  // Resumen en el orden visual: fila por fila, campo por campo
  const resumen = filas.flatMap((fila, i) =>
    CAMPOS.filter(({ clave: campo }) => fieldError(fila.id, campo)).map(({ clave: campo, nombre }) => ({
      id: `${campo}-${fila.id}`,
      texto: `Fila ${i + 1} · ${nombre}: ${fieldError(fila.id, campo)}`,
    }))
  )

  function irACampo(e, idCampo) {
    e.preventDefault()
    document.getElementById(idCampo)?.focus()
  }

  return (
    <>
      <Header title="Agregar compra" />

      <main id="contenido" tabIndex={-1}>
        <div className={estilos.encabezado}>
          <Boton variante="fantasma" tamano="sm" icono={<ArrowLeft />} a="/compras" id="back-to-maestra-btn">
            Volver a compras
          </Boton>

          <Tarjeta className={estilos.fechaHoy}>
            <span className={estilos.fechaEtiqueta}>
              <CalendarDays size={16} aria-hidden="true" />
              Fecha de hoy
            </span>
            <span className={estilos.fechaValor}>{formatearFechaTexto(today)}</span>
            <p className={estilos.fechaNota}>
              Esta fecha se aplica a todo lo que agregues ahora; puedes cambiarla por fila.
            </p>
          </Tarjeta>
        </div>

        {resumen.length > 0 && (
          <div ref={resumenRef} role="alert" tabIndex={-1} className={estilos.resumen} aria-labelledby="resumen-titulo">
            <h2 id="resumen-titulo" className={estilos.resumenTitulo}>
              <AlertCircle size={20} aria-hidden="true" />
              Revisa estos campos
            </h2>
            <ul className={estilos.resumenLista}>
              {resumen.map(item => (
                <li key={item.id}>
                  <a href={`#${item.id}`} onClick={e => irACampo(e, item.id)}>{item.texto}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Tarjeta
          titulo="Detalle de compras"
          accion={`${filas.length} fila${filas.length !== 1 ? 's' : ''}`}
          className={estilos.tarjetaTabla}
        >
          <table className={estilos.tabla}>
            <caption className="solo-lector">Compras por registrar</caption>
            <thead>
              <tr>
                <th scope="col" className={estilos.colTexto}>Proveedor</th>
                <th scope="col" className={estilos.colTexto}>Producto</th>
                <th scope="col" className={estilos.colCantidad}>Cantidad</th>
                <th scope="col" className={estilos.colPrecio}>Precio</th>
                <th scope="col" className={estilos.colFecha}>Fecha</th>
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
                      <td>
                        <AutocompleteInput
                          id={`proveedor-${fila.id}`}
                          etiqueta={`Proveedor, fila ${n}`}
                          etiquetaOculta
                          value={fila.proveedor}
                          onChange={val => updateFila(fila.id, 'proveedor', val)}
                          onBlur={() => alSalirDeCampo(fila.id, 'proveedor')}
                          placeholder="Súper Selectos…"
                          getSuggestions={suggestProveedores}
                          error={fieldError(fila.id, 'proveedor')}
                        />
                      </td>
                      <td>
                        <AutocompleteInput
                          id={`producto-${fila.id}`}
                          etiqueta={`Producto, fila ${n}`}
                          etiquetaOculta
                          value={fila.producto}
                          onChange={val => updateFila(fila.id, 'producto', val)}
                          onBlur={() => alSalirDeCampo(fila.id, 'producto')}
                          placeholder="Pollo, arroz…"
                          getSuggestions={suggestProductos}
                          error={fieldError(fila.id, 'producto')}
                        />
                      </td>
                      <td>
                        <div className={estilos.cantidadGrupo}>
                          <Campo
                            id={`cantidad-${fila.id}`}
                            etiqueta={`Cantidad, fila ${n}`}
                            etiquetaOculta
                            tipo="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            placeholder="3"
                            value={fila.cantidad}
                            onChange={e => updateFila(fila.id, 'cantidad', e.target.value)}
                            onBlur={() => alSalirDeCampo(fila.id, 'cantidad')}
                            error={fieldError(fila.id, 'cantidad')}
                            className={estilos.cantidad}
                          />
                          <Selector
                            id={`unidad-${fila.id}`}
                            etiqueta={`Unidad, fila ${n}`}
                            etiquetaOculta
                            opciones={UNIDADES}
                            value={fila.unidad}
                            onChange={e => updateFila(fila.id, 'unidad', e.target.value)}
                            className={estilos.unidad}
                          />
                        </div>
                      </td>
                      <td>
                        <Campo
                          id={`precio-${fila.id}`}
                          etiqueta={`Precio, fila ${n}`}
                          etiquetaOculta
                          tipo="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          prefijo="$"
                          placeholder="0.00"
                          value={fila.precio}
                          onChange={e => updateFila(fila.id, 'precio', e.target.value)}
                          onBlur={() => alSalirDeCampo(fila.id, 'precio')}
                          error={fieldError(fila.id, 'precio')}
                        />
                      </td>
                      <td>
                        <Campo
                          id={`fecha-${fila.id}`}
                          etiqueta={`Fecha, fila ${n}`}
                          etiquetaOculta
                          tipo="date"
                          value={fila.fecha}
                          onChange={e => updateFila(fila.id, 'fecha', e.target.value)}
                        />
                      </td>
                      <td className={estilos.colAcciones}>
                        <Boton
                          variante="icono"
                          icono={<Trash2 />}
                          aria-label={`Eliminar fila ${n}`}
                          onClick={() => removeFila(fila.id)}
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

          <div className={estilos.agregarFila}>
            <Boton variante="secundario" ancho icono={<Plus />} onClick={addFila} id="add-row-btn" className={estilos.botonPunteado}>
              Agregar otra fila
            </Boton>
          </div>
        </Tarjeta>

        <div className={estilos.pie}>
          <Boton variante="fantasma" a="/compras" id="cancel-compra-btn">
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            sombra
            icono={<Save />}
            onClick={handleGuardar}
            cargando={saving}
            id="guardar-compra-btn"
          >
            {saving ? 'Guardando…' : 'Guardar compra'}
          </Boton>
        </div>
      </main>
    </>
  )
}
