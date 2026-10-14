import { useRef, useState } from 'react'
import { FileJson, Upload } from 'lucide-react'
import Header from '../components/Header'
import { Boton, Campo, Tarjeta } from '../components/common'
import { leerComprasJSON, importarCompras, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { CARGAR, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaCargar.module.css'

export default function PantallaCargar() {
  const { addToast } = useToast()
  const lectura = useRef(0)
  const [compras, setCompras] = useState(null)
  const [seleccion, setSeleccion] = useState([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState('')

  async function abrir(e) {
    const archivo = e.target.files?.[0]
    const turno = ++lectura.current
    setCompras(null)
    setSeleccion([])
    setError('')
    setResultado('')
    if (!archivo) return
    setOcupado(true)
    try {
      const datos = await leerComprasJSON(archivo)
      if (turno === lectura.current) setCompras(datos)
    } catch (err) {
      if (turno === lectura.current) setError(CARGAR.error(err.message))
    } finally {
      if (turno === lectura.current) setOcupado(false)
    }
  }

  async function cargar() {
    setOcupado(true)
    setError('')
    setResultado('')
    try {
      const respuesta = await importarCompras(compras.filter((_, i) => seleccion.includes(i)))
      const mensaje = CARGAR.exito(respuesta.nuevas)
      setResultado(mensaje)
      addToast(mensaje)
      setCompras(null)
      setSeleccion([])
    } catch (err) {
      const mensaje = CARGAR.error(err.message)
      setError(mensaje)
      addToast(mensaje, 'error')
    } finally {
      setOcupado(false)
    }
  }

  const total = compras?.reduce((s, c, i) => s + (seleccion.includes(i) ? totalLista(c) : 0), 0) ?? 0
  return (
    <>
      <Header title="Cargar datos" frase={fraseDelDia('/cargar')} />
      <main id="contenido" tabIndex={-1}>
        <p className={estilos.intro}>{CARGAR.intro}</p>
        <Tarjeta titulo={CARGAR.titulo} icono={<FileJson />}>
          <div className={estilos.cuerpo}>
            <Campo id="cargar-archivo" etiqueta={CARGAR.archivo} tipo="file" accept=".json,application/json"
              ayuda={CARGAR.ayuda} disabled={ocupado} onChange={abrir} />
            {error && <p className={estilos.error} role="alert">{error}</p>}
            {resultado && <p role="status">{resultado}</p>}
            {compras?.length === 0 && <p role="status">{CARGAR.vacio}</p>}
          </div>
        </Tarjeta>
        {compras?.length > 0 && (
          <Tarjeta titulo={CARGAR.seleccion} icono={<Upload />}>
            <div className={estilos.cuerpo}>
              <div className={estilos.acciones}>
                <Boton variante="secundario" disabled={ocupado} onClick={() => setSeleccion(compras.map((_, i) => i))}>{CARGAR.todas}</Boton>
                <Boton variante="fantasma" disabled={ocupado} onClick={() => setSeleccion([])}>{CARGAR.ninguna}</Boton>
              </div>
              <div className={estilos.tablaContenedor}>
                <table className={estilos.tabla}>
                  <thead><tr><th scope="col"><span className="solo-lector">{CARGAR.seleccion}</span></th><th scope="col">{CARGAR.proveedor}</th><th scope="col">{CARGAR.fecha}</th><th scope="col">{CARGAR.total}</th></tr></thead>
                  <tbody>{compras.map((c, i) => (
                    <tr key={i}>
                      <td><input type="checkbox" aria-label={CARGAR.elegir(i + 1)} checked={seleccion.includes(i)} disabled={ocupado}
                        onChange={e => setSeleccion(prev => e.target.checked ? [...prev, i] : prev.filter(n => n !== i))} /></td>
                      <td>{c.proveedor}</td><td>{formatearFecha(c.fecha)}</td><td>{formatearPrecio(totalLista(c))}</td>
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
      </main>
    </>
  )
}
