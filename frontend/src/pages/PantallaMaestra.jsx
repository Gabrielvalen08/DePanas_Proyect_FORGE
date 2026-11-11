import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Download, Loader2, Plus, ShoppingCart, SlidersHorizontal, Trash2, Upload,
} from 'lucide-react'
import Header from '../components/Header'
import FiltrosEnLinea, { FILTROS_VACIOS, contarFiltrosActivos } from '../components/FiltrosEnLinea'
import DetalleLista from '../components/DetalleLista'
import { Boton, ConfirmDialog, EstadoVacio, Insignia, MenuAcciones, Tarjeta } from '../components/common'
import { eliminarListas, fetchListas, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { EVENTO_ARTICULO_RENOMBRADO } from '../utils/eventos'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { COMPRA, ESTADOS, LISTA_COMPRAS } from '../utils/mensajes'
import estilos from './PantallaMaestra.module.css'

/** Compras por página: con más, la lista avanza por bloques con las flechas de arriba */
export const TAM_PAGINA = 50

/**
 * Lista de compras (/compras).
 *
 * Como en el correo, cada compra tiene una casilla a la izquierda y la del encabezado elige las
 * de la página (un aviso ofrece elegir todas las de la lista); la fila elegida cambia de color.
 * Con algo elegido aparece el ícono Eliminar junto a Filtrar. Solo «Agregar compra» lleva
 * texto. El ⋮ lleva Exportar y Cargar. Con más de TAM_PAGINA compras, la lista va por páginas
 * («1–50 de 380» con flechas, arriba). Un clic en la fila abre el detalle (DetalleLista).
 *
 * Props: puedeAgregar, puedeExportar, puedeCargar, puedeEditar, puedeEliminar,
 * puedeEditarArticulo (según los permisos y funciones del usuario)
 */
export default function PantallaMaestra({
  puedeAgregar = true, puedeExportar = true, puedeCargar = true, puedeEditar = true, puedeEliminar = true,
  puedeEditarArticulo = true,
}) {
  const { addToast } = useToast()

  const [listas, setListas] = useState(null) // null = primera carga
  const [filters, setFilters] = useState(FILTROS_VACIOS)
  const [version, setVersion] = useState(0) // sube para recargar tras editar o eliminar
  const [pagina, setPagina] = useState(0)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [listaAbierta, setListaAbierta] = useState(null)
  const [elegidas, setElegidas] = useState(() => new Set())
  const [porConfirmar, setPorConfirmar] = useState(false) // pide confirmar Eliminar las elegidas
  const todasRef = useRef(null)

  // Filtra en vivo: mientras llega la respuesta se sigue mostrando la tabla anterior
  useEffect(() => {
    let vigente = true
    fetchListas(filters)
      .then(data => {
        if (!vigente) return
        setListas(data)
        // Lo elegido que ya no está en la lista (filtrada o eliminada) se suelta
        const presentes = new Set(data.map(l => String(l.id)))
        setElegidas(prev => {
          const quedan = [...prev].filter(id => presentes.has(id))
          return quedan.length === prev.size ? prev : new Set(quedan)
        })
      })
      .catch(() => { if (vigente) addToast(COMPRA.errorCargar, 'error') })
    return () => { vigente = false } // descarta respuestas viejas si cambian los filtros
  }, [filters, version, addToast])

  // Un artículo renombrado al editar una compra: la tabla y la compra abierta ya no muestran el nombre viejo
  useEffect(() => {
    function alRenombrar({ detail: { anterior, nombre } }) {
      const igual = m => m.material.trim().toLowerCase() === anterior.trim().toLowerCase()
      setListaAbierta(lista => (lista
        ? { ...lista, materiales: lista.materiales.map(m => (igual(m) ? { ...m, material: nombre } : m)) }
        : lista))
      setVersion(v => v + 1)
    }
    window.addEventListener(EVENTO_ARTICULO_RENOMBRADO, alRenombrar)
    return () => window.removeEventListener(EVENTO_ARTICULO_RENOMBRADO, alRenombrar)
  }, [])

  const filtrosActivos = contarFiltrosActivos(filters)
  const hayFiltros = filtrosActivos > 0
  const conCasillas = puedeEliminar
  const total = listas?.length ?? 0
  const nElegidas = elegidas.size

  // La más reciente arriba; a igual fecha se respeta el orden en que llegaron
  const ordenadas = useMemo(() => (listas ? [...listas].sort((a, b) => b.fecha.localeCompare(a.fecha)) : []), [listas])
  const paginas = Math.max(1, Math.ceil(total / TAM_PAGINA))
  const paginaActual = Math.min(pagina, paginas - 1) // tras eliminar, la última página puede desaparecer
  const desde = paginaActual * TAM_PAGINA
  const visibles = ordenadas.slice(desde, desde + TAM_PAGINA)
  const idsPagina = visibles.map(l => String(l.id))
  const elegidasPagina = idsPagina.filter(id => elegidas.has(id)).length
  const paginaElegida = idsPagina.length > 0 && elegidasPagina === idsPagina.length
  const conPaginas = total > TAM_PAGINA
  // Elegidas que no se ven en esta página: la confirmación de Eliminar las menciona
  const elegidasFuera = nElegidas - elegidasPagina

  // La casilla de «todas» queda a medias con una parte de la página elegida (propiedad del DOM)
  useEffect(() => {
    if (todasRef.current) todasRef.current.indeterminate = elegidasPagina > 0 && !paginaElegida
  }, [elegidasPagina, paginaElegida])

  // Filtrar cambia la lista: se vuelve a la primera página
  function cambiarFiltros(nuevos) {
    setFilters(nuevos)
    setPagina(0)
  }

  function alternar(id) {
    setElegidas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** La casilla del encabezado elige (o suelta) las compras de la página, como en el correo */
  function alternarTodas() {
    setElegidas(prev => {
      const next = new Set(prev)
      for (const id of idsPagina) {
        if (paginaElegida) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  async function eliminarElegidas() {
    // Los ids vuelven a su tipo original (número en modo local, texto con servidor)
    const ids = (listas ?? []).filter(l => elegidas.has(String(l.id))).map(l => l.id)
    try {
      const { eliminadas } = await eliminarListas(ids)
      addToast(LISTA_COMPRAS.eliminadas(eliminadas))
      setElegidas(new Set())
      setVersion(v => v + 1)
    } catch (error) {
      addToast(LISTA_COMPRAS.errorEliminar(error.message), 'error')
    }
  }

  /** Con varias páginas y la página entera elegida, ofrece elegir todas las de la lista o soltarlas */
  function avisoSeleccion() {
    if (!conPaginas || !paginaElegida) return null
    const todas = nElegidas === total
    return (
      <p className={estilos.avisoSeleccion} role="status">
        {todas ? LISTA_COMPRAS.todasLaLista(total) : LISTA_COMPRAS.paginaElegida(idsPagina.length)}
        <Boton
          variante="fantasma"
          onClick={() => setElegidas(todas ? new Set() : new Set(ordenadas.map(l => String(l.id))))}
        >
          {todas ? LISTA_COMPRAS.quitarSeleccion : LISTA_COMPRAS.elegirTodasLista(total)}
        </Boton>
      </p>
    )
  }

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
          accion={<Boton variante="fantasma" onClick={() => cambiarFiltros(FILTROS_VACIOS)}>{ESTADOS.sinResultados.accion}</Boton>}
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
    return (
      <table className={estilos.tabla}>
        <caption className="solo-lector">{LISTA_COMPRAS.titulo}. Abre una fila para ver sus artículos.</caption>
        <thead>
          <tr>
            {conCasillas && (
              <th scope="col" className={estilos.colCasilla}>
                <input
                  ref={todasRef}
                  type="checkbox"
                  className={estilos.casilla}
                  checked={paginaElegida}
                  onChange={alternarTodas}
                  aria-label={LISTA_COMPRAS.elegirTodas}
                />
                <span className={estilos.textoTodas} aria-hidden="true">{LISTA_COMPRAS.todas}</span>
              </th>
            )}
            <th scope="col">{LISTA_COMPRAS.columnas.fecha}</th>
            <th scope="col">{LISTA_COMPRAS.columnas.proveedor}</th>
            <th scope="col" className={estilos.numerico}>{LISTA_COMPRAS.columnas.articulos}</th>
            <th scope="col" className={estilos.numerico}>{LISTA_COMPRAS.columnas.costos}</th>
            <th scope="col" className={estilos.colAbrir}><span className="solo-lector">Detalle</span></th>
          </tr>
        </thead>
        <tbody>
          {visibles.map(lista => {
            const n = lista.materiales.length
            const id = String(lista.id)
            const elegida = elegidas.has(id)
            const fecha = formatearFecha(lista.fecha)
            return (
              <tr key={lista.id} className={[estilos.fila, elegida && estilos.filaElegida].filter(Boolean).join(' ')}>
                {conCasillas && (
                  <td className={estilos.colCasilla}>
                    <input
                      type="checkbox"
                      className={estilos.casilla}
                      checked={elegida}
                      onChange={() => alternar(id)}
                      aria-label={LISTA_COMPRAS.elegirUna(lista.proveedor, fecha)}
                    />
                  </td>
                )}
                <td data-etiqueta={LISTA_COMPRAS.columnas.fecha} className={estilos.fecha}>{fecha}</td>
                <td data-etiqueta={LISTA_COMPRAS.columnas.proveedor}>
                  {/* El botón cubre toda la fila (::after): un clic en cualquier parte abre el detalle */}
                  <button
                    type="button"
                    className={estilos.abrir}
                    onClick={() => setListaAbierta(lista)}
                    aria-label={`Ver compra en ${lista.proveedor} del ${fecha}, ${n} artículo${n !== 1 ? 's' : ''}`}
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

  let detalle = '…'
  if (listas !== null) detalle = nElegidas > 0 ? LISTA_COMPRAS.elegidas(nElegidas, total) : LISTA_COMPRAS.cuenta(total)

  return (
    <>
      <Header title="Lista de compras" />

      <main id="contenido" tabIndex={-1}>
        <Tarjeta
          titulo={LISTA_COMPRAS.titulo}
          icono={<ShoppingCart />}
          detalle={detalle}
          accion={
            // Páginas e íconos (como el de Filtrar) a la izquierda; solo Agregar compra lleva texto
            <div className={estilos.acciones}>
              {conPaginas && (
                <nav className={estilos.paginas} aria-label={LISTA_COMPRAS.paginacion}>
                  <span className={estilos.rango} aria-live="polite">
                    {LISTA_COMPRAS.rango(desde + 1, desde + visibles.length, total)}
                  </span>
                  <Boton
                    variante="fantasma"
                    className={estilos.botonIcono}
                    icono={<ChevronLeft />}
                    onClick={() => setPagina(paginaActual - 1)}
                    disabled={paginaActual === 0}
                    aria-label={LISTA_COMPRAS.anterior}
                    title={LISTA_COMPRAS.anterior}
                  />
                  <Boton
                    variante="fantasma"
                    className={estilos.botonIcono}
                    icono={<ChevronRight />}
                    onClick={() => setPagina(paginaActual + 1)}
                    disabled={paginaActual >= paginas - 1}
                    aria-label={LISTA_COMPRAS.siguiente}
                    title={LISTA_COMPRAS.siguiente}
                  />
                </nav>
              )}
              {nElegidas > 0 && puedeEliminar && (
                <Boton
                  variante="secundario"
                  className={`${estilos.botonIcono} ${estilos.botonEliminar}`}
                  icono={<Trash2 />}
                  onClick={() => setPorConfirmar(true)}
                  aria-label={LISTA_COMPRAS.eliminarElegidas(nElegidas)}
                  title={LISTA_COMPRAS.eliminarElegidas(nElegidas)}
                />
              )}
              <Boton
                id="open-filter-btn"
                variante={hayFiltros ? 'primario' : 'secundario'}
                className={estilos.botonIcono}
                icono={<SlidersHorizontal />}
                onClick={() => setFiltrosAbiertos(v => !v)}
                aria-expanded={filtrosAbiertos}
                aria-controls="panel-filtros"
                aria-label={hayFiltros ? LISTA_COMPRAS.filtrarActivos(filtrosActivos) : LISTA_COMPRAS.filtrar}
                title={LISTA_COMPRAS.filtrar}
              >
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
            <FiltrosEnLinea id="panel-filtros" abierto={filtrosAbiertos} filtros={filters} alCambiar={cambiarFiltros} />
          </div>
          {avisoSeleccion()}
          {contenidoTabla()}
        </Tarjeta>
      </main>

      <DetalleLista
        lista={listaAbierta}
        alCerrar={() => setListaAbierta(null)}
        alCambio={() => setVersion(v => v + 1)}
        puedeEditar={puedeEditar}
        puedeEliminar={puedeEliminar}
        puedeEditarArticulo={puedeEditarArticulo}
      />

      <ConfirmDialog
        isOpen={porConfirmar}
        onClose={() => setPorConfirmar(false)}
        onConfirm={eliminarElegidas}
        title={LISTA_COMPRAS.confirmarEliminarVarias.titulo(nElegidas)}
        message={elegidasFuera > 0
          ? `${LISTA_COMPRAS.confirmarEliminarVarias.mensaje} ${LISTA_COMPRAS.confirmarEliminarVarias.otrasPaginas(elegidasFuera)}`
          : LISTA_COMPRAS.confirmarEliminarVarias.mensaje}
        confirmLabel={LISTA_COMPRAS.confirmarEliminarVarias.confirmar}
        danger
      />
    </>
  )
}
