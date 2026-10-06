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
import { CONFIGURACION, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaConfiguracion.module.css'

const TIPOS = ['proveedor', 'categoria', 'material', 'producto']
const ICONOS = { proveedor: Truck, categoria: Tags, material: Package, producto: UtensilsCrossed }
const TIPO_DE_RUTA = Object.fromEntries(TIPOS.map(t => [CONFIGURACION.secciones[t].ruta, t]))

/** Opciones de un tipo como filas { nombre, categoria?, producto? } */
function filasDe(catalogo, tipo) {
  if (tipo === 'material') return catalogo.materiales
  const lista = { proveedor: catalogo.proveedores, categoria: catalogo.categorias, producto: catalogo.productos }[tipo]
  return lista.map(nombre => ({ nombre }))
}

const usoDe = (catalogo, tipo, nombre) => catalogo.uso?.[tipo]?.[nombre.toLowerCase()] ?? 0

/**
 * Configuración (/configuracion y /configuracion/:seccion).
 * Cuatro opciones (proveedores, categorías, materiales, productos); cada una
 * abre su lista para agregar, cambiar el nombre o eliminar. Los cambios de
 * nombre se aplican también a las compras guardadas.
 */
export default function PantallaConfiguracion() {
  const { seccion } = useParams()
  const tipo = TIPO_DE_RUTA[seccion] ?? null
  const { addToast } = useToast()
  const [catalogo, setCatalogo] = useState(null)
  const [version, setVersion] = useState(0) // sube para recargar tras un cambio

  useEffect(() => {
    let vigente = true
    fetchCatalogo()
      .then(datos => { if (vigente) setCatalogo(datos) })
      .catch(() => { if (vigente) addToast(CONFIGURACION.errorCargar, 'error') })
    return () => { vigente = false }
  }, [version, addToast])

  if (seccion && !tipo) return <Navigate to="/configuracion" replace />

  return (
    <>
      <Header title="Configuración" frase={fraseDelDia('/configuracion')} />

      <main id="contenido" tabIndex={-1}>
        <p className={estilos.intro}>{CONFIGURACION.intro}</p>

        <nav aria-label="Secciones de configuración">
          <ul className={estilos.secciones}>
            {TIPOS.map(t => {
              const Icono = ICONOS[t]
              const { titulo, descripcion, ruta } = CONFIGURACION.secciones[t]
              return (
                <li key={t}>
                  <NavLink
                    to={`/configuracion/${ruta}`}
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
            <EstadoVacio icono={<Tags />} titulo={CONFIGURACION.elegir.titulo} texto={CONFIGURACION.elegir.texto} />
          </Tarjeta>
        ) : catalogo === null ? (
          <Tarjeta>
            <EstadoVacio cargando icono={<Loader2 />} titulo={CONFIGURACION.cargando} />
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
  const { titulo, singular } = CONFIGURACION.secciones[tipo]
  const Icono = ICONOS[tipo]
  const esMaterial = tipo === 'material'

  const todas = filasDe(catalogo, tipo)
  const filas = todas.filter(f => textoBusqueda(f.nombre).includes(textoBusqueda(busqueda.trim())))

  async function guardar(datos) {
    try {
      const resultado = edicion.registro
        ? await editarEnCatalogo(tipo, edicion.registro.nombre, datos)
        : await agregarAlCatalogo(tipo, datos)
      addToast(edicion.registro ? CONFIGURACION.editado(tipo, resultado) : CONFIGURACION.agregado(tipo, resultado))
      setEdicion(null)
      alCambio()
    } catch (error) {
      addToast(CONFIGURACION.error(error.message), 'error')
      throw error
    }
  }

  async function eliminar(registro) {
    try {
      addToast(CONFIGURACION.eliminado(tipo, await eliminarDelCatalogo(tipo, registro.nombre)))
      alCambio()
    } catch (error) {
      addToast(CONFIGURACION.errorEliminar(error.message), 'error')
    }
  }

  return (
    <>
      <Tarjeta
        titulo={titulo}
        icono={<Icono />}
        accion={
          <Boton variante="primario" icono={<Plus />} onClick={() => setEdicion({ registro: null })}>
            {CONFIGURACION.agregar(tipo)}
          </Boton>
        }
      >
        <div className={estilos.buscador}>
          <Campo
            id={`buscar-${tipo}`}
            etiqueta={CONFIGURACION.buscar(tipo)}
            etiquetaOculta
            prefijo={<Search size={16} />}
            placeholder={`${CONFIGURACION.buscar(tipo)}…`}
            value={busqueda}
            autoComplete="off"
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {todas.length === 0 ? (
          <EstadoVacio icono={<Icono />} titulo={CONFIGURACION.vacio(tipo)} />
        ) : filas.length === 0 ? (
          <EstadoVacio icono={<Search />} titulo={CONFIGURACION.sinResultados} />
        ) : (
          <table className={estilos.tabla}>
            <caption className="solo-lector">{titulo}</caption>
            <thead>
              <tr>
                <th scope="col">{CONFIGURACION.nombre}</th>
                {esMaterial && <th scope="col">Categoría</th>}
                {esMaterial && <th scope="col">Producto</th>}
                <th scope="col" className={estilos.numerico}>{CONFIGURACION.columnaUso(tipo)}</th>
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
                        {f.categoria || <Insignia tono="aviso">{CONFIGURACION.sinAsignar}</Insignia>}
                      </td>
                    )}
                    {esMaterial && (
                      <td data-etiqueta="Producto">
                        {f.producto || <Insignia tono="aviso">{CONFIGURACION.sinAsignar}</Insignia>}
                      </td>
                    )}
                    <td className={estilos.numerico} data-etiqueta={CONFIGURACION.columnaUso(tipo)}>
                      {CONFIGURACION.uso(tipo, uso)}
                    </td>
                    <td className={estilos.colAcciones}>
                      <div className={estilos.acciones}>
                        <Boton
                          variante="icono"
                          icono={<Pencil />}
                          aria-label={CONFIGURACION.editar(tipo, f.nombre)}
                          onClick={() => setEdicion({ registro: f, uso: esMaterial || tipo === 'proveedor' ? uso : 0 })}
                        />
                        <Boton
                          variante="icono"
                          icono={<Trash2 />}
                          aria-label={CONFIGURACION.eliminar(tipo, f.nombre)}
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

      <EditorCatalogo tipo={tipo} edicion={edicion} alGuardar={guardar} alCerrar={() => setEdicion(null)} />

      <ConfirmModal
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => eliminar(porEliminar)}
        title={CONFIGURACION.confirmarEliminar.titulo(tipo)}
        message={porEliminar ? CONFIGURACION.confirmarEliminar.mensaje(tipo, porEliminar.nombre, porEliminar.uso) : ''}
        confirmLabel={CONFIGURACION.confirmarEliminar.confirmar}
        danger
      />
      <span className="solo-lector" aria-live="polite">{`${filas.length} ${filas.length === 1 ? singular : titulo.toLowerCase()}`}</span>
    </>
  )
}
