import { useEffect, useState } from 'react'
import { ChevronRight, Loader2, Plus, ShoppingCart, SlidersHorizontal } from 'lucide-react'
import Header from '../components/Header'
import FiltrosEnLinea, { FILTROS_VACIOS, contarFiltrosActivos } from '../components/FiltrosEnLinea'
import DetalleLista from '../components/DetalleLista'
import { Boton, EstadoVacio, Insignia, Tarjeta } from '../components/common'
import { fetchListas, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { COMPRA, ESTADOS, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaMaestra.module.css'

export default function PantallaMaestra() {
  const { addToast } = useToast()

  const [listas, setListas] = useState(null) // null = primera carga
  const [filters, setFilters] = useState(FILTROS_VACIOS)
  const [version, setVersion] = useState(0) // sube para recargar tras editar o eliminar
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [listaAbierta, setListaAbierta] = useState(null)

  // Filtra en vivo: mientras llega la respuesta se sigue mostrando la tabla anterior
  useEffect(() => {
    let vigente = true
    fetchListas(filters)
      .then(data => { if (vigente) setListas(data) })
      .catch(() => { if (vigente) addToast(COMPRA.errorCargar, 'error') })
    return () => { vigente = false } // descarta respuestas viejas si cambian los filtros
  }, [filters, version, addToast])

  const filtrosActivos = contarFiltrosActivos(filters)
  const hayFiltros = filtrosActivos > 0

  function contenidoTabla() {
    if (listas === null) {
      return <EstadoVacio cargando icono={<Loader2 />} titulo={ESTADOS.cargando} />
    }
    if (listas.length === 0 && hayFiltros) {
      return (
        <EstadoVacio
          icono={<SlidersHorizontal />}
          titulo={ESTADOS.sinResultados.titulo}
          texto={ESTADOS.sinResultados.texto}
          accion={<Boton variante="fantasma" onClick={() => setFilters(FILTROS_VACIOS)}>{ESTADOS.sinResultados.accion}</Boton>}
        />
      )
    }
    if (listas.length === 0) {
      return (
        <EstadoVacio
          icono={<ShoppingCart />}
          titulo={ESTADOS.sinCompras.titulo}
          texto={ESTADOS.sinCompras.texto}
          accion={<Boton variante="primario" icono={<Plus />} a="/">{ESTADOS.sinCompras.accion}</Boton>}
        />
      )
    }
    return (
      <table className={estilos.tabla}>
        <caption className="solo-lector">Listas de compra. Abre una fila para ver sus productos.</caption>
        <thead>
          <tr>
            <th scope="col">Proveedor</th>
            <th scope="col" className={estilos.numerico}>Materiales</th>
            <th scope="col" className={estilos.numerico}>Gasto total</th>
            <th scope="col">Fecha</th>
            <th scope="col" className={estilos.colAbrir}><span className="solo-lector">Detalle</span></th>
          </tr>
        </thead>
        <tbody>
          {listas.map(lista => {
            const n = lista.materiales.length
            return (
              <tr key={lista.id} className={estilos.fila}>
                <td data-etiqueta="Proveedor">
                  {/* El botón cubre toda la fila (::after): un clic en cualquier parte abre el detalle */}
                  <button
                    type="button"
                    className={estilos.abrir}
                    onClick={() => setListaAbierta(lista)}
                    aria-label={`Ver compra en ${lista.proveedor} del ${formatearFecha(lista.fecha)}, ${n} material${n !== 1 ? 'es' : ''}`}
                  >
                    <Insignia tono="neutro">{lista.proveedor}</Insignia>
                  </button>
                </td>
                <td data-etiqueta="Materiales" className={estilos.numerico}>{n}</td>
                <td data-etiqueta="Gasto total" className={`${estilos.numerico} ${estilos.gasto}`}>
                  {formatearPrecio(totalLista(lista))}
                </td>
                <td data-etiqueta="Fecha" className={estilos.fecha}>{formatearFecha(lista.fecha)}</td>
                <td className={estilos.colAbrir} aria-hidden="true">
                  <ChevronRight size={20} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <>
      <Header title="Compras" frase={fraseDelDia('/compras')} />

      <main id="contenido" tabIndex={-1}>
        <div className={estilos.toolbar}>
          <div className={estilos.filtros}>
            <Boton
              id="open-filter-btn"
              variante={hayFiltros ? 'primario' : 'secundario'}
              icono={<SlidersHorizontal />}
              onClick={() => setFiltrosAbiertos(v => !v)}
              aria-expanded={filtrosAbiertos}
              aria-controls="panel-filtros"
              aria-label={hayFiltros ? `Filtrar, ${filtrosActivos} filtro${filtrosActivos !== 1 ? 's' : ''} activo${filtrosActivos !== 1 ? 's' : ''}` : undefined}
            >
              Filtrar
              {hayFiltros && <Insignia tono="marca" className={estilos.contador}>{filtrosActivos}</Insignia>}
            </Boton>
            <FiltrosEnLinea id="panel-filtros" abierto={filtrosAbiertos} filtros={filters} alCambiar={setFilters} />
          </div>

          <Boton id="go-agregar-compra-btn" variante="primario" sombra icono={<Plus />} a="/" className={estilos.agregar}>
            Agregar compra
          </Boton>
        </div>

        <Tarjeta
          titulo="Listas de compra"
          icono={<ShoppingCart />}
          accion={listas === null ? '…' : `${listas.length} compra${listas.length !== 1 ? 's' : ''}`}
        >
          {contenidoTabla()}
        </Tarjeta>
      </main>

      <DetalleLista
        lista={listaAbierta}
        alCerrar={() => setListaAbierta(null)}
        alCambio={() => setVersion(v => v + 1)}
      />
    </>
  )
}
