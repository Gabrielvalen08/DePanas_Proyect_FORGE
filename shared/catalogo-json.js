/**
 * shared/catalogo-json.js
 * Respaldo .json de una sección del Catálogo (Exportar / Cargar de cada módulo):
 *   { tipo: 'proveedor' | 'categoria' | 'material' | 'producto', version: 1, filas: [...] }
 * Filas según el tipo:
 *   proveedor  { nombre, ubicacion, telefonos: [], contactos: [{ nombre, telefono }] }
 *   material   { nombre, categoria, productos: [] }        (en la interfaz: artículo)
 *   categoria  { nombre, articulos: [] }
 *   producto   { nombre, articulos: [] }
 * Lo usan igual el backend (POST /api/catalogo/:tipo/importar) y el frontend (services/api.js).
 */

import { listaProductos, nombreProductoValido } from './productos.js'
import { normalizarFicha } from './proveedores.js'

export const TIPOS_CATALOGO = ['proveedor', 'categoria', 'material', 'producto']
export const VERSION_CATALOGO_JSON = 1

const NOMBRES = { proveedor: 'proveedores', categoria: 'categorías', material: 'artículos', producto: 'productos' }
const texto = v => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '')
const listaTextos = v => (Array.isArray(v) ? v.map(texto).filter(Boolean) : [])

export const MENSAJES_CATALOGO_JSON = {
  estructura: 'El archivo no es un respaldo del Catálogo de De Panas.',
  otroTipo: (esperado, recibido) =>
    `Este archivo trae ${NOMBRES[recibido] ?? 'otra cosa'}, no ${NOMBRES[esperado]}. Cárgalo en su sección.`,
  vacio: esperado => `El archivo no trae ${NOMBRES[esperado]}.`,
  fila: (n, detalle) => `Fila ${n}: ${detalle}`,
  sinNombre: 'falta el nombre',
  sinCategoria: 'falta la categoría',
  sinProductos: 'elige al menos un producto',
  productoConComa: 'el nombre del producto no puede llevar comas',
}

function fallo(mensaje) {
  return new Error(mensaje)
}

/** Fila del archivo → fila limpia del tipo; lanza con el número de fila si algo no sirve */
function normalizarFila(tipo, fila, n) {
  const nombre = texto(fila?.nombre)
  if (!nombre) throw fallo(MENSAJES_CATALOGO_JSON.fila(n, MENSAJES_CATALOGO_JSON.sinNombre))
  if (tipo === 'proveedor') {
    try {
      return { nombre, ...normalizarFicha(fila) }
    } catch (err) {
      throw fallo(MENSAJES_CATALOGO_JSON.fila(n, err.message.charAt(0).toLowerCase() + err.message.slice(1)))
    }
  }
  if (tipo === 'material') {
    const categoria = texto(fila.categoria)
    const productos = listaProductos(fila.productos ?? fila.producto)
    if (!categoria) throw fallo(MENSAJES_CATALOGO_JSON.fila(n, MENSAJES_CATALOGO_JSON.sinCategoria))
    if (!productos.length) throw fallo(MENSAJES_CATALOGO_JSON.fila(n, MENSAJES_CATALOGO_JSON.sinProductos))
    return { nombre, categoria, productos }
  }
  if (tipo === 'producto' && !nombreProductoValido(nombre)) {
    throw fallo(MENSAJES_CATALOGO_JSON.fila(n, MENSAJES_CATALOGO_JSON.productoConComa))
  }
  return { nombre, articulos: [...new Set(listaTextos(fila.articulos))] }
}

/**
 * Valida un respaldo de la sección `tipo` y devuelve sus filas limpias, sin nombres
 * repetidos (sin distinguir mayúsculas; se queda la primera). Lanza un Error legible.
 * Acepta el objeto completo del archivo o solo la lista de filas.
 */
export function validarCatalogoJSON(datos, tipo) {
  const filas = Array.isArray(datos) ? datos : datos?.filas
  if (!Array.isArray(filas) || (!Array.isArray(datos) && typeof datos?.tipo !== 'string')) {
    throw fallo(MENSAJES_CATALOGO_JSON.estructura)
  }
  if (!Array.isArray(datos) && datos.tipo !== tipo) throw fallo(MENSAJES_CATALOGO_JSON.otroTipo(tipo, datos.tipo))
  const vistos = new Set()
  const limpias = []
  filas.forEach((fila, i) => {
    const limpia = normalizarFila(tipo, fila, i + 1)
    const clave = limpia.nombre.toLowerCase()
    if (vistos.has(clave)) return
    vistos.add(clave)
    limpias.push(limpia)
  })
  if (!limpias.length) throw fallo(MENSAJES_CATALOGO_JSON.vacio(tipo))
  return limpias
}

const ordenar = filas => [...filas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))

/**
 * Filas de una sección a partir del catálogo completo ({ proveedores, categorias, productos,
 * materiales, fichas }), en el formato del respaldo y por nombre.
 */
export function filasDelCatalogo(tipo, catalogo) {
  const articulosDe = (campo, nombre) => catalogo.materiales
    .filter(m => (campo === 'producto'
      ? listaProductos(m.producto).some(p => p.toLowerCase() === nombre.toLowerCase())
      : (m.categoria || '').toLowerCase() === nombre.toLowerCase()))
    .map(m => m.nombre)
  if (tipo === 'proveedor') {
    return ordenar(catalogo.proveedores.map(nombre => {
      const f = catalogo.fichas?.[nombre.toLowerCase()]
      return { nombre, ubicacion: f?.ubicacion ?? '', telefonos: f?.telefonos ?? [], contactos: f?.contactos ?? [] }
    }))
  }
  if (tipo === 'material') {
    return ordenar(catalogo.materiales.map(m => ({ nombre: m.nombre, categoria: m.categoria || '', productos: listaProductos(m.producto) })))
  }
  const nombres = tipo === 'categoria' ? catalogo.categorias : catalogo.productos
  return ordenar(nombres.map(nombre => ({ nombre, articulos: articulosDe(tipo, nombre) })))
}

/** El objeto completo del respaldo */
export const respaldoCatalogo = (tipo, filas) => ({ tipo, version: VERSION_CATALOGO_JSON, filas })
