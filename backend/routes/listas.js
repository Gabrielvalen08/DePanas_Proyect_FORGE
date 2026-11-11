/**
 * routes/listas.js — /api/compras: compras completas (un proveedor, una fecha y sus artículos).
 * Es lo que usa el frontend. Solo traduce HTTP ↔ DAO: los datos, las reglas y las
 * transacciones viven en dao/compras.js.
 *
 *   GET    /api/compras               → compras, con filtros proveedor/material/fechaDesde/fechaHasta
 *                                        y archivo=activas|archivadas (sin él, todas: Exportar, Cargar)
 *   GET    /api/compras/sugerencias   → { proveedores, categorias, materiales, productos } (catálogo)
 *   GET    /api/compras/:id           → una compra
 *   POST   /api/compras               → crea una compra
 *   PUT    /api/compras/:id           → reemplaza los artículos de una compra
 *   DELETE /api/compras/:id           → elimina la compra completa
 *   POST   /api/compras/archivar      → { ids, archivar } archiva varias compras o las devuelve a la lista
 *   POST   /api/compras/eliminar      → { ids } elimina varias compras de una vez
 */

import { Router } from 'express'
import { comprasDAO } from '../dao/compras.js'
import { catalogoDAO } from '../dao/catalogo.js'
import { responder } from './responder.js'

/** getDb() devuelve la conexión vigente (cambia al importar un .db) */
export function crearRutasListas(getDb) {
  const router = Router()
  const dao = () => comprasDAO(getDb())

  router.get('/', (req, res) => {
    const { proveedor, material, fechaDesde, fechaHasta, archivo } = req.query
    responder(res, () => dao().listar({ proveedor, material, fechaDesde, fechaHasta, archivo }))
  })

  router.get('/sugerencias', (_req, res) => responder(res, () => {
    const { proveedores, categorias, materiales, productos } = catalogoDAO(getDb()).leer()
    return { proveedores, categorias, materiales: materiales.map(m => m.nombre), productos }
  }))

  // Varias compras a la vez (casillas de la Lista de compras y del Archivo). Van antes de /:id
  router.post('/archivar', (req, res) => responder(res, () => dao().archivar(req.body?.ids, req.body?.archivar)))
  router.post('/eliminar', (req, res) => responder(res, () => dao().eliminarVarias(req.body?.ids)))

  router.get('/:id', (req, res) => responder(res, () => dao().obtener(req.params.id)))
  router.post('/', (req, res) => responder(res, () => dao().crear(req.body), 201))
  router.put('/:id', (req, res) => responder(res, () => dao().actualizar(req.params.id, req.body)))
  router.delete('/:id', (req, res) => responder(res, () => dao().eliminar(req.params.id), 204))

  return router
}
