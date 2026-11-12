/**
 * dao/ingresos.js — Acceso fila por fila a la tabla `ingresos` (patrón DAO).
 * Cada fila es un artículo comprado. La app trabaja con compras completas (dao/compras.js);
 * este DAO queda para el acceso directo a las filas (/api/ingresos) y usa las mismas
 * validaciones que una compra.
 *
 *   const dao = ingresosDAO(db)
 *   dao.materiales() · dao.listar(filtros) · dao.crear(cuerpo) · dao.actualizar(id, cuerpo) · dao.eliminar(id)
 */

import { randomUUID } from 'crypto'
import { enTransaccion, registrarCompra } from '../db.js'
import { validarCompra } from './compras.js'
import { noEncontrado, noValido } from './errores.js'

const CAMPOS_FILA = ['fecha', 'material', 'cantidad', 'unidad', 'monto', 'proveedor', 'categoria', 'producto']

export function ingresosDAO(db) {
  return {
    /** Lista única de artículos ya comprados, para autocompletar */
    materiales() {
      // Comillas simples: en SQLite "" es un identificador, no un texto vacío
      return db.prepare("SELECT DISTINCT material FROM ingresos WHERE material != '' ORDER BY material COLLATE NOCASE")
        .all().map(f => f.material)
    },

    /** Filas con filtros opcionales: proveedor, material, fechaDesde, fechaHasta */
    listar({ proveedor, material, fechaDesde, fechaHasta } = {}) {
      let sql = 'SELECT * FROM ingresos WHERE 1=1'
      const params = []
      if (proveedor) { sql += ' AND proveedor LIKE ?'; params.push(`%${proveedor}%`) }
      if (material) { sql += ' AND material LIKE ?'; params.push(`%${material}%`) }
      if (fechaDesde) { sql += ' AND fecha >= ?'; params.push(fechaDesde) }
      if (fechaHasta) { sql += ' AND fecha <= ?'; params.push(fechaHasta) }
      return db.prepare(`${sql} ORDER BY fecha DESC, id DESC`).all(...params)
    },

    /** Todas las filas de una petición forman una misma compra */
    crear(cuerpo) {
      const { compra, error } = validarCompra(cuerpo)
      if (error) throw noValido(error)
      const compraId = randomUUID()
      const insertar = db.prepare(
        'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      return enTransaccion(db, () => {
        registrarCompra(db, compra)
        return compra.materiales.map(m => {
          const info = insertar.run(compraId, compra.fecha, m.material, m.cantidad, m.unidad, m.monto, compra.proveedor, m.categoria || compra.categoria, m.producto)
          return { id: Number(info.lastInsertRowid), compra_id: compraId, fecha: compra.fecha, proveedor: compra.proveedor, categoria: compra.categoria, ...m }
        })
      })
    },

    /** Cambia todos los campos de una fila, con las mismas reglas que una compra completa */
    actualizar(id, cuerpo) {
      const faltantes = ['fecha', 'material', 'cantidad', 'monto', 'proveedor'].filter(c => cuerpo?.[c] === undefined)
      if (faltantes.length > 0) throw noValido(`Faltan campos: ${faltantes.join(', ')}`)
      const { compra, error } = validarCompra({
        proveedor: cuerpo.proveedor,
        fecha: cuerpo.fecha,
        materiales: [{
          material: cuerpo.material, cantidad: cuerpo.cantidad, unidad: cuerpo.unidad,
          monto: cuerpo.monto, categoria: cuerpo.categoria, producto: cuerpo.producto,
        }],
      })
      if (error) throw noValido(error.replace(/^Fila 1: /, ''))
      const m = compra.materiales[0]
      const fila = { ...m, fecha: compra.fecha, proveedor: compra.proveedor, categoria: m.categoria ?? '' }

      const info = enTransaccion(db, () => {
        const resultado = db.prepare(
          'UPDATE ingresos SET fecha=?, material=?, cantidad=?, unidad=?, monto=?, proveedor=?, categoria=?, producto=? WHERE id=?'
        ).run(...CAMPOS_FILA.map(c => fila[c]), id)
        if (Number(resultado.changes) > 0) registrarCompra(db, { proveedor: compra.proveedor, materiales: [m] })
        return resultado
      })
      if (Number(info.changes) === 0) throw noEncontrado('Ingreso no encontrado')
      return db.prepare('SELECT * FROM ingresos WHERE id = ?').get(id)
    },

    eliminar(id) {
      const info = db.prepare('DELETE FROM ingresos WHERE id=?').run(id)
      if (Number(info.changes) === 0) throw noEncontrado('Ingreso no encontrado')
    },
  }
}
