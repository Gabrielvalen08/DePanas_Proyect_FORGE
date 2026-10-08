import { useEffect, useState } from 'react'
import { Loader2, Pencil, Trash2, UserPlus, UsersRound } from 'lucide-react'
import Header from '../components/Header'
import EditorUsuario from '../components/EditorUsuario'
import ConfirmModal from '../components/ConfirmModal'
import { tituloDeRuta } from '../components/navegacion'
import { Boton, EstadoVacio, Insignia, Tarjeta } from '../components/common'
import { crearUsuario, editarUsuario, eliminarUsuario, fetchUsuarios } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { RUTAS_ASIGNABLES } from '../utils/permisos'
import { USUARIOS, fraseDelDia } from '../utils/mensajes'
import estilos from './PantallaUsuarios.module.css'

/**
 * Gestor de usuarios (/usuarios). Solo entra el administrador (App.jsx).
 * Lista los usuarios con su rol y sus pantallas; permite crear uno nuevo,
 * cambiar nombre, contraseña y pantallas, y eliminar a los que no son administrador.
 */
export default function PantallaUsuarios() {
  const { usuario: actual } = useAuth()
  const { addToast } = useToast()
  const [usuarios, setUsuarios] = useState(null)
  const [version, setVersion] = useState(0) // sube para recargar tras un cambio
  const [edicion, setEdicion] = useState(null) // null | { registro: null } | { registro }
  const [porEliminar, setPorEliminar] = useState(null)

  useEffect(() => {
    let vigente = true
    fetchUsuarios()
      .then(datos => { if (vigente) setUsuarios(datos) })
      .catch(() => { if (vigente) addToast(USUARIOS.errorCargar, 'error') })
    return () => { vigente = false }
  }, [version, addToast])

  async function guardar(datos) {
    try {
      const resultado = edicion.registro
        ? await editarUsuario(edicion.registro.usuario, datos)
        : await crearUsuario(datos)
      addToast(edicion.registro ? USUARIOS.editado(resultado) : USUARIOS.creado(resultado))
      setEdicion(null)
      setVersion(v => v + 1)
    } catch (error) {
      // Los errores de un campo se marcan en la ventana; el resto, con un aviso
      if (!error.campo) addToast(USUARIOS.error(error.message), 'error')
      throw error
    }
  }

  async function eliminar(registro) {
    try {
      const { usuario } = await eliminarUsuario(registro.usuario)
      addToast(USUARIOS.eliminado(usuario))
      setVersion(v => v + 1)
    } catch (error) {
      addToast(USUARIOS.errorEliminar(error.message), 'error')
    }
  }

  return (
    <>
      <Header title="Gestor de usuarios" frase={fraseDelDia('/usuarios')} />

      <main id="contenido" tabIndex={-1}>
        <p className={estilos.intro}>{USUARIOS.intro}</p>

        <Tarjeta
          titulo={USUARIOS.titulo}
          icono={<UsersRound />}
          accion={
            <Boton variante="primario" icono={<UserPlus />} onClick={() => setEdicion({ registro: null })}>
              {USUARIOS.agregar}
            </Boton>
          }
        >
          {usuarios === null ? (
            <EstadoVacio cargando icono={<Loader2 />} titulo={USUARIOS.cargando} />
          ) : (
            <table className={estilos.tabla}>
              <caption className="solo-lector">{USUARIOS.titulo}</caption>
              <thead>
                <tr>
                  <th scope="col">{USUARIOS.columnas.usuario}</th>
                  <th scope="col">{USUARIOS.columnas.nombre}</th>
                  <th scope="col">{USUARIOS.columnas.rol}</th>
                  <th scope="col">{USUARIOS.columnas.pantallas}</th>
                  <th scope="col" className={estilos.colAcciones}><span className="solo-lector">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const admin = u.rol === 'admin'
                  return (
                    <tr key={u.usuario}>
                      <th scope="row" className={estilos.usuario}>
                        <span>{u.usuario}</span>
                        {u.usuario === actual && <Insignia tono="neutro">{USUARIOS.tu}</Insignia>}
                      </th>
                      <td data-etiqueta={USUARIOS.columnas.nombre}>{u.nombre}</td>
                      <td data-etiqueta={USUARIOS.columnas.rol}>
                        <Insignia tono={admin ? 'marca' : 'neutro'}>{USUARIOS.roles[u.rol]}</Insignia>
                      </td>
                      <td data-etiqueta={USUARIOS.columnas.pantallas}>
                        <Pantallas usuario={u} />
                      </td>
                      <td className={estilos.colAcciones}>
                        <div className={estilos.acciones}>
                          <Boton
                            variante="icono"
                            icono={<Pencil />}
                            aria-label={USUARIOS.editar(u.usuario)}
                            onClick={() => setEdicion({ registro: u })}
                          />
                          {!admin && (
                            <Boton
                              variante="icono"
                              icono={<Trash2 />}
                              aria-label={USUARIOS.eliminar(u.usuario)}
                              onClick={() => setPorEliminar(u)}
                              className={estilos.eliminar}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Tarjeta>
      </main>

      <EditorUsuario
        edicion={edicion}
        usuarios={usuarios ?? []}
        alGuardar={guardar}
        alCerrar={() => setEdicion(null)}
      />

      <ConfirmModal
        isOpen={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => eliminar(porEliminar)}
        title={USUARIOS.confirmarEliminar.titulo}
        message={porEliminar ? USUARIOS.confirmarEliminar.mensaje(porEliminar.usuario, porEliminar.nombre) : ''}
        confirmLabel={USUARIOS.confirmarEliminar.confirmar}
        danger
      />
    </>
  )
}

/** "Todas" para el administrador; si no, cuántas de cuántas y cuáles */
function Pantallas({ usuario }) {
  if (usuario.rol === 'admin') return <span className={estilos.todas}>{USUARIOS.todas}</span>
  return (
    <span className={estilos.pantallas}>
      <span className={estilos.cuenta}>{USUARIOS.cuentaPantallas(usuario.permisos.length, RUTAS_ASIGNABLES.length)}</span>
      <span className={estilos.lista}>{usuario.permisos.map(tituloDeRuta).join(' · ')}</span>
    </span>
  )
}
