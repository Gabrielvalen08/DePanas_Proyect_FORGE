import { useEffect, useRef, useState } from 'react'
import {
  Archive, ArchiveRestore, ChevronRight, Download, Loader2, Plus, ShoppingCart, SlidersHorizontal, Trash2, Upload,
} from 'lucide-react'
import Header from '../components/Header'
import FiltrosEnLinea, { FILTROS_VACIOS, contarFiltrosActivos } from '../components/FiltrosEnLinea'
import DetalleLista from '../components/DetalleLista'
import { Boton, ConfirmDialog, EstadoVacio, Insignia, MenuAcciones, Tarjeta } from '../components/common'
import { archivarListas, eliminarListas, fetchListas, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useRegresar } from '../hooks/useRegresar'
import { EVENTO_ARTICULO_RENOMBRADO } from '../utils/eventos'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { ARCHIVO, COMPRA, ESTADOS, LISTA_COMPRAS } from '../utils/mensajes'
import estilos from './PantallaMaestra.module.css'

/**
 * Lista de compras (/compras) y Archivo (/compras/archivo, vista="archivadas").
 *
 * La lista muestra solo las compras activas; las de más de 3 meses pasan solas al Archivo
 * (shared/archivo.js) para que siempre cargue rápido. Como en el correo, cada compra tiene una
 * casilla a la izquierda y la del encabezado elige todas; la fila elegida cambia de color. Con
 * algo elegido aparecen los íconos Eliminar y Archivar (en el Archivo, Devolver a la lista),
 * junto a Filtrar. Solo «Agregar compra» lleva texto. El ⋮ lleva Ir al archivo, Exportar y
 * Cargar. Un clic en la fila abre el detalle (DetalleLista).
 *
 * Props: vista ('activas' | 'archivadas'), puedeAgregar, puedeExportar, puedeCargar, puedeEditar,
 * puedeEliminar, puedeArchivar, puedeEditarArticulo (según los permisos y funciones del usuario)
 */
export default function PantallaMaestra({
  vista = 'activas',
  puedeAgregar = true, puedeExportar = true, puedeCargar = true, puedeEditar = true, puedeEliminar = true,
  puedeArchivar = true, puedeEditarArticulo = true,
}) {
  const { addToast } = useToast()
  const regresar = useRegresar('/compras')
  const enArchivo = vista === 'archivadas'

  const [listas, setListas] = useState(null) // null = primera carga
  const [filters, setFilters] = useState(FILTROS_VACIOS)
  const [version, setVersion] = useState(0) // sube para recargar tras editar, archivar o eliminar
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [listaAbierta, setListaAbierta] = useState(null)
  const [elegidas, setElegidas] = useState(() => new Set())
  const [porConfirmar, setPorConfirmar] = useState(null) // 'archivar' | 'devolver' | 'eliminar'
  const todasRef = useRef(null)

  // Filtra en vivo: mientras llega la respuesta se sigue mostrando la tabla anterior
  useEffect(() => {
    let vigente = true
    fetchListas({ ...filters, archivo: vista })
      .then(data => {
        if (!vigente) return
        setListas(data)
        // Lo elegido que ya no está en la lista (filtrada, archivada o eliminada) se suelta
        const presentes = new Set(data.map(l => String(l.id)))
        setElegidas(prev => {
          const quedan = [...prev].filter(id => presentes.has(id))
          return quedan.length === prev.size ? prev : new Set(quedan)
        })
      })
      .catch(() => { if (vigente) addToast(COMPRA.errorCargar, 'error') })
    return () => { vigente = false } // descarta respuestas viejas si cambian los filtros
  }, [filters, version, vista, addToast])

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
  const conCasillas = puedeEliminar || puedeArchivar
  const total = listas?.length ?? 0
  const nElegidas = elegidas.size
  const todasElegidas = total > 0 && nElegidas === total

  // La casilla de «todas» queda a medias con una parte elegida (propiedad del DOM, no un atributo)
  useEffect(() => {
    if (todasRef.current) todasRef.current.indeterminate = nElegidas > 0 && !todasElegidas
  }, [nElegidas, todasElegidas])

  function alternar(id) {
    setElegidas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function alternarTodas() {
    setElegidas(todasElegidas ? new Set() : new Set((listas ?? []).map(l => String(l.id))))
  }

  async function aplicarLote() {
    const accion = porConfirmar
    // Los ids vuelven a su tipo original (número en modo local, texto con servidor)
    const ids = (listas ?? []).filter(l => elegidas.has(String(l.id))).map(l => l.id)
    try {
      if (accion === 'eliminar') {
        const { eliminadas } = await eliminarListas(ids)
        addToast(LISTA_COMPRAS.eliminadas(eliminadas))
      } else {
        const { cambiadas } = await archivarListas(ids, accion === 'archivar')
        addToast(accion === 'archivar' ? LISTA_COMPRAS.archivadas(cambiadas) : ARCHIVO.devueltas(cambiadas))
      }
      setElegidas(new Set())
      setVersion(v => v + 1)
    } catch (error) {
      const mensaje = accion === 'eliminar' ? LISTA_COMPRAS.errorEliminar
        : accion === 'archivar' ? LISTA_COMPRAS.errorArchivar : ARCHIVO.errorDevolver
      addToast(mensaje(error.message), 'error')
    }
  }

  const confirmacion = {
    archivar: { ...LISTA_COMPRAS.confirmarArchivar, danger: false },
    devolver: { ...ARCHIVO.confirmarDevolver, danger: false },
    eliminar: { ...LISTA_COMPRAS.confirmarEliminarVarias, danger: true },
  }[porConfirmar]

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
    if (listas.length === 0 && enArchivo) {
      return <EstadoVacio icono={<Archive />} titulo={ARCHIVO.vacio.titulo} texto={ARCHIVO.vacio.texto} />
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
        <caption className="solo-lector">{enArchivo ? ARCHIVO.titulo : LISTA_COMPRAS.titulo}. Abre una fila para ver sus artículos.</caption>
        <thead>
          <tr>
            {conCasillas && (
              <th scope="col" className={estilos.colCasilla}>
                <input
                  ref={todasRef}
                  type="checkbox"
                  className={estilos.casilla}
                  checked={todasElegidas}
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
          {ordenadas.map(lista => {
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
      <Header
        title={enArchivo ? 'Archivo de compras' : 'Lista de compras'}
        alRegresar={enArchivo ? regresar : undefined}
      />

      <main id="contenido" tabIndex={-1}>
        <Tarjeta
          titulo={enArchivo ? ARCHIVO.titulo : LISTA_COMPRAS.titulo}
          icono={enArchivo ? <Archive /> : <ShoppingCart />}
          detalle={detalle}
          accion={
            // Íconos (como el de Filtrar) a la izquierda; solo Agregar compra lleva texto
            <div className={estilos.acciones}>
              {nElegidas > 0 && puedeEliminar && (
                <Boton
                  variante="secundario"
                  className={`${estilos.botonIcono} ${estilos.botonEliminar}`}
                  icono={<Trash2 />}
                  onClick={() => setPorConfirmar('eliminar')}
                  aria-label={LISTA_COMPRAS.eliminarElegidas(nElegidas)}
                  title={LISTA_COMPRAS.eliminarElegidas(nElegidas)}
                />
              )}
              {nElegidas > 0 && puedeArchivar && (
                <Boton
                  variante="secundario"
                  className={estilos.botonIcono}
                  icono={enArchivo ? <ArchiveRestore /> : <Archive />}
                  onClick={() => setPorConfirmar(enArchivo ? 'devolver' : 'archivar')}
                  aria-label={enArchivo ? ARCHIVO.devolverElegidas(nElegidas) : LISTA_COMPRAS.archivarElegidas(nElegidas)}
                  title={enArchivo ? ARCHIVO.devolverElegidas(nElegidas) : LISTA_COMPRAS.archivarElegidas(nElegidas)}
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
              {!enArchivo && puedeAgregar && (
                <Boton id="go-agregar-compra-btn" variante="primario" icono={<Plus />} a="/">
                  {LISTA_COMPRAS.agregar}
                </Boton>
              )}
              {!enArchivo && (
                <MenuAcciones
                  etiqueta={LISTA_COMPRAS.masAcciones}
                  opciones={[
                    { etiqueta: LISTA_COMPRAS.irArchivo, icono: <Archive />, a: '/compras/archivo' },
                    { etiqueta: LISTA_COMPRAS.exportar, icono: <Download />, a: puedeExportar ? '/exportar' : undefined },
                    { etiqueta: LISTA_COMPRAS.cargar, icono: <Upload />, a: puedeCargar ? '/cargar' : undefined },
                  ]}
                />
              )}
            </div>
          }
        >
          <div className={estilos.panelFiltros}>
            <FiltrosEnLinea id="panel-filtros" abierto={filtrosAbiertos} filtros={filters} alCambiar={setFilters} />
          </div>
          {enArchivo && <p className={estilos.nota}>{ARCHIVO.nota}</p>}
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
        isOpen={porConfirmar !== null}
        onClose={() => setPorConfirmar(null)}
        onConfirm={aplicarLote}
        title={confirmacion?.titulo(nElegidas)}
        message={confirmacion?.mensaje}
        confirmLabel={confirmacion?.confirmar}
        danger={confirmacion?.danger}
      />
    </>
  )
}
