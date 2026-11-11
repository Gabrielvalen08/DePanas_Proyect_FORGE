/**
 * routes/compras.js — /api/ingresos: acceso fila por fila a la tabla `ingresos`.
 * El frontend trabaja con compras completas en /api/compras (routes/listas.js); estas rutas
 * quedan para el acceso directo a las filas. Los datos y las reglas viven en dao/ingresos.js.
 *
 *   GET    /api/ingresos/materiales → lista única de artículos comprados
 *   GET    /api/ingresos            → filas, con filtros proveedor/material/fechaDesde/fechaHasta
 *   POST   /api/ingresos            → { proveedor, fecha, categoria?, materiales } (una compra)
 *   PUT    /api/ingresos/:id        → cambia todos los campos de una fila
 *   DELETE /api/ingresos/:id        → elimina una fila
 */

import { Router } from 'express'
import { ingresosDAO } from '../dao/ingresos.js'
import { responder } from './responder.js'

/** getDb() devuelve la conexión vigente (cambia al importar un .db) */
export function crearRutasCompras(getDb) {
  const router = Router()
  const dao = () => ingresosDAO(getDb())

  router.get('/materiales', (_req, res) => responder(res, () => dao().materiales()))
  router.get('/', (req, res) => {
    const { proveedor, material, fechaDesde, fechaHasta } = req.query
    responder(res, () => dao().listar({ proveedor, material, fechaDesde, fechaHasta }))
  })
  router.post('/', (req, res) => responder(res, () => dao().crear(req.body), 201))
  router.put('/:id', (req, res) => responder(res, () => dao().actualizar(req.params.id, req.body)))
  router.delete('/:id', (req, res) => responder(res, () => dao().eliminar(req.params.id), 204))

  return router
}
