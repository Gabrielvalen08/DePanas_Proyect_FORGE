/**
 * shared/proveedores.js
 * Ficha de un proveedor: dónde está y cómo contactarlo. Se guarda aparte de su nombre
 * (columna `ficha` del catálogo en el backend; `fichas` en el catálogo local), así la
 * lista de proveedores sigue siendo una lista de nombres para los desplegables.
 *   { ubicacion: '', telefonos: ['7123-4567'], contactos: [{ nombre: 'Ana', telefono: '' }] }
 * Lo usan igual el backend (routes/catalogo.js) y el frontend (services/api.js).
 */

export const FICHA_VACIA = Object.freeze({ ubicacion: '', telefonos: [], contactos: [] })

const MAX_UBICACION = 120
const MAX_NOMBRE_CONTACTO = 60
// Números con espacios, guiones, paréntesis o + (El Salvador: 7123-4567; con código: +503 7123 4567)
const FORMATO_TELEFONO = /^\+?[0-9][0-9\s()-]{5,18}[0-9]$/

const texto = v => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '')

export const MENSAJES_FICHA = {
  ubicacionLarga: `La ubicación es muy larga (máximo ${MAX_UBICACION} caracteres)`,
  telefono: t => `El teléfono «${t}» no es válido: usa números, espacios, guiones o +`,
  contactoSinNombre: 'Cada contacto necesita un nombre',
  contactoLargo: `El nombre del contacto es muy largo (máximo ${MAX_NOMBRE_CONTACTO} caracteres)`,
}

export const telefonoValido = t => FORMATO_TELEFONO.test(texto(t))

/**
 * Limpia y valida una ficha. Las filas vacías (teléfono o contacto sin nada escrito) se
 * ignoran. Lanza un Error con el mensaje del primer problema y `campo` para marcarlo
 * ('ubicacion', 'telefono-<i>', 'contacto-<i>').
 */
export function normalizarFicha(datos) {
  const ubicacion = texto(datos?.ubicacion)
  if (ubicacion.length > MAX_UBICACION) throw conCampo(MENSAJES_FICHA.ubicacionLarga, 'ubicacion')

  const telefonos = []
  ;(Array.isArray(datos?.telefonos) ? datos.telefonos : []).forEach((t, i) => {
    const limpio = texto(t)
    if (!limpio) return
    if (!telefonoValido(limpio)) throw conCampo(MENSAJES_FICHA.telefono(limpio), `telefono-${i}`)
    telefonos.push(limpio)
  })

  const contactos = []
  ;(Array.isArray(datos?.contactos) ? datos.contactos : []).forEach((c, i) => {
    const nombre = texto(c?.nombre)
    const telefono = texto(c?.telefono)
    if (!nombre && !telefono) return
    if (!nombre) throw conCampo(MENSAJES_FICHA.contactoSinNombre, `contacto-${i}`)
    if (nombre.length > MAX_NOMBRE_CONTACTO) throw conCampo(MENSAJES_FICHA.contactoLargo, `contacto-${i}`)
    if (telefono && !telefonoValido(telefono)) throw conCampo(MENSAJES_FICHA.telefono(telefono), `contacto-telefono-${i}`)
    contactos.push({ nombre, telefono })
  })

  return { ubicacion, telefonos, contactos }
}

/** Ficha guardada como JSON (o vacía/ilegible) → objeto completo */
export function leerFicha(json) {
  if (!json) return { ...FICHA_VACIA, telefonos: [], contactos: [] }
  try {
    return normalizarFicha(typeof json === 'string' ? JSON.parse(json) : json)
  } catch {
    return { ...FICHA_VACIA, telefonos: [], contactos: [] }
  }
}

/** true si la ficha no tiene nada escrito */
export const fichaVacia = f => !f?.ubicacion && !f?.telefonos?.length && !f?.contactos?.length

function conCampo(mensaje, campo) {
  return Object.assign(new Error(mensaje), { campo })
}
