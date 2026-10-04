import estilos from './Insignia.module.css'

/** Insignia: píldora informativa. tono: neutro | marca | exito | aviso | error */
export default function Insignia({ tono = 'neutro', className, children, ...resto }) {
  return (
    <span className={[estilos.insignia, estilos[tono], className].filter(Boolean).join(' ')} {...resto}>
      {children}
    </span>
  )
}
