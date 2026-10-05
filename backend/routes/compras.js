/**
 * routes/compras.js
 * CRUD sobre la tabla única `ingresos`.
 * Cada fila = un material comprado (fecha, material, cantidad, monto, proveedor, categoria, producto).
 */

import { Router } from 'express'

export function crearRutasCompras(db) {
  const router = Router()

  // GET /api/ingresos/materiales — Lista única de materiales para autocompletado
  router.get('/materiales', (_req, res) => {
    try {
      const filas = db.prepare(
        'SELECT DISTINCT material FROM ingresos WHERE material != "" ORDER BY material COLLATE NOCASE'
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
      const filas = db.prepare(sql).all(...params)
      res.json(filas)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/ingresos
  // Body: { proveedor, fecha, categoria?, materiales: [{ material, cantidad, monto, producto? }] }
  router.post('/', (req, res) => {
    const { proveedor, fecha, categoria = '', materiales } = req.body

    if (!proveedor || !fecha || !Array.isArray(materiales) || materiales.length === 0) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (proveedor, fecha, materiales)' })
    }

    const insertar = db.prepare(
      'INSERT INTO ingresos (fecha, material, cantidad, monto, proveedor, categoria, producto) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )

    db.exec('BEGIN')
    try {
      const insertadas = materiales.map(m => {
        const info = insertar.run(
          fecha,
          m.material?.trim() ?? '',
          Number(m.cantidad) || 1,
          Number(m.monto !== undefined ? m.monto : m.precio),
          proveedor.trim(),
          (categoria || m.categoria || '').trim(),
          (m.producto || '').trim()
        )
        return {
          id: Number(info.lastInsertRowid),
          fecha,
          material: m.material,
          cantidad: m.cantidad,
          monto: m.monto !== undefined ? m.monto : m.precio,
          proveedor,
          categoria: (categoria || m.categoria || '').trim(),
          producto: (m.producto || '').trim()
        }
      })
      db.exec('COMMIT')
      res.status(201).json(insertadas)
    } catch (err) {
      try { db.exec('ROLLBACK') } catch {}
      res.status(500).json({ error: err.message })
    }
  })

  // PUT /api/ingresos/:id — actualizar una fila
  router.put('/:id', (req, res) => {
    const { id } = req.params
    const { fecha, material, cantidad, monto, proveedor, categoria = '', producto = '' } = req.body

    try {
      const info = db.prepare(
        'UPDATE ingresos SET fecha=?, material=?, cantidad=?, monto=?, proveedor=?, categoria=?, producto=? WHERE id=?'
      ).run(fecha, material, cantidad, monto, proveedor, categoria, producto, id)

      if (Number(info.changes) === 0) return res.status(404).json({ error: 'Ingreso no encontrado' })
      res.json({ id: Number(id), fecha, material, cantidad, monto, proveedor, categoria, producto })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/ingresos/:id
  router.delete('/:id', (req, res) => {
    const { id } = req.params
    try {
      const info = db.prepare('DELETE FROM ingresos WHERE id=?').run(id)
      if (Number(info.changes) === 0) return res.status(404).json({ error: 'Ingreso no encontrado' })
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
