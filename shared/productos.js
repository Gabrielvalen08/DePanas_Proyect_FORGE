/**
 * shared/productos.js
 * Un artículo (material) puede ir en varios productos. Se guardan en un solo texto,
 * separados por coma: «Arepas, Empanadas». Así un artículo con un solo producto sigue
 * siendo un texto normal, las compras viejas valen tal cual y el CSV/JSON no cambian
 * de forma. Por eso el nombre de un producto no puede llevar comas.
 * Lo usan igual el backend (routes/catalogo.js, db.js) y el frontend (services/api.js).
 */

export const SEPARADOR_PRODUCTOS = ', '

const clave = texto => String(texto ?? '').trim().toLowerCase()

/** Texto o lista → lista de productos sin vacíos ni repetidos (sin distinguir mayúsculas) */
export function listaProductos(valor) {
  const entrada = Array.isArray(valor) ? valor : String(valor ?? '').split(',')
  const vistos = new Set()
  const lista = []
  for (const producto of entrada) {
    const limpio = String(producto ?? '').trim()
    if (limpio && !vistos.has(clave(limpio))) {
      vistos.add(clave(limpio))
      lista.push(limpio)
    }
  }
  return lista
}

/** Lista o texto → el texto que se guarda («Arepas, Empanadas») */
export const textoProductos = valor => listaProductos(valor).join(SEPARADOR_PRODUCTOS)

/** ¿El texto (o la lista) incluye ese producto? */
export const tieneProducto = (valor, nombre) => listaProductos(valor).some(p => clave(p) === clave(nombre))

/** El texto sin ese producto */
export const sinProducto = (valor, nombre) => textoProductos(listaProductos(valor).filter(p => clave(p) !== clave(nombre)))

/** El texto con ese producto al final (si no estaba) */
export const conProducto = (valor, nombre) => textoProductos([...listaProductos(valor), nombre])

/** El texto con un producto renombrado */
export const renombrarProducto = (valor, anterior, nuevo) =>
  textoProductos(listaProductos(valor).map(p => (clave(p) === clave(anterior) ? nuevo : p)))

/** El nombre de un producto no puede llevar comas: es el separador */
export const PRODUCTO_CON_COMA = 'El nombre del producto no puede llevar comas'
export const nombreProductoValido = nombre => !String(nombre ?? '').includes(',')
