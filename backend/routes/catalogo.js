/**
 * routes/catalogo.js
 * Opciones de los desplegables (proveedor, categoría, material, producto) y la
 * categoría/producto de cada material. El catálogo es la única fuente de las
 * opciones: cada compra guardada registra lo suyo (db.js, registrarCompra).
 *
 *   GET    /api/catalogo                    → { proveedores, categorias, productos,
 *                                               materiales: [{ nombre, categoria, producto }], uso }
 *   PUT    /api/catalogo/materiales/:nombre → asigna { categoria, producto } a un material
 *                                             (lo crea si no existe; usado al registrar compras)
 *   POST   /api/catalogo/:tipo              → agrega { nombre } (material: + categoria y producto)
 *   PUT    /api/catalogo/:tipo/:nombre      → cambia el nombre (y, en un material, su categoría y
 *                                             producto) y lo actualiza en todas las compras
 *   DELETE /api/catalogo/:tipo/:nombre      → quita la opción; las compras conservan su texto
 *
 * :tipo es proveedor | categoria | material | producto
 */

import { Router } from 'express'
import { enTransaccion, registrarEnCatalogo } from '../db.js'

export const TIPOS = ['proveedor', 'categoria', 'material', 'producto']
const NOMBRE_TIPO = { proveedor: 'proveedor', categoria: 'categoría', material: 'material', producto: 'producto' }
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
  return {
    proveedor: enCompras('proveedor'),
    material: enCompras('material'),
    categoria: enMateriales('categoria'),
    producto: enMateriales('producto'),
  }
}

export function leerCatalogo(db) {
  const nombres = tipo => ordenar(db.prepare('SELECT nombre FROM catalogo WHERE tipo = ?').all(tipo).map(f => f.nombre))
  return {
    proveedores: nombres('proveedor'),
    categorias: nombres('categoria'),
    productos: nombres('producto'),
    materiales: db.prepare("SELECT nombre, categoria, producto FROM catalogo WHERE tipo = 'material'").all()
      .map(m => ({ ...m }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    uso: leerUso(db),
  }
}

function buscar(db, tipo, nombre) {
  return db.prepare('SELECT nombre, categoria, producto FROM catalogo WHERE tipo = ? AND nombre = ? COLLATE NOCASE').get(tipo, nombre)
}

/** Error con código HTTP, para responder 400/404/409 desde dentro de una transacción */
function fallo(status, mensaje) {
  return Object.assign(new Error(mensaje), { status })
}

/** Asigna categoría y producto a un material (registrando las que sean nuevas) y lo propaga a sus compras */
function asignar(db, material, categoria, producto) {
  const cat = registrarEnCatalogo(db, 'categoria', categoria)
  const prod = registrarEnCatalogo(db, 'producto', producto)
  db.prepare("UPDATE catalogo SET categoria = ?, producto = ? WHERE tipo = 'material' AND nombre = ?")
    .run(cat.nombre, prod.nombre, material)
  db.prepare('UPDATE ingresos SET categoria = ?, producto = ? WHERE material = ? COLLATE NOCASE')
    .run(cat.nombre, prod.nombre, material)
  return { cat, prod }
}

export function crearRutasCatalogo(getDb) {
  const router = Router()

  /** Ejecuta fn y responde; los errores con status se devuelven tal cual */
  function responder(res, fn) {
    try {
      res.json(fn(getDb()))
    } catch (err) {
      res.status(err.status ?? 500).json({ error: err.message })
    }
  }

  router.get('/', (_req, res) => responder(res, leerCatalogo))

  // Asignar categoría y producto al registrar una compra (ventana "Material nuevo")
  router.put('/materiales/:nombre', (req, res) => {
    const material = texto(req.params.nombre)
    const categoria = texto(req.body?.categoria)
    const producto = texto(req.body?.producto)
    if (!material) return res.status(400).json({ error: 'Falta el material' })
    if (!categoria) return res.status(400).json({ error: 'Elige una categoría' })
    if (!producto) return res.status(400).json({ error: 'Elige un producto' })

    responder(res, db => enTransaccion(db, () => {
      const mat = registrarEnCatalogo(db, 'material', material)
      const { cat, prod } = asignar(db, mat.nombre, categoria, producto)
      return {
        material: { nombre: mat.nombre, categoria: cat.nombre, producto: prod.nombre },
        materialNuevo: mat.nuevo,
        categoriaNueva: cat.nuevo,
        productoNuevo: prod.nuevo,
      }
    }))
  })

  router.post('/:tipo', (req, res) => {
    const { tipo } = req.params
    if (!TIPOS.includes(tipo)) return res.status(404).json({ error: 'Tipo de catálogo desconocido' })
    const nombre = texto(req.body?.nombre)
    const categoria = texto(req.body?.categoria)
    const producto = texto(req.body?.producto)
    if (!nombre) return res.status(400).json({ error: `Escribe el nombre del ${NOMBRE_TIPO[tipo]}` })
    if (tipo === 'material' && !categoria) return res.status(400).json({ error: 'Elige una categoría' })
    if (tipo === 'material' && !producto) return res.status(400).json({ error: 'Elige un producto' })

    responder(res, db => enTransaccion(db, () => {
      const existente = buscar(db, tipo, nombre)
      if (existente) throw fallo(409, `Ya existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${existente.nombre}»`)
      registrarEnCatalogo(db, tipo, nombre)
      if (tipo !== 'material') return { nombre, categoriaNueva: false, productoNuevo: false }
      const { cat, prod } = asignar(db, nombre, categoria, producto)
      return { nombre, categoria: cat.nombre, producto: prod.nombre, categoriaNueva: cat.nuevo, productoNuevo: prod.nuevo }
    }))
  })

  router.put('/:tipo/:nombre', (req, res) => {
    const { tipo } = req.params
    if (!TIPOS.includes(tipo)) return res.status(404).json({ error: 'Tipo de catálogo desconocido' })
    const actual = texto(req.params.nombre)
    const nuevo = texto(req.body?.nombre) || actual
    const categoria = texto(req.body?.categoria)
    const producto = texto(req.body?.producto)
    if (tipo === 'material' && (categoria === '') !== (producto === '')) {
      return res.status(400).json({ error: categoria ? 'Elige un producto' : 'Elige una categoría' })
    }

    responder(res, db => enTransaccion(db, () => {
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
      } else {
        // Categoría o producto: también en los materiales que la usan
        db.prepare(`UPDATE catalogo SET ${tipo} = ? WHERE tipo = 'material' AND ${tipo} = ? COLLATE NOCASE`).run(nuevo, registro.nombre)
        compras = Number(db.prepare(`SELECT COUNT(DISTINCT compra_id) AS n FROM ingresos WHERE ${tipo} = ? COLLATE NOCASE`).get(registro.nombre).n)
        db.prepare(`UPDATE ingresos SET ${tipo} = ? WHERE ${tipo} = ? COLLATE NOCASE`).run(nuevo, registro.nombre)
      }

      let categoriaNueva = false
      let productoNuevo = false
      if (tipo === 'material' && categoria) {
        const { cat, prod } = asignar(db, nuevo, categoria, producto)
        categoriaNueva = cat.nuevo
        productoNuevo = prod.nuevo
      }
      return { anterior: registro.nombre, nombre: nuevo, ...buscar(db, tipo, nuevo), compras, categoriaNueva, productoNuevo }
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
      if (tipo === 'categoria' || tipo === 'producto') {
        materiales = Number(db.prepare(`UPDATE catalogo SET ${tipo} = '' WHERE tipo = 'material' AND ${tipo} = ? COLLATE NOCASE`)
          .run(registro.nombre).changes)
      }
      return { nombre: registro.nombre, materiales }
    }))
  })

  return router
}
