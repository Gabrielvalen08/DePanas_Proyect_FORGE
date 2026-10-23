import { forwardRef } from 'react'
import Campo from './Campo'

// Hasta 9.999.999,99: suficiente para una compra de la cocina
const MAX_DIGITOS = 9

/**
 * Convierte lo escrito en el campo al valor en dinero, como en un cajero: solo cuentan
 * los dígitos y los dos últimos son los centavos. '125' → '1.25', '5' → '0.05', '' → ''.
 */
export function montoDesdeDigitos(texto) {
  const digitos = String(texto).replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS)
  return digitos ? (Number(digitos) / 100).toFixed(2) : ''
}

/** Valor guardado ('1.2', '0.3333', '') → texto del campo con dos decimales ('1.20', '0.33', '') */
export function mostrarMonto(valor) {
  const numero = Number(valor)
  return valor === '' || valor == null || !(numero > 0) ? '' : (Math.round(numero * 100) / 100).toFixed(2)
}

/**
 * CampoMoneda
 * Campo de dinero tipo cajero: el punto decimal está fijo y los dígitos entran por la
 * derecha, empezando por los centavos (5 → 0.05, 50 → 0.50, 500 → 5.00). Borrar quita
 * el último dígito. El cursor siempre queda al final.
 * Mismas props que Campo; onChange recibe el valor ya convertido ('1.25' o '').
 */
const CampoMoneda = forwardRef(function CampoMoneda({ value, onChange, ...resto }, ref) {
  // Los dígitos entran siempre por la derecha: el cursor no se queda en medio
  function cursorAlFinal(e) {
    const campo = e.currentTarget
    requestAnimationFrame(() => campo.setSelectionRange?.(campo.value.length, campo.value.length))
  }

  return (
    <Campo
      ref={ref}
      tipo="text"
      inputMode="numeric"
      autoComplete="off"
      value={mostrarMonto(value)}
      onChange={e => onChange(montoDesdeDigitos(e.target.value))}
      onFocus={cursorAlFinal}
      onClick={cursorAlFinal}
      {...resto}
    />
  )
})

export default CampoMoneda
