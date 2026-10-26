import { useRef, useState } from 'react'
import { ArrowLeft, FileJson, ListChecks, Upload } from 'lucide-react'
import Header from '../components/Header'
import { useRegresar } from '../hooks/useRegresar'
import CompararCompra from '../components/CompararCompra'
import { contenidoCompra } from '../../../shared/carga-compras.js'
import { Boton, ConfirmDialog, Insignia, SelectorArchivo, Tarjeta } from '../components/common'
import { leerComprasJSON, analizarCompras, importarCompras, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { CARGAR, CONFIRMAR, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaCargar.module.css'

// Cada estado del análisis con su tono de insignia
const TONO_ESTADO = { nueva: 'exito', identica: 'neutro', conflicto: 'aviso' }

/**
 * Cargar datos (/cargar): lee un JSON de Exportar, muestra sus compras para
 * elegir cuáles traer y, si alguna ya existe con cambios, abre la comparación.
 */
export default function PantallaCargar() {
  // Se llega desde el ⋮ de Lista de compras: ahí vuelve si no hay pantalla anterior
  const regresar = useRegresar('/compras')
  const { addToast } = useToast()
  const lectura = useRef(0)
  const archivoRef = useRef(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [confirmandoCarga, setConfirmandoCarga] = useState(false)
  const [compras, setCompras] = useState(null)
  const [seleccion, setSeleccion] = useState([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState('')
  const [analisis, setAnalisis] = useState([])
  const [revision, setRevision] = useState(null)
  const [decisiones, setDecisiones] = useState([])

  async function abrir(archivo) {
    const turno = ++lectura.current
    setRevision(null)
    setDecisiones([])
    setAnalisis([])
    setCompras(null)
    setSeleccion([])
    setError('')
    setResultado('')
    setNombreArchivo(archivo?.name ?? '')
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

  function alternar(i, marcada) {
    setSeleccion(prev => (marcada ? [...prev, i] : prev.filter(n => n !== i)))
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
      setNombreArchivo('')
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
      <Header title="Cargar datos" frase={fraseDelDia('/cargar')} alRegresar={regresar} />

      <main id="contenido" tabIndex={-1}>

        <Tarjeta titulo={CARGAR.titulo} icono={<FileJson />}>
          <div className={estilos.cuerpo}>
            <SelectorArchivo
              ref={archivoRef}
              id="cargar-archivo"
              etiqueta={CARGAR.archivo}
              ayuda={CARGAR.ayuda}
              accept=".json,application/json"
              nombre={nombreArchivo}
              textoVacio={CARGAR.ningunArchivo}
              textoSoltar={CARGAR.soltar}
              disabled={ocupado}
              onElegir={abrir}
            />
            {error && <p className={estilos.error} role="alert">{error}</p>}
            {resultado && <p className={estilos.exito} role="status">{resultado}</p>}
            {compras?.length === 0 && <p className={estilos.aviso} role="status">{CARGAR.vacio}</p>}
          </div>
        </Tarjeta>

        {compras?.length > 0 && !revision && (
          <Tarjeta
            titulo={CARGAR.seleccion}
            icono={<ListChecks />}
            accion={
              <div className={estilos.acciones}>
                <Boton variante="fantasma" disabled={ocupado} onClick={() => setSeleccion(compras.map((_, i) => i))}>{CARGAR.todas}</Boton>
                <Boton variante="fantasma" disabled={ocupado || !seleccion.length} onClick={() => setSeleccion([])}>{CARGAR.ninguna}</Boton>
              </div>
            }
          >
            <div className={estilos.tablaContenedor}>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th scope="col" className={estilos.columnaCasilla}><span className="solo-lector">{CARGAR.seleccion}</span></th>
                    <th scope="col">{CARGAR.proveedor}</th>
                    <th scope="col">{CARGAR.fecha}</th>
                    <th scope="col" className={estilos.numerico}>{CARGAR.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c, i) => {
                    const elegida = seleccion.includes(i)
                    const estado = analisis[i]?.estado
                    return (
                      <tr key={i} className={[estilos.fila, elegida && estilos.filaElegida].filter(Boolean).join(' ')}>
                        <td className={estilos.columnaCasilla}>
                          <input
                            type="checkbox"
                            className={estilos.casilla}
                            aria-label={CARGAR.elegir(i + 1)}
                            checked={elegida}
                            disabled={ocupado}
                            onChange={e => alternar(i, e.target.checked)}
                          />
                        </td>
                        {/* El estado va bajo el proveedor: así la tabla cabe sin scroll en pantallas angostas */}
                        <td>
                          <span className={estilos.proveedor}>{c.proveedor}</span>
                          {estado && <Insignia tono={TONO_ESTADO[estado]} className={estilos.estado}>{CARGAR.estado[estado]}</Insignia>}
                        </td>
                        <td className={estilos.fecha}>{formatearFecha(c.fecha)}</td>
                        <td className={`${estilos.numerico} ${estilos.monto}`}>{formatearPrecio(totalLista(c))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className={`${estilos.cuerpo} ${estilos.pie}`}>
              <p className={estilos.resumen} aria-live="polite">{CARGAR.resumen(seleccion.length, formatearPrecio(total))}</p>
              <Boton variante="primario" sombra icono={<Upload />} cargando={ocupado} disabled={!seleccion.length || ocupado} onClick={() => setConfirmandoCarga(true)}>
                {CARGAR.importar}
              </Boton>
            </div>
          </Tarjeta>
        )}

        {revision && (
          <>
            {revision.map((c, i) => (
              <CompararCompra
                key={c.origen}
                comparacion={c}
                decision={decisiones[i]}
                ocupado={ocupado}
                alCambiar={cambios => setDecisiones(prev => prev.map((d, j) => (i === j ? { ...d, ...cambios } : d)))}
              />
            ))}
            <div className={estilos.accionesFinales}>
              <Boton variante="secundario" icono={<ArrowLeft />} disabled={ocupado} onClick={() => { setRevision(null); setDecisiones([]); setError('') }}>
                {CARGAR.volver}
              </Boton>
              <Boton variante="primario" sombra icono={<Upload />} cargando={ocupado} disabled={incompleta || ocupado} onClick={() => setConfirmandoCarga(true)}>
                {CARGAR.aplicar}
              </Boton>
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        isOpen={confirmandoCarga}
        onClose={() => setConfirmandoCarga(false)}
        onConfirm={cargar}
        title={CONFIRMAR.cargar.titulo}
        message={CONFIRMAR.cargar.mensaje(seleccion.length, formatearPrecio(total))}
        confirmLabel={CONFIRMAR.cargar.confirmar}
      />
    </>
  )
}
