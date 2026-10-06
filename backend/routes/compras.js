/**
 * routes/compras.js
 * CRUD fila por fila sobre la tabla única `ingresos`.
 * Cada fila = un material comprado (fecha, material, cantidad, unidad, monto,
 * proveedor, categoria, producto) y la compra a la que pertenece (compra_id).
 *
 * El frontend trabaja con compras completas en /api/compras (routes/listas.js);
 * estas rutas quedan para acceso directo a las filas.
 */

import { Router } from 'express'
import { randomUUID } from 'crypto'
import { enTransaccion, registrarCompra } from '../db.js'
import { validarCompra } from './listas.js'

const CAMPOS_FILA = ['fecha', 'material', 'cantidad', 'unidad', 'monto', 'proveedor', 'categoria', 'producto']

/** getDb() devuelve la conexión vigente (cambia al importar un .db) */
export function crearRutasCompras(getDb) {
  const router = Router()

  // GET /api/ingresos/materiales — Lista única de materiales para autocompletado
  router.get('/materiales', (_req, res) => {
    try {
      // Comillas simples: en SQLite "" es un identificador, no un texto vacío
      const filas = getDb().prepare(
        "SELECT DISTINCT material FROM ingresos WHERE material != '' ORDER BY material COLLATE NOCASE"
      ).all()
      res.json(filas.map(f => f.material))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // GET /api/ingresos
  // Filtros opcionales: proveedor, material, fechaDesde, fechaHasta
  router.get('/', (req, res) => {
    const { proveedor, material, fechaDesde, fechaHasta } = req.query

    let sql = 'SELECT * FROM ingresos WHERE 1=1'
    const params = []

    if (proveedor) {
      sql += ' AND proveedor LIKE ?'
      params.push(`%${proveedor}%`)
    }
    if (material) {
      sql += ' AND material LIKE ?'
      params.push(`%${material}%`)
    }
    if (fechaDesde) {
      sql += ' AND fecha >= ?'
      params.push(fechaDesde)
    }
    if (fechaHasta) {
      sql += ' AND fecha <= ?'
      params.push(fechaHasta)
    }

    sql += ' ORDER BY fecha DESC, id DESC'

    try {
      res.json(getDb().prepare(sql).all(...params))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/ingresos
  // Body: { proveedor, fecha, categoria?, materiales: [{ material, cantidad, unidad?, monto, producto? }] }
  // Todas las filas de una petición forman una misma compra.
  router.post('/', (req, res) => {
    const { compra, error } = validarCompra(req.body)
    if (error) return res.status(400).json({ error })

    const db = getDb()
    const compraId = randomUUID()
    const insertar = db.prepare(
      'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )

    try {
      const insertadas = enTransaccion(db, () => {
        registrarCompra(db, compra)
        return compra.materiales.map(m => {
          const info = insertar.run(
            compraId, compra.fecha, m.material, m.cantidad, m.unidad, m.monto, compra.proveedor, m.categoria || compra.categoria, m.producto
          )
          return {
            id: Number(info.lastInsertRowid),
            compra_id: compraId,
            fecha: compra.fecha,
            proveedor: compra.proveedor,
            categoria: compra.categoria,
            ...m,
          }
        })
      })
      res.status(201).json(insertadas)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // PUT /api/ingresos/:id — actualizar una fila (todos sus campos)
  router.put('/:id', (req, res) => {
    const { id } = req.params
    const faltantes = ['fecha', 'material', 'cantidad', 'monto', 'proveedor'].filter(c => req.body?.[c] === undefined)
    if (faltantes.length > 0) {
      return res.status(400).json({ error: `Faltan campos: ${faltantes.join(', ')}` })
    }
    // Las mismas reglas que una compra completa: fecha AAAA-MM-DD, cantidad y monto > 0
    const cuerpo = req.body
    const { compra, error } = validarCompra({
      proveedor: cuerpo.proveedor,
      fecha: cuerpo.fecha,
      materiales: [{
        material: cuerpo.material,
        cantidad: cuerpo.cantidad,
        unidad: cuerpo.unidad,
        monto: cuerpo.monto,
        categoria: cuerpo.categoria,
        producto: cuerpo.producto,
      }],
    })
    if (error) return res.status(400).json({ error: error.replace(/^Fila 1: /, '') })
    const m = compra.materiales[0]
    const fila = { ...m, fecha: compra.fecha, proveedor: compra.proveedor, categoria: m.categoria ?? '' }

    try {
      const db = getDb()
      const info = enTransaccion(db, () => {
        const resultado = db.prepare(
          'UPDATE ingresos SET fecha=?, material=?, cantidad=?, unidad=?, monto=?, proveedor=?, categoria=?, producto=? WHERE id=?'
        ).run(...CAMPOS_FILA.map(c => fila[c]), id)
        if (Number(resultado.changes) > 0) registrarCompra(db, { proveedor: compra.proveedor, materiales: [m] })
        return resultado
      })

      if (Number(info.changes) === 0) return res.status(404).json({ error: 'Ingreso no encontrado' })
      res.json(getDb().prepare('SELECT * FROM ingresos WHERE id = ?').get(id))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/ingresos/:id
  router.delete('/:id', (req, res) => {
    try {
      const info = getDb().prepare('DELETE FROM ingresos WHERE id=?').run(req.params.id)
      if (Number(info.changes) === 0) return res.status(404).json({ error: 'Ingreso no encontrado' })
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
