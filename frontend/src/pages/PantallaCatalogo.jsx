import { useEffect, useState } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { Loader2, Package, Pencil, Plus, Search, Tags, Trash2, Truck, UtensilsCrossed } from 'lucide-react'
import Header from '../components/Header'
import EditorCatalogo from '../components/EditorCatalogo'
import ConfirmModal from '../components/ConfirmModal'
import { Boton, Campo, EstadoVacio, Insignia, Tarjeta } from '../components/common'
import { agregarAlCatalogo, editarEnCatalogo, eliminarDelCatalogo, fetchCatalogo } from '../services/api'
import { useToast } from '../context/ToastContext'
import { textoBusqueda } from '../utils/formato'
import { PANTALLA_CATALOGO, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaCatalogo.module.css'

const TIPOS = ['proveedor', 'categoria', 'material', 'producto']
const ICONOS = { proveedor: Truck, categoria: Tags, material: Package, producto: UtensilsCrossed }
const TIPO_DE_RUTA = Object.fromEntries(TIPOS.map(t => [PANTALLA_CATALOGO.secciones[t].ruta, t]))

/** Opciones de un tipo como filas { nombre, categoria?, producto? } */
function filasDe(catalogo, tipo) {
  if (tipo === 'material') return catalogo.materiales
  const lista = { proveedor: catalogo.proveedores, categoria: catalogo.categorias, producto: catalogo.productos }[tipo]
  return lista.map(nombre => ({ nombre }))
}

const usoDe = (catalogo, tipo, nombre) => catalogo.uso?.[tipo]?.[nombre.toLowerCase()] ?? 0

/** Nombres de los materiales que llevan esa categoría o ese producto */
const materialesDe = (catalogo, tipo, nombre) =>
  catalogo.materiales.filter(m => m[tipo]?.toLowerCase() === nombre.toLowerCase()).map(m => m.nombre)

/**
 * Catálogo (/catalogo y /catalogo/:seccion).
 * Cuatro opciones (proveedores, categorías, materiales, productos); cada una
 * abre su lista para agregar, cambiar el nombre o eliminar. Las categorías y los
 * productos también eligen sus materiales. Los cambios se aplican también a las
 * compras guardadas.
 */
export default function PantallaCatalogo() {
  const { seccion } = useParams()
  const tipo = TIPO_DE_RUTA[seccion] ?? null
  const { addToast } = useToast()
  const [catalogo, setCatalogo] = useState(null)
  const [version, setVersion] = useState(0) // sube para recargar tras un cambio

  useEffect(() => {
    let vigente = true
    fetchCatalogo()
      .then(datos => { if (vigente) setCatalogo(datos) })
      .catch(() => { if (vigente) addToast(PANTALLA_CATALOGO.errorCargar, 'error') })
    return () => { vigente = false }
  }, [version, addToast])

  if (seccion && !tipo) return <Navigate to="/catalogo" replace />

  return (
    <>
      <Header title="Catálogo" frase={fraseDelDia('/catalogo')} />

      <main id="contenido" tabIndex={-1}>
        <p className={estilos.intro}>{PANTALLA_CATALOGO.intro}</p>

        <nav aria-label="Secciones del catálogo">
          <ul className={estilos.secciones}>
            {TIPOS.map(t => {
              const Icono = ICONOS[t]
              const { titulo, descripcion, ruta } = PANTALLA_CATALOGO.secciones[t]
              return (
                <li key={t}>
                  <NavLink
                    to={`/catalogo/${ruta}`}
                    className={({ isActive }) => [estilos.seccion, isActive && estilos.seccionActiva].filter(Boolean).join(' ')}
                  >
                    <span className={estilos.seccionIcono} aria-hidden="true"><Icono size={22} /></span>
                    <span className={estilos.seccionTextos}>
                      <span className={estilos.seccionTitulo}>{titulo}</span>
                      <span className={estilos.seccionDescripcion}>{descripcion}</span>
                    </span>
                    {catalogo && (
                      <Insignia tono="neutro" className={estilos.seccionCuenta}>{filasDe(catalogo, t).length}</Insignia>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {!tipo ? (
          <Tarjeta>
            <EstadoVacio icono={<Tags />} titulo={PANTALLA_CATALOGO.elegir.titulo} texto={PANTALLA_CATALOGO.elegir.texto} />
          </Tarjeta>
        ) : catalogo === null ? (
          <Tarjeta>
            <EstadoVacio cargando icono={<Loader2 />} titulo={PANTALLA_CATALOGO.cargando} />
          </Tarjeta>
        ) : (
          // key: al cambiar de sección se reinicia la búsqueda
          <ListaCatalogo key={tipo} tipo={tipo} catalogo={catalogo} alCambio={() => setVersion(v => v + 1)} />
        )}
      </main>
    </>
  )
}

function ListaCatalogo({ tipo, catalogo, alCambio }) {
  const { addToast } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [edicion, setEdicion] = useState(null) // null | { registro: null } | { registro, uso }
  const [porEliminar, setPorEliminar] = useState(null)
  const { titulo, singular } = PANTALLA_CATALOGO.secciones[tipo]
  const Icono = ICONOS[tipo]
  const esMaterial = tipo === 'material'
  const conMateriales = tipo === 'categoria' || tipo === 'producto'

  const todas = filasDe(catalogo, tipo)
  const filas = todas.filter(f => textoBusqueda(f.nombre).includes(textoBusqueda(busqueda.trim())))

  async function guardar(datos) {
    try {
      const resultado = edicion.registro
        ? await editarEnCatalogo(tipo, edicion.registro.nombre, datos)
        : await agregarAlCatalogo(tipo, datos)
      addToast(edicion.registro ? PANTALLA_CATALOGO.editado(tipo, resultado) : PANTALLA_CATALOGO.agregado(tipo, resultado))
      setEdicion(null)
      alCambio()
    } catch (error) {
      addToast(PANTALLA_CATALOGO.error(error.message), 'error')
      throw error
    }
  }

  async function eliminar(registro) {
    try {
      addToast(PANTALLA_CATALOGO.eliminado(tipo, await eliminarDelCatalogo(tipo, registro.nombre)))
      alCambio()
    } catch (error) {
      addToast(PANTALLA_CATALOGO.errorEliminar(error.message), 'error')
    }
  }

  return (
    <>
      <Tarjeta
        titulo={titulo}
        icono={<Icono />}
        accion={
          <Boton variante="primario" icono={<Plus />} onClick={() => setEdicion({ registro: null })}>
            {PANTALLA_CATALOGO.agregar(tipo)}
          </Boton>
        }
      >
        <div className={estilos.buscador}>
          <Campo
            id={`buscar-${tipo}`}
            etiqueta={PANTALLA_CATALOGO.buscar(tipo)}
            etiquetaOculta
            prefijo={<Search size={16} />}
            placeholder={`${PANTALLA_CATALOGO.buscar(tipo)}…`}
            value={busqueda}
            autoComplete="off"
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {todas.length === 0 ? (
          <EstadoVacio icono={<Icono />} titulo={PANTALLA_CATALOGO.vacio(tipo)} />
        ) : filas.length === 0 ? (
          <EstadoVacio icono={<Search />} titulo={PANTALLA_CATALOGO.sinResultados} />
        ) : (
          <table className={estilos.tabla}>
            <caption className="solo-lector">{titulo}</caption>
            <thead>
              <tr>
                <th scope="col">{PANTALLA_CATALOGO.nombre}</th>
                {esMaterial && <th scope="col">Categoría</th>}
                {esMaterial && <th scope="col">Producto</th>}
                {conMateriales && <th scope="col">{PANTALLA_CATALOGO.columnaMateriales}</th>}
                <th scope="col" className={estilos.numerico}>{PANTALLA_CATALOGO.columnaUso(tipo)}</th>
                <th scope="col" className={estilos.colAcciones}><span className="solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => {
                const uso = usoDe(catalogo, tipo, f.nombre)
                return (
                  <tr key={f.nombre}>
                    <th scope="row" className={estilos.nombre}>{f.nombre}</th>
                    {esMaterial && (
                      <td data-etiqueta="Categoría">
                        {f.categoria || <Insignia tono="aviso">{PANTALLA_CATALOGO.sinAsignar}</Insignia>}
                      </td>
                    )}
                    {esMaterial && (
                      <td data-etiqueta="Producto">
                        {f.producto || <Insignia tono="aviso">{PANTALLA_CATALOGO.sinAsignar}</Insignia>}
                      </td>
                    )}
                    {conMateriales && (
                      <td data-etiqueta={PANTALLA_CATALOGO.columnaMateriales} className={estilos.listaMateriales}>
                        {uso > 0
                          ? PANTALLA_CATALOGO.listaMateriales(materialesDe(catalogo, tipo, f.nombre))
                          : <Insignia tono="aviso">{PANTALLA_CATALOGO.uso(tipo, 0)}</Insignia>}
                      </td>
                    )}
                    <td className={estilos.numerico} data-etiqueta={PANTALLA_CATALOGO.columnaUso(tipo)}>
                      {PANTALLA_CATALOGO.uso(tipo, uso)}
                    </td>
                    <td className={estilos.colAcciones}>
                      <div className={estilos.acciones}>
                        <Boton
                          variante="icono"
                          icono={<Pencil />}
                          aria-label={PANTALLA_CATALOGO.editar(tipo, f.nombre)}
                          onClick={() => setEdicion({ registro: f, uso: esMaterial || tipo === 'proveedor' ? uso : 0 })}
                        />
                        <Boton
                          variante="icono"
                          icono={<Trash2 />}
                          aria-label={PANTALLA_CATALOGO.eliminar(tipo, f.nombre)}
                          onClick={() => setPorEliminar({ ...f, uso })}
                          className={estilos.eliminar}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Tarjeta>

      <EditorCatalogo
        tipo={tipo}
        edicion={edicion}
        materiales={catalogo.materiales}
        alGuardar={guardar}
        alCerrar={() => setEdicion(null)}
      />

      <ConfirmModal
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => eliminar(porEliminar)}
        title={PANTALLA_CATALOGO.confirmarEliminar.titulo(tipo)}
        message={porEliminar ? PANTALLA_CATALOGO.confirmarEliminar.mensaje(tipo, porEliminar.nombre, porEliminar.uso) : ''}
        confirmLabel={PANTALLA_CATALOGO.confirmarEliminar.confirmar}
        danger
      />
      <span className="solo-lector" aria-live="polite">{`${filas.length} ${filas.length === 1 ? singular : titulo.toLowerCase()}`}</span>
    </>
  )
}
