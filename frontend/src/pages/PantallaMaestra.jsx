import { useEffect, useState } from 'react'
import { ChevronRight, Download, Loader2, Plus, ShoppingCart, SlidersHorizontal, Upload } from 'lucide-react'
import Header from '../components/Header'
import FiltrosEnLinea, { FILTROS_VACIOS, contarFiltrosActivos } from '../components/FiltrosEnLinea'
import DetalleLista from '../components/DetalleLista'
import { Boton, EstadoVacio, Insignia, MenuAcciones, Tarjeta } from '../components/common'
import { fetchListas, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { COMPRA, ESTADOS, LISTA_COMPRAS, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaMaestra.module.css'

/**
 * Lista de compras (/compras). Filtrar, Agregar compra y el menú ⋮ (Exportar y Cargar
 * datos) van en el encabezado de la tabla. Las compras van por fecha, la más reciente arriba.
 * Props: puedeAgregar, puedeExportar, puedeCargar, puedeEditar, puedeEliminar (según los permisos
 * y las funciones del usuario)
 */
export default function PantallaMaestra({
  puedeAgregar = true, puedeExportar = true, puedeCargar = true, puedeEditar = true, puedeEliminar = true,
}) {
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
          accion={puedeAgregar && <Boton variante="primario" icono={<Plus />} a="/">{ESTADOS.sinCompras.accion}</Boton>}
        />
      )
    }
    // La más reciente arriba; a igual fecha se respeta el orden en que llegaron
    const ordenadas = [...listas].sort((a, b) => b.fecha.localeCompare(a.fecha))
    return (
      <table className={estilos.tabla}>
        <caption className="solo-lector">Listas de compra. Abre una fila para ver sus productos.</caption>
        <thead>
          <tr>
            <th scope="col">{LISTA_COMPRAS.columnas.fecha}</th>
            <th scope="col">{LISTA_COMPRAS.columnas.proveedor}</th>
            <th scope="col" className={estilos.numerico}>{LISTA_COMPRAS.columnas.articulos}</th>
            <th scope="col" className={estilos.numerico}>{LISTA_COMPRAS.columnas.costos}</th>
            <th scope="col" className={estilos.colAbrir}><span className="solo-lector">Detalle</span></th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map(lista => {
            const n = lista.materiales.length
            return (
              <tr key={lista.id} className={estilos.fila}>
                <td data-etiqueta={LISTA_COMPRAS.columnas.fecha} className={estilos.fecha}>{formatearFecha(lista.fecha)}</td>
                <td data-etiqueta={LISTA_COMPRAS.columnas.proveedor}>
                  {/* El botón cubre toda la fila (::after): un clic en cualquier parte abre el detalle */}
                  <button
                    type="button"
                    className={estilos.abrir}
                    onClick={() => setListaAbierta(lista)}
                    aria-label={`Ver compra en ${lista.proveedor} del ${formatearFecha(lista.fecha)}, ${n} artículo${n !== 1 ? 's' : ''}`}
                  >
                    <Insignia tono="neutro">{lista.proveedor}</Insignia>
                  </button>
                </td>
                <td data-etiqueta={LISTA_COMPRAS.columnas.articulos} className={estilos.numerico}>{n}</td>
                <td data-etiqueta={LISTA_COMPRAS.columnas.costos} className={`${estilos.numerico} ${estilos.gasto}`}>
                  {formatearPrecio(totalLista(lista))}
                </td>
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
      <Header title="Lista de compras" frase={fraseDelDia('/compras')} />

      <main id="contenido" tabIndex={-1}>
        <Tarjeta
          titulo={LISTA_COMPRAS.titulo}
          icono={<ShoppingCart />}
          accion={
            // Acciones en el encabezado de la tabla, para aprovechar el espacio
            <div className={estilos.acciones}>
              <span className={estilos.cuenta}>{listas === null ? '…' : LISTA_COMPRAS.cuenta(listas.length)}</span>
              <Boton
                id="open-filter-btn"
                variante={hayFiltros ? 'primario' : 'secundario'}
                icono={<SlidersHorizontal />}
                onClick={() => setFiltrosAbiertos(v => !v)}
                aria-expanded={filtrosAbiertos}
                aria-controls="panel-filtros"
                aria-label={hayFiltros ? LISTA_COMPRAS.filtrarActivos(filtrosActivos) : undefined}
              >
                {LISTA_COMPRAS.filtrar}
                {hayFiltros && <Insignia tono="marca" className={estilos.contador}>{filtrosActivos}</Insignia>}
              </Boton>
              {puedeAgregar && (
                <Boton id="go-agregar-compra-btn" variante="primario" icono={<Plus />} a="/">
                  {LISTA_COMPRAS.agregar}
                </Boton>
              )}
              <MenuAcciones
                etiqueta={LISTA_COMPRAS.masAcciones}
                opciones={[
                  { etiqueta: LISTA_COMPRAS.exportar, icono: <Download />, a: puedeExportar ? '/exportar' : undefined },
                  { etiqueta: LISTA_COMPRAS.cargar, icono: <Upload />, a: puedeCargar ? '/cargar' : undefined },
                ]}
              />
            </div>
          }
        >
          <div className={estilos.panelFiltros}>
            <FiltrosEnLinea id="panel-filtros" abierto={filtrosAbiertos} filtros={filters} alCambiar={setFilters} />
          </div>
          {contenidoTabla()}
        </Tarjeta>
      </main>

      <DetalleLista
        lista={listaAbierta}
        alCerrar={() => setListaAbierta(null)}
        alCambio={() => setVersion(v => v + 1)}
        puedeEditar={puedeEditar}
        puedeEliminar={puedeEliminar}
      />
    </>
  )
}
