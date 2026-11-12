/**
 * routes/catalogo.js — /api/catalogo: opciones de los buscadores y categoría/productos de cada
 * artículo. Solo traduce HTTP ↔ DAO y decide los permisos que dependen del usuario; los
 * datos, las reglas y las transacciones viven en dao/catalogo.js.
 *
 *   GET    /api/catalogo                    → { proveedores, categorias, productos, fichas, materiales,
 *                                               uso, precios, ivaPorProveedor, proveedoresPorCategoria }
 *   PUT    /api/catalogo/materiales/:nombre → asigna { categoria, productos, proveedor?, nuevo? } a un
 *                                             artículo (lo crea si no existe; usado al registrar compras).
 *                                             Sin catalogo.editar solo se completa lo que le falte (403)
 *   POST   /api/catalogo/:tipo              → agrega { nombre, … }
 *   PUT    /api/catalogo/:tipo/:nombre      → renombra y cambia lo suyo; lo actualiza en las compras
 *   DELETE /api/catalogo/:tipo/:nombre      → quita la opción; las compras conservan su texto
 *   POST   /api/catalogo/:tipo/importar     → carga { filas } de un respaldo (todo o nada)
 *
 * :tipo es proveedor | categoria | material | producto
 */

import { Router } from 'express'
import { catalogoDAO } from '../dao/catalogo.js'
import { cumple } from '../permisos.js'
import { responder } from './responder.js'

export { TIPOS, leerCatalogo } from '../dao/catalogo.js'

/** Crear un proveedor al guardar una categoría pide el mismo permiso que agregarlo en el Catálogo */
const permisosDe = req => ({ puedeCrearProveedor: cumple(req.usuario, { funciones: ['catalogo.agregar'] }) })

export function crearRutasCatalogo(getDb) {
  const router = Router()
  const dao = () => catalogoDAO(getDb())

  router.get('/', (_req, res) => responder(res, () => dao().leer()))

  // Asignar categoría y producto al registrar una compra (formulario del artículo)
  router.put('/materiales/:nombre', (req, res) => responder(res, () =>
    dao().asignarMaterial(req.params.nombre, req.body, { puedeEditar: cumple(req.usuario, { funciones: ['catalogo.editar'] }) })
  ))

  router.post('/:tipo/importar', (req, res) => responder(res, () => dao().importar(req.params.tipo, req.body?.filas)))
  router.post('/:tipo', (req, res) => responder(res, () => dao().agregar(req.params.tipo, req.body, permisosDe(req))))
  router.put('/:tipo/:nombre', (req, res) => responder(res, () =>
    dao().editar(req.params.tipo, req.params.nombre, req.body, permisosDe(req))
  ))
  router.delete('/:tipo/:nombre', (req, res) => responder(res, () => dao().eliminar(req.params.tipo, req.params.nombre)))

  return router
}
