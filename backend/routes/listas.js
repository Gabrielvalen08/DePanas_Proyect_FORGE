/**
 * routes/listas.js
 * Compras (listas) completas sobre la tabla `ingresos`, agrupadas por compra_id.
 * Es lo que usa el frontend: una compra = un proveedor, una fecha y sus materiales.
 *
 *   GET    /api/compras               → compras, con filtros proveedor/material/fechaDesde/fechaHasta
 *   GET    /api/compras/sugerencias   → { proveedores, categorias, materiales, productos } (catálogo + compras)
 *   GET    /api/compras/:id           → una compra
 *   POST   /api/compras               → crea una compra (todas sus filas en una transacción)
 *   PUT    /api/compras/:id           → reemplaza los materiales de una compra
 *   DELETE /api/compras/:id           → elimina la compra completa
 */

import { Router } from 'express'
import { randomUUID } from 'crypto'
import { enTransaccion, registrarCompra } from '../db.js'
import { leerCatalogo } from './catalogo.js'

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Agrupa filas planas de `ingresos` en compras, conservando el orden de llegada */
export function agruparFilas(filas) {
  const compras = new Map()
  for (const f of filas) {
    if (!compras.has(f.compra_id)) {
      compras.set(f.compra_id, {
        id: f.compra_id,
        proveedor: f.proveedor,
        fecha: f.fecha,
        categoria: f.categoria ?? '',
        materiales: [],
      })
    }
    compras.get(f.compra_id).materiales.push({
      id: f.id,
      material: f.material,
      cantidad: f.cantidad,
      unidad: f.unidad,
      monto: f.monto,
      categoria: f.categoria ?? '',
      producto: f.producto ?? '',
    })
  }
  return [...compras.values()]
}

/**
 * Valida y normaliza el cuerpo de una compra.
 * Devuelve { compra } o { error } con un mensaje para el usuario.
 */
export function validarCompra(cuerpo) {
  const proveedor = typeof cuerpo?.proveedor === 'string' ? cuerpo.proveedor.trim() : ''
  const fecha = cuerpo?.fecha
  const materiales = cuerpo?.materiales

  if (!proveedor) return { error: 'Falta el proveedor' }
  if (typeof fecha !== 'string' || !FECHA_ISO.test(fecha)) return { error: 'La fecha debe tener el formato AAAA-MM-DD' }
  if (!Array.isArray(materiales) || materiales.length === 0) return { error: 'La compra necesita al menos un material' }

  const normalizados = []
  for (const [i, m] of materiales.entries()) {
    const material = typeof m?.material === 'string' ? m.material.trim() : ''
    const cantidad = Number(m?.cantidad)
    const monto = Number(m?.monto)
    if (!material) return { error: `Fila ${i + 1}: falta el material` }
    if (!Number.isFinite(cantidad) || cantidad <= 0) return { error: `Fila ${i + 1}: la cantidad debe ser mayor a 0` }
    if (!Number.isFinite(monto) || monto <= 0) return { error: `Fila ${i + 1}: el monto debe ser mayor a 0` }
    normalizados.push({
      material,
      cantidad,
      unidad: typeof m.unidad === 'string' && m.unidad.trim() ? m.unidad.trim() : 'unidad',
      monto,
      // Solo si viene: así el id derivado al importar JSON antiguos no cambia
      ...(typeof m.categoria === 'string' && m.categoria.trim() ? { categoria: m.categoria.trim() } : {}),
      producto: typeof m.producto === 'string' ? m.producto.trim() : '',
    })
  }

  return {
    compra: {
      proveedor,
      fecha,
      categoria: typeof cuerpo.categoria === 'string' ? cuerpo.categoria.trim() : '',
      materiales: normalizados,
    },
  }
}

const COLUMNAS = 'id, compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto'

function insertarMateriales(db, compraId, compra) {
  const insertar = db.prepare(
    'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  registrarCompra(db, compra)
  for (const m of compra.materiales) {
    // La categoría es de cada material (como en el Excel); la de la compra queda como respaldo
    insertar.run(compraId, compra.fecha, m.material, m.cantidad, m.unidad, m.monto, compra.proveedor, m.categoria || compra.categoria, m.producto)
  }
}

function leerCompra(db, compraId) {
  const filas = db.prepare(`SELECT ${COLUMNAS} FROM ingresos WHERE compra_id = ? ORDER BY id`).all(compraId)
  return agruparFilas(filas)[0] ?? null
}

/** getDb() devuelve la conexión vigente (cambia al importar un .db) */
export function crearRutasListas(getDb) {
  const router = Router()

  router.get('/', (req, res) => {
    const { proveedor, material, fechaDesde, fechaHasta } = req.query
    // Los filtros eligen compras; luego se traen todas sus filas.
    // Con `material`, se devuelven las compras que contienen ese material.
    let subconsulta = 'SELECT compra_id FROM ingresos WHERE 1=1'
    const params = []
    if (proveedor) { subconsulta += ' AND proveedor LIKE ?'; params.push(`%${proveedor}%`) }
    if (material) { subconsulta += ' AND material LIKE ?'; params.push(`%${material}%`) }
    if (fechaDesde) { subconsulta += ' AND fecha >= ?'; params.push(fechaDesde) }
    if (fechaHasta) { subconsulta += ' AND fecha <= ?'; params.push(fechaHasta) }

    try {
      // Compras más recientes primero; dentro de cada compra, los materiales en el orden en que se ingresaron
      const filas = getDb()
        .prepare(
          `SELECT ${COLUMNAS}, (SELECT MAX(j.id) FROM ingresos j WHERE j.compra_id = i.compra_id) AS orden_compra ` +
          `FROM ingresos i WHERE compra_id IN (${subconsulta}) ORDER BY fecha DESC, orden_compra DESC, id ASC`
        )
        .all(...params)
      res.json(agruparFilas(filas))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get('/sugerencias', (_req, res) => {
    try {
      const { proveedores, categorias, materiales, productos } = leerCatalogo(getDb())
      res.json({ proveedores, categorias, materiales: materiales.map(m => m.nombre), productos })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get('/:id', (req, res) => {
    const compra = leerCompra(getDb(), req.params.id)
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' })
    res.json(compra)
  })

  router.post('/', (req, res) => {
    const { compra, error } = validarCompra(req.body)
    if (error) return res.status(400).json({ error })
    const db = getDb()
    const compraId = randomUUID()
    try {
      enTransaccion(db, () => insertarMateriales(db, compraId, compra))
      res.status(201).json(leerCompra(db, compraId))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.put('/:id', (req, res) => {
    const { compra, error } = validarCompra(req.body)
    if (error) return res.status(400).json({ error })
    const db = getDb()
    const compraId = req.params.id
    try {
      const existe = db.prepare('SELECT 1 FROM ingresos WHERE compra_id = ? LIMIT 1').get(compraId)
      if (!existe) return res.status(404).json({ error: 'Compra no encontrada' })
      // Reemplazo completo: se borran las filas de la compra y se insertan las nuevas
      enTransaccion(db, () => {
        db.prepare('DELETE FROM ingresos WHERE compra_id = ?').run(compraId)
        insertarMateriales(db, compraId, compra)
      })
      res.json(leerCompra(db, compraId))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.delete('/:id', (req, res) => {
    try {
      const info = getDb().prepare('DELETE FROM ingresos WHERE compra_id = ?').run(req.params.id)
      if (Number(info.changes) === 0) return res.status(404).json({ error: 'Compra no encontrada' })
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
