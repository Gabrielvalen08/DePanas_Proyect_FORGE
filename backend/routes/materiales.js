/**
 * routes/materiales.js
 * Catálogo de materiales: nombre, categoría y producto destino.
 * Alimenta el autocompletado del frontend.
 */

import { Router } from 'express'

export function crearRutasMateriales(db) {
  const router = Router()

  // GET /api/materiales
  // Devuelve todo el catálogo ordenado alfabéticamente
  router.get('/', (_req, res) => {
    try {
      const lista = db.prepare('SELECT * FROM materiales_catalogo ORDER BY nombre COLLATE NOCASE').all()
      res.json(lista)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // GET /api/materiales/:nombre — busca un material por nombre exacto (case-insensitive)
  router.get('/:nombre', (req, res) => {
    try {
      const material = db.prepare(
        'SELECT * FROM materiales_catalogo WHERE nombre = ? COLLATE NOCASE'
      ).get(req.params.nombre)
      if (!material) return res.status(404).json({ error: 'Material no encontrado' })
      res.json(material)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/materiales — agrega un material nuevo al catálogo
  router.post('/', (req, res) => {
    const { nombre, categoria, producto } = req.body
    if (!nombre || !categoria) {
      return res.status(400).json({ error: 'nombre y categoria son obligatorios' })
    }
    try {
      const info = db.prepare(
        'INSERT OR IGNORE INTO materiales_catalogo (nombre, categoria, producto) VALUES (?, ?, ?)'
      ).run(nombre.trim(), categoria.trim(), producto?.trim() ?? '')

      if (info.changes === 0) {
        // Ya existía: devolvemos el existente
        const existente = db.prepare('SELECT * FROM materiales_catalogo WHERE nombre = ? COLLATE NOCASE').get(nombre)
        return res.status(200).json(existente)
      }
      res.status(201).json({ id: info.lastInsertRowid, nombre, categoria, producto: producto ?? '' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
