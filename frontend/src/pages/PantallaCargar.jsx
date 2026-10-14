import { useRef, useState } from 'react'
import { FileJson, Upload } from 'lucide-react'
import Header from '../components/Header'
import AvisoModo from '../components/AvisoModo'
import CompararCompra from '../components/CompararCompra'
import { contenidoCompra } from '../../../shared/carga-compras.js'
import { Boton, Campo, Tarjeta } from '../components/common'
import { leerComprasJSON, analizarCompras, importarCompras, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { CARGAR, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaCargar.module.css'

export default function PantallaCargar() {
  const { addToast } = useToast()
  const lectura = useRef(0)
  const archivoRef = useRef(null)
  const [compras, setCompras] = useState(null)
  const [seleccion, setSeleccion] = useState([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState('')
  const [analisis, setAnalisis] = useState([])
  const [revision, setRevision] = useState(null)
  const [decisiones, setDecisiones] = useState([])

  async function abrir(e) {
    const archivo = e.target.files?.[0]
    const turno = ++lectura.current
    setRevision(null)
    setDecisiones([])
    setAnalisis([])
    setCompras(null)
    setSeleccion([])
    setError('')
    setResultado('')
    if (!archivo) return
    setOcupado(true)
    try {
      const datos = await leerComprasJSON(archivo)
      const vista = await analizarCompras(datos)
      if (turno === lectura.current) { setCompras(datos); setAnalisis(vista) }
    } catch (err) {
      if (turno === lectura.current) { setError(CARGAR.error(err.message)); limpiarArchivo() }
    } finally {
      if (turno === lectura.current) setOcupado(false)
    }
  }

  // Vacía el selector: así se puede volver a elegir el mismo archivo (si no, no hay evento change)
  function limpiarArchivo() {
    if (archivoRef.current) archivoRef.current.value = ''
  }

  async function cargar() {
    setOcupado(true)
    setError('')
    setResultado('')
    try {
      const elegidas = compras.filter((_, i) => seleccion.includes(i))
      if (!revision) {
        const vista = await analizarCompras(elegidas)
        const conflictos = vista.filter(c => c.estado === 'conflicto')
        if (conflictos.length) {
          setRevision(conflictos)
          setDecisiones(conflictos.map(c => ({
            origen: c.origen, base: contenidoCompra(c.existente), accion: 'combinar',
            existentes: c.existente.materiales.map((_, i) => i), entrantes: [],
            proveedor: 'existente', fecha: 'existente',
          })))
          return
        }
      }
      const respuesta = await importarCompras(elegidas, revision ? decisiones : [])
      const mensaje = CARGAR.resultado(respuesta)
      setResultado(mensaje)
      addToast(mensaje)
      setRevision(null)
      setDecisiones([])
      setCompras(null)
      setSeleccion([])
      limpiarArchivo()
    } catch (err) {
      limpiarArchivo()
      const mensaje = CARGAR.error(err.message)
      setError(mensaje)
      addToast(mensaje, 'error')
    } finally {
      setOcupado(false)
    }
  }

  const incompleta = decisiones.some(d => d.accion !== 'omitir' && !d.existentes.length && !d.entrantes.length)
  const total = compras?.reduce((s, c, i) => s + (seleccion.includes(i) ? totalLista(c) : 0), 0) ?? 0
  return (
    <>
      <Header title="Cargar datos" frase={fraseDelDia('/cargar')} />
      <main id="contenido" tabIndex={-1}>
        <p className={estilos.intro}>{CARGAR.intro}</p>
        <AvisoModo />
        <Tarjeta titulo={CARGAR.titulo} icono={<FileJson />}>
          <div className={estilos.cuerpo}>
            <Campo ref={archivoRef} id="cargar-archivo" etiqueta={CARGAR.archivo} tipo="file" accept=".json,application/json"
              ayuda={CARGAR.ayuda} disabled={ocupado} onChange={abrir} />
            {error && <p className={estilos.error} role="alert">{error}</p>}
            {resultado && <p role="status">{resultado}</p>}
            {compras?.length === 0 && <p role="status">{CARGAR.vacio}</p>}
          </div>
        </Tarjeta>
        {compras?.length > 0 && !revision && (
          <Tarjeta titulo={CARGAR.seleccion} icono={<Upload />}>
            <div className={estilos.cuerpo}>
              <div className={estilos.acciones}>
                <Boton variante="secundario" disabled={ocupado} onClick={() => setSeleccion(compras.map((_, i) => i))}>{CARGAR.todas}</Boton>
                <Boton variante="fantasma" disabled={ocupado} onClick={() => setSeleccion([])}>{CARGAR.ninguna}</Boton>
              </div>
              <div className={estilos.tablaContenedor}>
                <table className={estilos.tabla}>
                  <thead><tr><th scope="col"><span className="solo-lector">{CARGAR.seleccion}</span></th><th scope="col">{CARGAR.proveedor}</th><th scope="col">{CARGAR.fecha}</th><th scope="col">{CARGAR.total}</th><th scope="col">{CARGAR.estadoTitulo}</th></tr></thead>
                  <tbody>{compras.map((c, i) => (
                    <tr key={i}>
                      <td><input type="checkbox" aria-label={CARGAR.elegir(i + 1)} checked={seleccion.includes(i)} disabled={ocupado}
                        onChange={e => setSeleccion(prev => e.target.checked ? [...prev, i] : prev.filter(n => n !== i))} /></td>
                      <td>{c.proveedor}</td><td>{formatearFecha(c.fecha)}</td><td className={estilos.precio}>{formatearPrecio(totalLista(c))}</td><td>{CARGAR.estado[analisis[i]?.estado]}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className={estilos.pie}>
                <p className={estilos.resumen} aria-live="polite">{CARGAR.resumen(seleccion.length, formatearPrecio(total))}</p>
                <Boton variante="primario" sombra icono={<Upload />} cargando={ocupado} disabled={!seleccion.length || ocupado} onClick={cargar}>{CARGAR.importar}</Boton>
              </div>
            </div>
          </Tarjeta>
        )}
        {revision && <>
          {revision.map((c, i) => <CompararCompra key={c.origen} comparacion={c} decision={decisiones[i]} ocupado={ocupado}
            alCambiar={cambios => setDecisiones(prev => prev.map((d, j) => i === j ? { ...d, ...cambios } : d))} />)}
          <div className={estilos.acciones}>
            <Boton variante="secundario" disabled={ocupado} onClick={() => { setRevision(null); setDecisiones([]); setError('') }}>{CARGAR.volver}</Boton>
            <Boton variante="primario" sombra icono={<Upload />} cargando={ocupado} disabled={incompleta || ocupado} onClick={cargar}>{CARGAR.aplicar}</Boton>
          </div>
        </>}
      </main>
    </>
  )
}
