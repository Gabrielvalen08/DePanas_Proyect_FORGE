import { useEffect, useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react'
import Header from '../components/Header'
import { Boton, Campo, Tarjeta } from '../components/common'
import { exportarCompras, fetchListas, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearPrecio } from '../utils/formato'
import { rangoRapido } from '../utils/exportar'
import { EXPORTAR, VALIDACION, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaExportar.module.css'

const FORMATOS = [
  { valor: 'csv', Icono: FileSpreadsheet },
  { valor: 'json', Icono: FileJson },
]

/**
 * Exportar datos (/exportar): elige un rango de fechas (o un rango rápido) y el
 * formato, y descarga las compras de ese rango. Muestra en vivo cuántas compras
 * y cuánto dinero entran en el archivo.
 */
export default function PantallaExportar() {
  const { addToast } = useToast()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [formato, setFormato] = useState('csv')
  const [compras, setCompras] = useState(null) // null = contando
  const [descargando, setDescargando] = useState(false)

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)

  useEffect(() => {
    if (rangoInvalido) return undefined
    let vigente = true
    fetchListas({ fechaDesde: desde, fechaHasta: hasta })
      .then(datos => { if (vigente) setCompras(datos) })
      .catch(error => { if (vigente) addToast(EXPORTAR.error(error.message), 'error') })
    return () => { vigente = false }
  }, [desde, hasta, rangoInvalido, addToast])

  function elegirRango(clave) {
    const rango = rangoRapido(clave)
    setCompras(null)
    setDesde(rango.desde)
    setHasta(rango.hasta)
  }

  const rangoActivo = Object.keys(EXPORTAR.rangos).find(clave => {
    const r = rangoRapido(clave)
    return r.desde === desde && r.hasta === hasta
  })

  async function descargar() {
    setDescargando(true)
    try {
      addToast(EXPORTAR.descargado(await exportarCompras({ desde, hasta, formato })))
    } catch (error) {
      addToast(EXPORTAR.error(error.message), 'error')
    } finally {
      setDescargando(false)
    }
  }

  const n = compras?.length ?? 0
  const total = compras ? compras.reduce((suma, c) => suma + totalLista(c), 0) : 0
  const listo = compras !== null && !rangoInvalido

  return (
    <>
      <Header title="Exportar datos" frase={fraseDelDia('/exportar')} />

      <main id="contenido" tabIndex={-1}>
        <p className={estilos.intro}>{EXPORTAR.intro}</p>

        <Tarjeta titulo={EXPORTAR.rangoTitulo} icono={<Download />}>
          <div className={estilos.cuerpo}>
            <div className={estilos.rangos} role="group" aria-label="Rangos rápidos">
              {Object.entries(EXPORTAR.rangos).map(([clave, texto]) => (
                <button
                  key={clave}
                  type="button"
                  aria-pressed={rangoActivo === clave}
                  className={[estilos.rango, rangoActivo === clave && estilos.rangoActivo].filter(Boolean).join(' ')}
                  onClick={() => elegirRango(clave)}
                >
                  {texto}
                </button>
              ))}
            </div>

            <div className={estilos.fechas}>
              <Campo
                id="exportar-desde"
                etiqueta={EXPORTAR.desde}
                tipo="date"
                value={desde}
                onChange={e => { setCompras(null); setDesde(e.target.value) }}
              />
              <Campo
                id="exportar-hasta"
                etiqueta={EXPORTAR.hasta}
                tipo="date"
                value={hasta}
                onChange={e => { setCompras(null); setHasta(e.target.value) }}
                error={rangoInvalido ? VALIDACION.rangoFechas : undefined}
              />
            </div>

            <fieldset className={estilos.formatos}>
              <legend className={estilos.legenda}>{EXPORTAR.formato}</legend>
              {FORMATOS.map(({ valor, Icono }) => {
                const { titulo, descripcion } = EXPORTAR.formatos[valor]
                return (
                  <label key={valor} className={[estilos.formato, formato === valor && estilos.formatoActivo].filter(Boolean).join(' ')}>
                    <input
                      type="radio"
                      name="formato"
                      value={valor}
                      checked={formato === valor}
                      onChange={() => setFormato(valor)}
                      className={estilos.radio}
                    />
                    <Icono size={22} aria-hidden="true" className={estilos.formatoIcono} />
                    <span className={estilos.formatoTextos}>
                      <span className={estilos.formatoTitulo}>{titulo}</span>
                      <span className={estilos.formatoDescripcion}>{descripcion}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>

            <div className={estilos.pie}>
              <p className={estilos.resumen} aria-live="polite">
                {rangoInvalido ? '' : !listo ? (
                  <><Loader2 size={16} aria-hidden="true" className={estilos.girando} /> {EXPORTAR.calculando}</>
                ) : n === 0 ? EXPORTAR.sinCompras : EXPORTAR.resumen(n, formatearPrecio(total))}
              </p>
              <Boton
                variante="primario"
                sombra
                icono={<Download />}
                cargando={descargando}
                disabled={!listo || n === 0}
                onClick={descargar}
              >
                {EXPORTAR.descargar}
              </Boton>
            </div>
          </div>
        </Tarjeta>
      </main>
    </>
  )
}
