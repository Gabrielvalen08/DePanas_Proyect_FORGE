import '@testing-library/jest-dom/vitest'
import { MotionGlobalConfig } from 'motion/react'

// Las animaciones terminan al instante: los tests no esperan exits de Motion
MotionGlobalConfig.skipAnimations = true

// Motion consulta matchMedia (movimiento reducido) y jsdom no lo implementa
window.matchMedia = window.matchMedia || ((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}))

// jsdom no implementa URL.createObjectURL/revokeObjectURL. Las descargas revocan su URL con un
// setTimeout que puede dispararse después de que una prueba restauró el URL original
URL.createObjectURL ??= () => 'blob:prueba'
URL.revokeObjectURL ??= () => {}

// api.js persiste en localStorage: cada test arranca con los datos mock
beforeEach(() => localStorage.clear())
