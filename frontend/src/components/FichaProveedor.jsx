import { useId } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Boton, Campo } from './common'
import { PANTALLA_CATALOGO } from '../utils/mensajes'
import estilos from './FichaProveedor.module.css'

const T = PANTALLA_CATALOGO.ficha

/** Ficha nueva: un teléfono vacío para empezar a escribir */
export const fichaInicial = ficha => ({
  ubicacion: ficha?.ubicacion ?? '',
  telefonos: ficha?.telefonos?.length ? [...ficha.telefonos] : [''],
  contactos: (ficha?.contactos ?? []).map(c => ({ ...c })),
})

/**
 * FichaProveedor
 * Datos del proveedor dentro de su ventana del Catálogo: ubicación, uno o varios
 * teléfonos y contactos (cada uno con nombre y, si se quiere, su teléfono).
 * Las filas que se dejan vacías se ignoran al guardar (shared/proveedores.js).
 *
 * Props:
 *  - ficha: { ubicacion, telefonos: [], contactos: [{ nombre, telefono }] }
 *  - onCambiar(ficha)
 *  - errores: { ubicacion?, 'telefono-<i>'?, 'contacto-<i>'?, 'contacto-telefono-<i>'? }
 */
export default function FichaProveedor({ ficha, onCambiar, errores = {} }) {
  const id = useId().replace(/:/g, '')

  const cambiar = cambios => onCambiar({ ...ficha, ...cambios })
  const cambiarTelefono = (i, valor) => cambiar({ telefonos: ficha.telefonos.map((t, j) => (j === i ? valor : t)) })
  const cambiarContacto = (i, campo, valor) =>
    cambiar({ contactos: ficha.contactos.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)) })

  return (
    <div className={estilos.ficha}>
      <Campo
        id={`${id}-ubicacion`}
        etiqueta={T.ubicacion}
        value={ficha.ubicacion}
        autoComplete="off"
        onChange={e => cambiar({ ubicacion: e.target.value })}
        error={errores.ubicacion}
      />

      <fieldset className={estilos.grupo}>
        <legend className={estilos.leyenda}>{T.telefonos}</legend>
        <ul className={estilos.lista}>
          {ficha.telefonos.map((telefono, i) => (
            <li key={i} className={estilos.fila}>
              <Campo
                id={`${id}-telefono-${i}`}
                etiqueta={T.telefono(i + 1)}
                etiquetaOculta
                tipo="tel"
                inputMode="tel"
                autoComplete="off"
                value={telefono}
                onChange={e => cambiarTelefono(i, e.target.value)}
                error={errores[`telefono-${i}`]}
                className={estilos.campo}
              />
              <Boton
                variante="icono"
                icono={<Trash2 />}
                aria-label={T.quitarTelefono(i + 1)}
                onClick={() => cambiar({ telefonos: ficha.telefonos.filter((_, j) => j !== i) })}
                disabled={ficha.telefonos.length === 1 && !telefono}
              />
            </li>
          ))}
        </ul>
        <Boton variante="secundario" tamano="sm" icono={<Plus />} onClick={() => cambiar({ telefonos: [...ficha.telefonos, ''] })} className={estilos.agregar}>
          {T.agregarTelefono}
        </Boton>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend className={estilos.leyenda}>{T.contactos}</legend>
        {ficha.contactos.length === 0 && <p className={estilos.vacio}>{T.sinContactos}</p>}
        <ul className={estilos.lista}>
          {ficha.contactos.map((contacto, i) => (
            <li key={i} className={estilos.fila}>
              <Campo
                id={`${id}-contacto-${i}`}
                etiqueta={T.contactoNombre(i + 1)}
                etiquetaOculta
                placeholder={T.nombre}
                autoComplete="off"
                value={contacto.nombre}
                onChange={e => cambiarContacto(i, 'nombre', e.target.value)}
                error={errores[`contacto-${i}`]}
                className={estilos.campo}
              />
              <Campo
                id={`${id}-contacto-telefono-${i}`}
                etiqueta={T.contactoTelefono(i + 1)}
                etiquetaOculta
                placeholder={T.telefonoOpcional}
                tipo="tel"
                inputMode="tel"
                autoComplete="off"
                value={contacto.telefono}
                onChange={e => cambiarContacto(i, 'telefono', e.target.value)}
                error={errores[`contacto-telefono-${i}`]}
                className={estilos.campo}
              />
              <Boton
                variante="icono"
                icono={<Trash2 />}
                aria-label={T.quitarContacto(i + 1)}
                onClick={() => cambiar({ contactos: ficha.contactos.filter((_, j) => j !== i) })}
              />
            </li>
          ))}
        </ul>
        <Boton
          variante="secundario"
          tamano="sm"
          icono={<Plus />}
          onClick={() => cambiar({ contactos: [...ficha.contactos, { nombre: '', telefono: '' }] })}
          className={estilos.agregar}
        >
          {T.agregarContacto}
        </Boton>
      </fieldset>
    </div>
  )
}
