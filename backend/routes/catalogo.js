/**
 * routes/catalogo.js
 * Opciones de los desplegables (proveedor, categoría, material, producto) y la
 * categoría/producto de cada material. El catálogo es la única fuente de las
 * opciones: cada compra guardada registra lo suyo (db.js, registrarCompra).
 *
 *   GET    /api/catalogo                    → { proveedores, categorias, productos, fichas (de cada proveedor),
 *                                               materiales: [{ nombre, categoria, producto }], uso,
 *                                               precios: { material: { precio, unidad } } }
 *   PUT    /api/catalogo/materiales/:nombre → asigna { categoria, producto } a un material
 *                                             (lo crea si no existe; usado al registrar compras)
 *   POST   /api/catalogo/:tipo              → agrega { nombre } (material: + categoria y producto;
 *                                             categoría o producto: + materiales opcional)
 *   PUT    /api/catalogo/:tipo/:nombre      → cambia el nombre (y, en un material, su categoría y
 *                                             producto; en una categoría o un producto, sus
 *                                             materiales) y lo actualiza en todas las compras
 *   DELETE /api/catalogo/:tipo/:nombre      → quita la opción; las compras conservan su texto
 *   POST   /api/catalogo/:tipo/importar     → carga { filas } de un respaldo de la sección (shared/catalogo-json.js):
 *                                             crea lo que falta y actualiza lo que existe, sin borrar nada.
 *                                             Todo o nada. → { nuevos, actualizados, omitidos }
 *
 * :tipo es proveedor | categoria | material | producto
 *
 * Cada material tiene una sola categoría y uno o varios productos (en `producto`, como
 * texto «Arepas, Empanadas»; ver shared/productos.js). `materiales` en una
 * categoría o un producto es la lista completa de los que la llevan: los que se
 * agregan la toman (y dejan la que tenían) y los que se quitan quedan sin asignar.
 */

import { Router } from 'express'
import { enTransaccion, registrarEnCatalogo } from '../db.js'
import {
  PRODUCTO_CON_COMA, conProducto, listaProductos, nombreProductoValido, renombrarProducto, sinProducto, textoProductos, tieneProducto,
} from '../../shared/productos.js'
import { fichaVacia, leerFicha, normalizarFicha } from '../../shared/proveedores.js'
import { validarCatalogoJSON } from '../../shared/catalogo-json.js'

export const TIPOS = ['proveedor', 'categoria', 'material', 'producto']
const NOMBRE_TIPO = { proveedor: 'proveedor', categoria: 'categoría', material: 'artículo', producto: 'producto' }
const ARTICULO = { proveedor: 'un', categoria: 'una', material: 'un', producto: 'un' }

const ordenar = lista => lista.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
const texto = v => (typeof v === 'string' ? v.trim() : '')

/** Cuántas compras usan cada proveedor o material, y cuántos materiales cada categoría o producto */
function leerUso(db) {
  const contar = filas => Object.fromEntries(filas.map(f => [f.k.toLowerCase(), f.n]))
  const enCompras = campo => contar(db.prepare(
    `SELECT ${campo} AS k, COUNT(DISTINCT compra_id) AS n FROM ingresos WHERE ${campo} != '' GROUP BY ${campo} COLLATE NOCASE`
  ).all())
  const enMateriales = campo => contar(db.prepare(
    `SELECT ${campo} AS k, COUNT(*) AS n FROM catalogo WHERE tipo = 'material' AND ${campo} != '' GROUP BY ${campo} COLLATE NOCASE`
  ).all())
  // Un material con varios productos cuenta en cada uno
  const porProducto = {}
  for (const { producto } of db.prepare("SELECT producto FROM catalogo WHERE tipo = 'material'").all()) {
    for (const p of listaProductos(producto)) porProducto[p.toLowerCase()] = (porProducto[p.toLowerCase()] ?? 0) + 1
  }
  return {
    proveedor: enCompras('proveedor'),
    material: enCompras('material'),
    categoria: enMateriales('categoria'),
    producto: porProducto,
  }
}

/**
 * Precio unitario sugerido de cada material: el de su última compra (la de fecha
 * más reciente y, a igual fecha, la registrada después), con la unidad en que se
 * compró. Claves en minúsculas. Cambia solo al guardar otra compra más reciente.
 */
function leerPrecios(db) {
  const precios = {}
  const filas = db.prepare(
    'SELECT material, cantidad, monto, unidad FROM ingresos WHERE cantidad > 0 AND monto > 0 ORDER BY fecha ASC, id ASC'
  ).all()
  for (const f of filas) {
    precios[f.material.trim().toLowerCase()] = { precio: Math.round((f.monto / f.cantidad) * 10000) / 10000, unidad: f.unidad }
  }
  return precios
}

/** Ficha de cada proveedor que la tenga (ubicación, teléfonos, contactos). Claves en minúsculas */
function leerFichas(db) {
  const fichas = {}
  for (const { nombre, ficha } of db.prepare("SELECT nombre, ficha FROM catalogo WHERE tipo = 'proveedor' AND ficha != ''").all()) {
    const leida = leerFicha(ficha)
    if (!fichaVacia(leida)) fichas[nombre.toLowerCase()] = leida
  }
  return fichas
}

/** La ficha del cuerpo, limpia y validada; undefined si no viene (no se toca) */
function fichaDelCuerpo(cuerpo) {
  if (cuerpo?.ficha === undefined) return undefined
  try {
    return normalizarFicha(cuerpo.ficha)
  } catch (err) {
    throw Object.assign(fallo(400, err.message), { campo: err.campo })
  }
}

function guardarFicha(db, nombre, ficha) {
  db.prepare("UPDATE catalogo SET ficha = ? WHERE tipo = 'proveedor' AND nombre = ?")
    .run(fichaVacia(ficha) ? '' : JSON.stringify(ficha), nombre)
}

export function leerCatalogo(db) {
  const nombres = tipo => ordenar(db.prepare('SELECT nombre FROM catalogo WHERE tipo = ?').all(tipo).map(f => f.nombre))
  return {
    proveedores: nombres('proveedor'),
    categorias: nombres('categoria'),
    productos: nombres('producto'),
    materiales: db.prepare("SELECT nombre, categoria, producto FROM catalogo WHERE tipo = 'material'").all()
      .map(m => ({ ...m, productos: listaProductos(m.producto) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    uso: leerUso(db),
    precios: leerPrecios(db),
    fichas: leerFichas(db),
  }
}

function buscar(db, tipo, nombre) {
  return db.prepare('SELECT nombre, categoria, producto FROM catalogo WHERE tipo = ? AND nombre = ? COLLATE NOCASE').get(tipo, nombre)
}

/** Error con código HTTP, para responder 400/404/409 desde dentro de una transacción */
function fallo(status, mensaje) {
  return Object.assign(new Error(mensaje), { status })
}

/** Los productos del cuerpo (`productos` como lista o `producto` como texto); lanza si falta alguno o alguno lleva coma */
function leerProductos(cuerpo) {
  const lista = Array.isArray(cuerpo?.productos) ? cuerpo.productos.filter(p => typeof p === 'string') : cuerpo?.producto
  if (Array.isArray(lista) && lista.some(p => !nombreProductoValido(p))) throw fallo(400, PRODUCTO_CON_COMA)
  return listaProductos(lista)
}

/**
 * Asigna categoría y productos a un material (registrando los que sean nuevos) y lo
 * propaga a sus compras. Devuelve { cat, producto (texto), productosNuevos }
 */
function asignar(db, material, categoria, productos) {
  const cat = registrarEnCatalogo(db, 'categoria', categoria)
  const registrados = listaProductos(productos).map(p => registrarEnCatalogo(db, 'producto', p))
  const producto = textoProductos(registrados.map(p => p.nombre))
  db.prepare("UPDATE catalogo SET categoria = ?, producto = ? WHERE tipo = 'material' AND nombre = ?")
    .run(cat.nombre, producto, material)
  db.prepare('UPDATE ingresos SET categoria = ?, producto = ? WHERE material = ? COLLATE NOCASE')
    .run(cat.nombre, producto, material)
  return { cat, producto, productosNuevos: registrados.filter(p => p.nuevo).map(p => p.nombre) }
}

/** Lo que se devuelve de un material asignado */
const respuestaAsignacion = ({ cat, producto, productosNuevos }) => ({
  categoria: cat.nombre,
  producto,
  productos: listaProductos(producto),
  categoriaNueva: cat.nuevo,
  productoNuevo: productosNuevos.length > 0,
  productosNuevos,
})

/** `materiales` del cuerpo: undefined (no se tocan), o una lista de nombres sin repetidos */
function leerMateriales(cuerpo) {
  if (cuerpo?.materiales === undefined) return undefined
  if (!Array.isArray(cuerpo.materiales) || cuerpo.materiales.some(m => typeof m !== 'string')) {
    throw fallo(400, 'La lista de artículos no es válida')
  }
  const vistos = new Set()
  return cuerpo.materiales.map(texto).filter(m => m && !vistos.has(m.toLowerCase()) && vistos.add(m.toLowerCase()))
}

/**
 * Deja en la categoría o el producto `nombre` exactamente esos materiales (que
 * deben existir) y lo propaga a sus compras. Devuelve cuántos materiales cambiaron.
 */
function fijarMateriales(db, tipo, nombre, materiales) {
  const registrados = materiales.map(m => {
    const mat = buscar(db, 'material', m)
    if (!mat) throw fallo(400, `No existe un artículo llamado «${m}»`)
    return mat
  })
  if (tipo === 'producto') return fijarMaterialesDeProducto(db, nombre, registrados)
  const elegidos = new Set(registrados.map(m => m.nombre.toLowerCase()))
  let cambios = 0
  // Los que ya no van quedan sin asignar (las compras conservan su texto, como al eliminar)
  const actuales = db.prepare(`SELECT nombre FROM catalogo WHERE tipo = 'material' AND ${tipo} = ? COLLATE NOCASE`).all(nombre)
  for (const { nombre: material } of actuales) {
    if (elegidos.has(material.toLowerCase())) continue
    db.prepare(`UPDATE catalogo SET ${tipo} = '' WHERE tipo = 'material' AND nombre = ?`).run(material)
    cambios++
  }
  for (const mat of registrados) {
    if (mat[tipo] === nombre) continue
    db.prepare(`UPDATE catalogo SET ${tipo} = ? WHERE tipo = 'material' AND nombre = ?`).run(nombre, mat.nombre)
    db.prepare(`UPDATE ingresos SET ${tipo} = ? WHERE material = ? COLLATE NOCASE`).run(nombre, mat.nombre)
    cambios++
  }
  return cambios
}

/**
 * Producto: un material puede ir en varios. Los elegidos lo suman a su lista (y sus
 * compras también); los quitados lo pierden en el catálogo (las compras conservan su texto).
 */
function fijarMaterialesDeProducto(db, nombre, registrados) {
  const elegidos = new Set(registrados.map(m => m.nombre.toLowerCase()))
  const actualizar = db.prepare("UPDATE catalogo SET producto = ? WHERE tipo = 'material' AND nombre = ?")
  let cambios = 0
  for (const mat of db.prepare("SELECT nombre, producto FROM catalogo WHERE tipo = 'material'").all()) {
    if (elegidos.has(mat.nombre.toLowerCase()) || !tieneProducto(mat.producto, nombre)) continue
    actualizar.run(sinProducto(mat.producto, nombre), mat.nombre)
    cambios++
  }
  for (const mat of registrados) {
    if (tieneProducto(mat.producto, nombre)) continue
    const producto = conProducto(mat.producto, nombre)
    actualizar.run(producto, mat.nombre)
    db.prepare('UPDATE ingresos SET producto = ? WHERE material = ? COLLATE NOCASE').run(producto, mat.nombre)
    cambios++
  }
  return cambios
}

/** Renombra un producto dentro de las listas de los materiales y de las filas de compras; devuelve cuántas compras cambiaron */
function renombrarEnListas(db, anterior, nuevo) {
  const catalogo = db.prepare("UPDATE catalogo SET producto = ? WHERE tipo = 'material' AND nombre = ?")
  for (const m of db.prepare("SELECT nombre, producto FROM catalogo WHERE tipo = 'material'").all()) {
    if (tieneProducto(m.producto, anterior)) catalogo.run(renombrarProducto(m.producto, anterior, nuevo), m.nombre)
  }
  const fila = db.prepare('UPDATE ingresos SET producto = ? WHERE id = ?')
  const compras = new Set()
  for (const f of db.prepare("SELECT id, compra_id, producto FROM ingresos WHERE producto IS NOT NULL AND producto != ''").all()) {
    if (!tieneProducto(f.producto, anterior)) continue
    fila.run(renombrarProducto(f.producto, anterior, nuevo), f.id)
    compras.add(f.compra_id)
  }
  return compras.size
}

const conMateriales = tipo => tipo === 'categoria' || tipo === 'producto'

/**
 * Aplica las filas (ya validadas) de un respaldo de la sección. Nunca borra: un proveedor
 * toma la ficha del archivo si trae datos; un artículo toma su categoría y suma sus
 * productos; una categoría o un producto suma sus artículos (los que no existen se omiten).
 */
function importarFilas(db, tipo, filas) {
  let nuevos = 0
  let actualizados = 0
  let omitidos = 0
  for (const fila of filas) {
    const { nombre, nuevo } = registrarEnCatalogo(db, tipo, fila.nombre)
    if (nuevo) nuevos++
    else actualizados++
    if (tipo === 'proveedor') {
      const ficha = { ubicacion: fila.ubicacion, telefonos: fila.telefonos, contactos: fila.contactos }
      if (!fichaVacia(ficha)) guardarFicha(db, nombre, ficha)
    } else if (tipo === 'material') {
      const actual = buscar(db, 'material', nombre)
      asignar(db, nombre, fila.categoria, [...listaProductos(actual?.producto), ...fila.productos])
    } else {
      for (const articulo of fila.articulos) {
        const mat = buscar(db, 'material', articulo)
        if (!mat) {
          omitidos++
          continue
        }
        if (tipo === 'categoria') {
          if (mat.categoria === nombre) continue
          db.prepare("UPDATE catalogo SET categoria = ? WHERE tipo = 'material' AND nombre = ?").run(nombre, mat.nombre)
          db.prepare('UPDATE ingresos SET categoria = ? WHERE material = ? COLLATE NOCASE').run(nombre, mat.nombre)
        } else if (!tieneProducto(mat.producto, nombre)) {
          const producto = conProducto(mat.producto, nombre)
          db.prepare("UPDATE catalogo SET producto = ? WHERE tipo = 'material' AND nombre = ?").run(producto, mat.nombre)
          db.prepare('UPDATE ingresos SET producto = ? WHERE material = ? COLLATE NOCASE').run(producto, mat.nombre)
        }
      }
    }
  }
  return { nuevos, actualizados, omitidos }
}

export function crearRutasCatalogo(getDb) {
  const router = Router()

  /** Ejecuta fn y responde; los errores con status se devuelven tal cual */
  function responder(res, fn) {
    try {
      res.json(fn(getDb()))
    } catch (err) {
      res.status(err.status ?? 500).json(err.campo ? { error: err.message, campo: err.campo } : { error: err.message })
    }
  }

  router.get('/', (_req, res) => responder(res, leerCatalogo))

  // Asignar categoría y producto al registrar una compra (ventana "Material nuevo")
  router.put('/materiales/:nombre', (req, res) => {
    const material = texto(req.params.nombre)
    const categoria = texto(req.body?.categoria)
    if (!material) return res.status(400).json({ error: 'Falta el artículo' })
    if (!categoria) return res.status(400).json({ error: 'Elige una categoría' })

    responder(res, db => enTransaccion(db, () => {
      const productos = leerProductos(req.body)
      if (!productos.length) throw fallo(400, 'Elige al menos un producto')
      const mat = registrarEnCatalogo(db, 'material', material)
      const { categoria: c, producto, productos: lista, ...nuevos } = respuestaAsignacion(asignar(db, mat.nombre, categoria, productos))
      return { material: { nombre: mat.nombre, categoria: c, producto, productos: lista }, materialNuevo: mat.nuevo, ...nuevos }
    }))
  })

  router.post('/:tipo/importar', (req, res) => {
    const { tipo } = req.params
    if (!TIPOS.includes(tipo)) return res.status(404).json({ error: 'Tipo de catálogo desconocido' })
    let filas
    try {
      filas = validarCatalogoJSON(req.body?.filas, tipo)
    } catch (err) {
      return res.status(400).json({ error: err.message })
    }
    responder(res, db => enTransaccion(db, () => importarFilas(db, tipo, filas)))
  })

  router.post('/:tipo', (req, res) => {
    const { tipo } = req.params
    if (!TIPOS.includes(tipo)) return res.status(404).json({ error: 'Tipo de catálogo desconocido' })
    const nombre = texto(req.body?.nombre)
    const categoria = texto(req.body?.categoria)
    if (!nombre) return res.status(400).json({ error: `Escribe el nombre del ${NOMBRE_TIPO[tipo]}` })
    if (tipo === 'producto' && !nombreProductoValido(nombre)) return res.status(400).json({ error: PRODUCTO_CON_COMA })
    if (tipo === 'material' && !categoria) return res.status(400).json({ error: 'Elige una categoría' })

    responder(res, db => enTransaccion(db, () => {
      const productos = tipo === 'material' ? leerProductos(req.body) : []
      if (tipo === 'material' && !productos.length) throw fallo(400, 'Elige al menos un producto')
      const materiales = conMateriales(tipo) ? leerMateriales(req.body) : undefined
      const existente = buscar(db, tipo, nombre)
      if (existente) throw fallo(409, `Ya existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${existente.nombre}»`)
      const ficha = tipo === 'proveedor' ? fichaDelCuerpo(req.body) : undefined
      registrarEnCatalogo(db, tipo, nombre)
      if (tipo === 'proveedor') {
        if (ficha) guardarFicha(db, nombre, ficha)
        return { nombre, ficha: ficha ?? leerFicha(''), materiales: 0, categoriaNueva: false, productoNuevo: false, productosNuevos: [] }
      }
      if (tipo !== 'material') {
        const cambiados = materiales ? fijarMateriales(db, tipo, nombre, materiales) : 0
        return { nombre, materiales: cambiados, categoriaNueva: false, productoNuevo: false, productosNuevos: [] }
      }
      return { nombre, ...respuestaAsignacion(asignar(db, nombre, categoria, productos)) }
    }))
  })

  router.put('/:tipo/:nombre', (req, res) => {
    const { tipo } = req.params
    if (!TIPOS.includes(tipo)) return res.status(404).json({ error: 'Tipo de catálogo desconocido' })
    const actual = texto(req.params.nombre)
    const nuevo = texto(req.body?.nombre) || actual
    const categoria = texto(req.body?.categoria)
    if (tipo === 'producto' && !nombreProductoValido(nuevo)) return res.status(400).json({ error: PRODUCTO_CON_COMA })

    responder(res, db => enTransaccion(db, () => {
      const productos = tipo === 'material' ? leerProductos(req.body) : []
      if (tipo === 'material' && (categoria === '') !== (productos.length === 0)) {
        throw fallo(400, categoria ? 'Elige al menos un producto' : 'Elige una categoría')
      }
      const materiales = conMateriales(tipo) ? leerMateriales(req.body) : undefined
      const ficha = tipo === 'proveedor' ? fichaDelCuerpo(req.body) : undefined
      const registro = buscar(db, tipo, actual)
      if (!registro) throw fallo(404, `No existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${actual}»`)
      const choque = buscar(db, tipo, nuevo)
      if (choque && choque.nombre.toLowerCase() !== registro.nombre.toLowerCase()) {
        throw fallo(409, `Ya existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${choque.nombre}»`)
      }

      // Nuevo nombre en el catálogo y en todas las compras
      db.prepare('UPDATE catalogo SET nombre = ? WHERE tipo = ? AND nombre = ?').run(nuevo, tipo, registro.nombre)
      let compras = 0
      if (tipo === 'proveedor' || tipo === 'material') {
        compras = Number(db.prepare(`SELECT COUNT(DISTINCT compra_id) AS n FROM ingresos WHERE ${tipo} = ? COLLATE NOCASE`).get(registro.nombre).n)
        db.prepare(`UPDATE ingresos SET ${tipo} = ? WHERE ${tipo} = ? COLLATE NOCASE`).run(nuevo, registro.nombre)
      } else if (tipo === 'producto') {
        // Producto: dentro de la lista de cada material y de cada fila de compra
        compras = renombrarEnListas(db, registro.nombre, nuevo)
      } else {
        // Categoría: también en los materiales que la usan
        db.prepare(`UPDATE catalogo SET ${tipo} = ? WHERE tipo = 'material' AND ${tipo} = ? COLLATE NOCASE`).run(nuevo, registro.nombre)
        compras = Number(db.prepare(`SELECT COUNT(DISTINCT compra_id) AS n FROM ingresos WHERE ${tipo} = ? COLLATE NOCASE`).get(registro.nombre).n)
        db.prepare(`UPDATE ingresos SET ${tipo} = ? WHERE ${tipo} = ? COLLATE NOCASE`).run(nuevo, registro.nombre)
      }

      let asignacion = { categoriaNueva: false, productoNuevo: false, productosNuevos: [] }
      if (tipo === 'material' && categoria) asignacion = respuestaAsignacion(asignar(db, nuevo, categoria, productos))
      const cambiados = materiales ? fijarMateriales(db, tipo, nuevo, materiales) : 0
      if (ficha) guardarFicha(db, nuevo, ficha)
      const guardado = buscar(db, tipo, nuevo)
      const extra = tipo === 'material'
        ? { productos: listaProductos(guardado.producto) }
        : tipo === 'proveedor' ? { ficha: leerFicha(db.prepare("SELECT ficha FROM catalogo WHERE tipo = 'proveedor' AND nombre = ?").get(nuevo)?.ficha) } : {}
      return {
        anterior: registro.nombre, nombre: nuevo, ...guardado, ...extra, compras, materiales: cambiados,
        categoriaNueva: asignacion.categoriaNueva, productoNuevo: asignacion.productoNuevo, productosNuevos: asignacion.productosNuevos,
      }
    }))
  })

  router.delete('/:tipo/:nombre', (req, res) => {
    const { tipo } = req.params
    if (!TIPOS.includes(tipo)) return res.status(404).json({ error: 'Tipo de catálogo desconocido' })
    const nombre = texto(req.params.nombre)

    responder(res, db => enTransaccion(db, () => {
      const registro = buscar(db, tipo, nombre)
      if (!registro) throw fallo(404, `No existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${nombre}»`)
      db.prepare('DELETE FROM catalogo WHERE tipo = ? AND nombre = ?').run(tipo, registro.nombre)
      // Los materiales que usaban la categoría o el producto la vuelven a pedir al registrar una compra
      let materiales = 0
      if (tipo === 'categoria') {
        materiales = Number(db.prepare(`UPDATE catalogo SET ${tipo} = '' WHERE tipo = 'material' AND ${tipo} = ? COLLATE NOCASE`)
          .run(registro.nombre).changes)
      } else if (tipo === 'producto') {
        // Sale de la lista de cada material; el que se quede sin productos lo volverá a pedir
        const actualizar = db.prepare("UPDATE catalogo SET producto = ? WHERE tipo = 'material' AND nombre = ?")
        for (const m of db.prepare("SELECT nombre, producto FROM catalogo WHERE tipo = 'material'").all()) {
          if (!tieneProducto(m.producto, registro.nombre)) continue
          actualizar.run(sinProducto(m.producto, registro.nombre), m.nombre)
          materiales++
        }
      }
      return { nombre: registro.nombre, materiales }
    }))
  })

  return router
}
