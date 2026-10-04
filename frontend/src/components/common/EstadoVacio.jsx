import estilos from './EstadoVacio.module.css'

/**
 * EstadoVacio
 * También sirve como estado de carga: cargando=true añade role="status".
 */
export default function EstadoVacio({ icono, titulo, texto, accion, cargando = false }) {
  return (
    <div className={estilos.estado} role={cargando ? 'status' : undefined}>
      {icono && (
        <span className={[estilos.icono, cargando && estilos.girando].filter(Boolean).join(' ')} aria-hidden="true">
          {icono}
        </span>
      )}
      <p className={estilos.titulo}>{titulo}</p>
      {texto && <p className={estilos.texto}>{texto}</p>}
      {accion && <div className={estilos.accion}>{accion}</div>}
    </div>
  )
}
