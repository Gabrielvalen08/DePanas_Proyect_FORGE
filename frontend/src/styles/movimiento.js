// Presets de movimiento (skill apple-design). Ningún componente escribe
// valores de spring a mano: todos importan de aquí.

// Spring por defecto: sin rebote (damping 1.0, response ~0.35 s)
export const springSuave = { type: 'spring', bounce: 0, duration: 0.35 }

// Solo cuando el gesto trae inercia (damping 0.8, response 0.3 s)
export const springConImpulso = { type: 'spring', bounce: 0.2, duration: 0.3 }

// Fundido simple (lo que queda con movimiento reducido)
export const fundido = { duration: 0.2, ease: 'easeOut' }

// Variantes reutilizables: entra y sale por el mismo camino
export const variantesModal = {
  oculto: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
}

export const variantesScrim = {
  oculto: { opacity: 0 },
  visible: { opacity: 1 },
}

export const variantesDesplegable = {
  oculto: { opacity: 0, scaleY: 0.96, y: -4 },
  visible: { opacity: 1, scaleY: 1, y: 0 },
}
