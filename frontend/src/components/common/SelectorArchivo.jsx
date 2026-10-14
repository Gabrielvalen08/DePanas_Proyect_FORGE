import { forwardRef, useState } from 'react'
import { FileJson, Upload } from 'lucide-react'
import estilos from './SelectorArchivo.module.css'

/**
 * SelectorArchivo
 * Reemplaza el botón nativo del navegador ("Seleccionar archivo / Sin archivos
 * seleccionados"), que no sigue la marca ni el idioma de la app. Toda la zona
 * abre el selector y también acepta soltar el archivo encima.
 * El input real queda oculto a la vista pero accesible: su nombre es `etiqueta`
 * y describe el archivo elegido y la ayuda.
 * onElegir(archivo): recibe el File (o undefined si se canceló).
 */
const SelectorArchivo = forwardRef(function SelectorArchivo(
  { id, etiqueta, ayuda, accept, nombre, textoVacio, textoSoltar, disabled = false, onElegir },
  ref
) {
  const [arrastrando, setArrastrando] = useState(false)
  const idEtiqueta = `${id}-etiqueta`
  const idNombre = `${id}-nombre`
  const idAyuda = ayuda ? `${id}-ayuda` : null

  function alSoltar(e) {
    e.preventDefault()
    setArrastrando(false)
    if (!disabled) onElegir?.(e.dataTransfer.files?.[0])
  }

  function alArrastrar(e) {
    e.preventDefault()
    if (!disabled) setArrastrando(true)
  }

  return (
    <div className={estilos.campo}>
      {/* Soltar un archivo es un atajo del mouse: con teclado o lector se usa el input de adentro */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label
        htmlFor={id}
        className={[estilos.zona, arrastrando && estilos.arrastrando, disabled && estilos.deshabilitada]
          .filter(Boolean).join(' ')}
        onDragOver={alArrastrar}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
      >
        <span className={estilos.icono} aria-hidden="true">
          <FileJson />
        </span>
        <span className={estilos.textos}>
          <span id={idNombre} className={nombre ? estilos.nombre : estilos.vacio}>{nombre || textoVacio}</span>
          {textoSoltar && <span className={estilos.soltar}>{textoSoltar}</span>}
        </span>
        <span id={idEtiqueta} className={estilos.boton}>
          <Upload aria-hidden="true" />
          <span className={estilos.botonTexto}>{etiqueta}</span>
        </span>
        <input
          ref={ref}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className={estilos.input}
          aria-labelledby={idEtiqueta}
          aria-describedby={[idNombre, idAyuda].filter(Boolean).join(' ')}
          onChange={e => onElegir?.(e.target.files?.[0])}
        />
      </label>
      {ayuda && <p id={idAyuda} className={estilos.ayuda}>{ayuda}</p>}
    </div>
  )
})

export default SelectorArchivo
