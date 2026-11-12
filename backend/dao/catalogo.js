/**
 * dao/catalogo.js — Acceso a datos del Catálogo (patrón DAO): proveedores (con su ficha),
 * categorías (con los proveedores que las surten), artículos (`material`, con su categoría y
 * sus productos) y productos. El catálogo es la única fuente de las opciones de los
 * buscadores; cada compra guardada registra lo suyo (db.js, registrarCompra).
 *
 * Cada material tiene una sola categoría y uno o varios productos (en `producto`, como texto
 * «Arepas, Empanadas»; ver shared/productos.js). `materiales` en una categoría o un producto es
 * la lista completa de los que la llevan; `proveedores` en una categoría, la de los que la surten
 * (tabla proveedor_categoria). Renombrar actualiza también las compras; eliminar deja a las
 * compras con su texto. Todo cambio va en una transacción y los errores son ErrorDatos.
 *
 *   const dao = catalogoDAO(db)
 *   dao.leer()
 *   dao.asignarMaterial(nombre, { categoria, productos, proveedor?, nuevo? }, { puedeEditar })
 *   dao.agregar(tipo, cuerpo, { puedeCrearProveedor }) · dao.editar(tipo, nombre, cuerpo, { puedeCrearProveedor })
 *   dao.eliminar(tipo, nombre) · dao.importar(tipo, filas)
 *
 * tipo: proveedor | categoria | material | producto
 */

import { buscarEnCatalogo, enTransaccion, leerProveedoresPorCategoria, registrarEnCatalogo, vincularProveedorCategoria } from '../db.js'
import {
  PRODUCTO_CON_COMA, conProducto, listaProductos, nombreProductoValido, renombrarProducto, sinProducto, textoProductos, tieneProducto,
} from '../../shared/productos.js'
import { fichaVacia, leerFicha, normalizarFicha } from '../../shared/proveedores.js'
import { validarCatalogoJSON } from '../../shared/catalogo-json.js'
import { ErrorDatos } from './errores.js'

export const TIPOS = ['proveedor', 'categoria', 'material', 'producto']
const NOMBRE_TIPO = { proveedor: 'proveedor', categoria: 'categoría', material: 'artículo', producto: 'producto' }
const ARTICULO = { proveedor: 'un', categoria: 'una', material: 'un', producto: 'un' }

const ordenar = lista => lista.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
const texto = v => (typeof v === 'string' ? v.trim() : '')

/** Cuántas compras usan cada proveedor o material, y cuántos materiales cada categoría o producto */
function leerUso(db) {
  // Se suman: «AZÚCAR» y «Azúcar» son dos grupos para SQLite y una sola clave aquí
  const contar = filas => filas.reduce((uso, f) => {
    const k = f.k.toLowerCase()
    uso[k] = (uso[k] ?? 0) + f.n
    return uso
  }, {})
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
    throw fallo(400, err.message, err.campo)
  }
}

function guardarFicha(db, nombre, ficha) {
  db.prepare("UPDATE catalogo SET ficha = ? WHERE tipo = 'proveedor' AND nombre = ?")
    .run(fichaVacia(ficha) ? '' : JSON.stringify(ficha), nombre)
}

/**
 * ¿La última compra de cada proveedor llevó IVA? (la de fecha más reciente y, a igual
 * fecha, la registrada después). Claves en minúsculas, armadas aquí y no con COLLATE
 * NOCASE, que solo ignora mayúsculas ASCII. Una compra sin IVA o anterior a él da false.
 */
function leerIvaPorProveedor(db) {
  const ultimo = {}
  for (const f of db.prepare('SELECT proveedor, compra_iva FROM ingresos ORDER BY fecha ASC, id ASC').all()) {
    ultimo[f.proveedor.trim().toLowerCase()] = f.compra_iva > 0
  }
  return ultimo
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
    ivaPorProveedor: leerIvaPorProveedor(db),
    fichas: leerFichas(db),
    proveedoresPorCategoria: leerProveedoresPorCategoria(db),
  }
}

const buscar = buscarEnCatalogo

/** ErrorDatos (dao/errores.js) con su código: 400, 403, 404 o 409 */
const fallo = (status, mensaje, campo) => new ErrorDatos(status, mensaje, campo)

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
  // Un respaldo puede traer un artículo sin categoría: no se crea una categoría en blanco
  const cat = categoria ? registrarEnCatalogo(db, 'categoria', categoria) : { nombre: '', nuevo: false }
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

/** `proveedores` del cuerpo: undefined (no se tocan), o una lista de nombres sin repetidos */
function leerProveedores(cuerpo) {
  if (cuerpo?.proveedores === undefined) return undefined
  if (!Array.isArray(cuerpo.proveedores) || cuerpo.proveedores.some(p => typeof p !== 'string')) {
    throw fallo(400, 'La lista de proveedores no es válida', 'proveedores')
  }
  const vistos = new Set()
  return cuerpo.proveedores.map(texto).filter(p => p && !vistos.has(p.toLowerCase()) && vistos.add(p.toLowerCase()))
}

/**
 * Deja en la categoría exactamente esos proveedores. Los que no existen se crean con la
 * ficha vacía (en la misma transacción) si `puedeCrear`; si no, se rechaza el nombre.
 */
function fijarProveedores(db, categoria, proveedores, puedeCrear) {
  const registrados = proveedores.map(p => {
    const prov = buscar(db, 'proveedor', p)
    if (prov) return prov.nombre
    if (!puedeCrear) throw fallo(400, `No existe un proveedor llamado «${p}»`, 'proveedores')
    return registrarEnCatalogo(db, 'proveedor', p).nombre
  })
  db.prepare(
    "DELETE FROM proveedor_categoria WHERE categoria_id = (SELECT id FROM catalogo WHERE tipo = 'categoria' AND nombre = ?)"
  ).run(categoria)
  for (const proveedor of registrados) vincularProveedorCategoria(db, proveedor, categoria)
}

/** Proveedores ya ligados a una categoría */
const proveedoresDe = (db, categoria) => leerProveedoresPorCategoria(db)[categoria.toLowerCase()] ?? []

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
      asignar(db, nombre, fila.categoria || actual?.categoria || '', [...listaProductos(actual?.producto), ...fila.productos])
    } else {
      if (tipo === 'categoria') {
        // Suma los proveedores del archivo; los que no existen se omiten
        for (const proveedor of fila.proveedores ?? []) {
          const prov = buscar(db, 'proveedor', proveedor)
          if (prov) vincularProveedorCategoria(db, prov.nombre, nombre)
          else omitidos++
        }
      }
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

/** Tipo de catálogo conocido; si no, 404 */
function tipoValido(tipo) {
  if (!TIPOS.includes(tipo)) throw fallo(404, 'Tipo de catálogo desconocido')
  return tipo
}

export function catalogoDAO(db) {
  return {
    leer: () => leerCatalogo(db),

    /**
     * Asigna categoría y productos a un artículo al registrar una compra (lo crea si no existe).
     * Con `proveedor`, la categoría queda ligada a ese proveedor. Con `nuevo: true`, 409 si ya
     * existe. Sin `puedeEditar` (catalogo.editar) solo se completa lo que le falte: cambiar lo
     * ya asignado es editar el catálogo (403).
     */
    asignarMaterial(nombreMaterial, cuerpo, { puedeEditar }) {
      const material = texto(nombreMaterial)
      const categoria = texto(cuerpo?.categoria)
      if (!material) throw fallo(400, 'Falta el artículo')
      if (!categoria) throw fallo(400, 'Elige una categoría')
      const proveedor = texto(cuerpo?.proveedor)

      return enTransaccion(db, () => {
        const productos = leerProductos(cuerpo)
        const existente = buscar(db, 'material', material)
        // Crear un artículo nuevo nunca se funde con otro que ya se llame igual
        if (cuerpo?.nuevo === true && existente) throw fallo(409, `Ya existe un artículo llamado «${existente.nombre}»`, 'nombre')
        if (existente && !puedeEditar) {
          const cambiaCategoria = existente.categoria && existente.categoria.toLowerCase() !== categoria.toLowerCase()
          const cambiaProductos = existente.producto && existente.producto.toLowerCase() !== textoProductos(productos).toLowerCase()
          if (cambiaCategoria || cambiaProductos) throw fallo(403, 'No tienes permiso para hacer esto.')
        }
        const mat = registrarEnCatalogo(db, 'material', material)
        const { categoria: c, producto, productos: lista, ...nuevos } = respuestaAsignacion(asignar(db, mat.nombre, categoria, productos))
        // El artículo se le compra a este proveedor: su categoría pasa a ser de él
        const vinculo = proveedor
          ? { proveedorVinculado: vincularProveedorCategoria(db, proveedor, c), proveedor: buscar(db, 'proveedor', proveedor).nombre }
          : {}
        return { material: { nombre: mat.nombre, categoria: c, producto, productos: lista }, materialNuevo: mat.nuevo, ...nuevos, ...vinculo }
      })
    },

    /** Carga las filas de un respaldo de la sección: crea lo que falta y actualiza lo que existe, sin borrar. Todo o nada */
    importar(tipo, filasCrudas) {
      tipoValido(tipo)
      let filas
      try {
        filas = validarCatalogoJSON(filasCrudas, tipo)
      } catch (err) {
        throw fallo(400, err.message)
      }
      return enTransaccion(db, () => importarFilas(db, tipo, filas))
    },

    agregar(tipo, cuerpo, { puedeCrearProveedor }) {
      tipoValido(tipo)
      const nombre = texto(cuerpo?.nombre)
      const categoria = texto(cuerpo?.categoria)
      if (!nombre) throw fallo(400, `Escribe el nombre del ${NOMBRE_TIPO[tipo]}`)
      if (tipo === 'producto' && !nombreProductoValido(nombre)) throw fallo(400, PRODUCTO_CON_COMA)
      if (tipo === 'material' && !categoria) throw fallo(400, 'Elige una categoría')

      return enTransaccion(db, () => {
        const productos = tipo === 'material' ? leerProductos(cuerpo) : []
        const materiales = conMateriales(tipo) ? leerMateriales(cuerpo) : undefined
        const proveedores = tipo === 'categoria' ? leerProveedores(cuerpo) : undefined
        const existente = buscar(db, tipo, nombre)
        if (existente) throw fallo(409, `Ya existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${existente.nombre}»`)
        const ficha = tipo === 'proveedor' ? fichaDelCuerpo(cuerpo) : undefined
        registrarEnCatalogo(db, tipo, nombre)
        if (tipo === 'proveedor') {
          if (ficha) guardarFicha(db, nombre, ficha)
          return { nombre, ficha: ficha ?? leerFicha(''), materiales: 0, categoriaNueva: false, productoNuevo: false, productosNuevos: [] }
        }
        if (tipo !== 'material') {
          const cambiados = materiales ? fijarMateriales(db, tipo, nombre, materiales) : 0
          if (proveedores) fijarProveedores(db, nombre, proveedores, puedeCrearProveedor)
          const extra = tipo === 'categoria' ? { proveedores: proveedoresDe(db, nombre) } : {}
          return { nombre, materiales: cambiados, ...extra, categoriaNueva: false, productoNuevo: false, productosNuevos: [] }
        }
        return { nombre, ...respuestaAsignacion(asignar(db, nombre, categoria, productos)) }
      })
    },

    /**
     * Cambia el nombre (y, en un artículo, su categoría y productos; en una categoría o un
     * producto, sus artículos; en una categoría, sus proveedores; en un proveedor, su ficha) y
     * lo actualiza en todas las compras. Un artículo acepta `proveedor`: la categoría queda ligada a él.
     */
    editar(tipo, nombreActual, cuerpo, { puedeCrearProveedor }) {
      tipoValido(tipo)
      const actual = texto(nombreActual)
      const nuevo = texto(cuerpo?.nombre) || actual
      const categoria = texto(cuerpo?.categoria)
      if (tipo === 'producto' && !nombreProductoValido(nuevo)) throw fallo(400, PRODUCTO_CON_COMA)

      return enTransaccion(db, () => {
        const productos = tipo === 'material' ? leerProductos(cuerpo) : []
        // Los productos son opcionales; sin categoría ni productos solo cambia el nombre
        if (tipo === 'material' && !categoria && productos.length > 0) throw fallo(400, 'Elige una categoría')
        const materiales = conMateriales(tipo) ? leerMateriales(cuerpo) : undefined
        const proveedores = tipo === 'categoria' ? leerProveedores(cuerpo) : undefined
        const ficha = tipo === 'proveedor' ? fichaDelCuerpo(cuerpo) : undefined
        const registro = buscar(db, tipo, actual)
        if (!registro) throw fallo(404, `No existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${actual}»`)
        const choque = buscar(db, tipo, nuevo)
        if (choque && choque.nombre.toLowerCase() !== registro.nombre.toLowerCase()) {
          throw fallo(409, `Ya existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${choque.nombre}»`, tipo === 'material' ? 'nombre' : undefined)
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
        if (tipo === 'material' && categoria) {
          asignacion = respuestaAsignacion(asignar(db, nuevo, categoria, productos))
          // Editado desde una compra: la categoría elegida también queda como del proveedor de esa compra
          const proveedor = texto(cuerpo?.proveedor)
          if (proveedor) vincularProveedorCategoria(db, proveedor, asignacion.categoria)
        }
        const cambiados = materiales ? fijarMateriales(db, tipo, nuevo, materiales) : 0
        if (proveedores) fijarProveedores(db, nuevo, proveedores, puedeCrearProveedor)
        if (ficha) guardarFicha(db, nuevo, ficha)
        const guardado = buscar(db, tipo, nuevo)
        const extra = tipo === 'material'
          ? { productos: listaProductos(guardado.producto) }
          : tipo === 'proveedor' ? { ficha: leerFicha(db.prepare("SELECT ficha FROM catalogo WHERE tipo = 'proveedor' AND nombre = ?").get(nuevo)?.ficha) }
            : tipo === 'categoria' ? { proveedores: proveedoresDe(db, nuevo) } : {}
        return {
          anterior: registro.nombre, nombre: nuevo, ...guardado, ...extra, compras, materiales: cambiados,
          categoriaNueva: asignacion.categoriaNueva, productoNuevo: asignacion.productoNuevo, productosNuevos: asignacion.productosNuevos,
        }
      })
    },

    /** Quita la opción; las compras conservan su texto. Los artículos que la usaban la vuelven a pedir */
    eliminar(tipo, nombreCrudo) {
      tipoValido(tipo)
      const nombre = texto(nombreCrudo)
      return enTransaccion(db, () => {
        const registro = buscar(db, tipo, nombre)
        if (!registro) throw fallo(404, `No existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${nombre}»`)
        db.prepare('DELETE FROM catalogo WHERE tipo = ? AND nombre = ?').run(tipo, registro.nombre)
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
      })
    },
  }
}
