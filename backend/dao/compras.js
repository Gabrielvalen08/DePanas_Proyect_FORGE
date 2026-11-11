/**
 * dao/compras.js — Acceso a datos de las compras (patrón DAO).
 *
 * Una compra es un proveedor, una fecha y sus artículos. En la base cada artículo es una fila
 * de `ingresos`, y las filas de una misma compra comparten `compra_id`. Este DAO es el único
 * que arma y desarma esa relación: valida, agrupa, escribe en transacción y lanza ErrorDatos
 * (dao/errores.js) cuando algo no se puede.
 *
 *   const dao = comprasDAO(db)
 *   dao.listar({ proveedor, material, fechaDesde, fechaHasta, archivo })
 *   dao.obtener(id) · dao.crear(cuerpo) · dao.actualizar(id, cuerpo) · dao.eliminar(id)
 *   dao.archivar(ids, archivar) · dao.eliminarVarias(ids)
 *   dao.todas() · dao.cargarRespaldo(compras, decisiones)
 */

import { randomUUID } from 'crypto'
import { enTransaccion, registrarCompra } from '../db.js'
import { ivaValido } from '../../shared/iva.js'
import { ACTIVA, ARCHIVADA, ESTADOS_ARCHIVO, VISTAS_ARCHIVO, estaArchivada, fechaLimiteArchivo, hoyLocalISO, validarIds } from '../../shared/archivo.js'
import { resolverCarga } from '../../shared/carga-compras.js'
import { ErrorDatos, noEncontrado, noValido } from './errores.js'

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/
/** Largo máximo de los textos de una compra: frena cuerpos absurdos sin limitar nombres reales */
const MAX_TEXTO = 120

/** La fecha tiene el formato AAAA-MM-DD y además existe (no 2026-13-45 ni 2026-02-30) */
function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !FECHA_ISO.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const d = new Date(Date.UTC(anio, mes - 1, dia))
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
}

const COLUMNAS = 'id, origen_id, compra_categoria, compra_iva, compra_archivo, compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto'

const INSERTAR =
  'INSERT INTO ingresos (compra_id, fecha, material, cantidad, unidad, monto, proveedor, categoria, producto, origen_id, compra_categoria, compra_iva, compra_archivo) ' +
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'

/** Agrupa filas planas de `ingresos` en compras, conservando el orden de llegada */
export function agruparFilas(filas, hoy = hoyLocalISO()) {
  const compras = new Map()
  for (const f of filas) {
    if (!compras.has(f.compra_id)) {
      compras.set(f.compra_id, {
        id: f.compra_id,
        ...(f.origen_id ? { origen_id: f.origen_id } : {}),
        proveedor: f.proveedor,
        fecha: f.fecha,
        categoria: f.compra_categoria ?? f.categoria ?? '',
        iva: f.compra_iva ?? 0,
        archivo: f.compra_archivo ?? null,
        archivada: estaArchivada({ fecha: f.fecha, archivo: f.compra_archivo ?? null }, hoy),
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
 * Valida y normaliza el cuerpo de una compra. Devuelve { compra } o { error } con un mensaje
 * para el usuario (también lo usa el DAO de filas, dao/ingresos.js).
 */
export function validarCompra(cuerpo) {
  const proveedor = typeof cuerpo?.proveedor === 'string' ? cuerpo.proveedor.trim() : ''
  const fecha = cuerpo?.fecha
  const materiales = cuerpo?.materiales

  if (!proveedor) return { error: 'Falta el proveedor' }
  if (proveedor.length > MAX_TEXTO) return { error: `El proveedor es muy largo (máximo ${MAX_TEXTO} caracteres)` }
  if (typeof fecha !== 'string' || !FECHA_ISO.test(fecha)) return { error: 'La fecha debe tener el formato AAAA-MM-DD' }
  if (!fechaValida(fecha)) return { error: 'La fecha no existe' }
  if (!Array.isArray(materiales) || materiales.length === 0) return { error: 'La compra necesita al menos un artículo' }
  const iva = cuerpo.iva ?? 0
  if (!ivaValido(iva)) return { error: 'El IVA debe ser un número mayor o igual a 0' }

  const normalizados = []
  for (const [i, m] of materiales.entries()) {
    const material = typeof m?.material === 'string' ? m.material.trim() : ''
    const cantidad = Number(m?.cantidad)
    const monto = Number(m?.monto)
    if (!material) return { error: `Fila ${i + 1}: falta el artículo` }
    if (material.length > MAX_TEXTO) return { error: `Fila ${i + 1}: el artículo es muy largo (máximo ${MAX_TEXTO} caracteres)` }
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
      iva,
      materiales: normalizados,
    },
  }
}

/** Como validarCompra, pero lanza ErrorDatos 400 */
function compraValida(cuerpo) {
  const { compra, error } = validarCompra(cuerpo)
  if (error) throw noValido(error)
  return compra
}

/** Ids válidos para una acción en lote, como texto (compra_id) */
function idsValidos(ids) {
  const error = validarIds(ids)
  if (error) throw noValido(error)
  return ids.map(String)
}

export function comprasDAO(db) {
  /** Escribe las filas de una compra (y registra en el catálogo lo nuevo). Dentro de una transacción */
  function insertarMateriales(compraId, compra, origenId = null, archivo = null) {
    const insertar = db.prepare(INSERTAR)
    registrarCompra(db, compra)
    for (const m of compra.materiales) {
      // La categoría es de cada material (como en el Excel); la de la compra queda como respaldo
      insertar.run(compraId, compra.fecha, m.material, m.cantidad, m.unidad, m.monto, compra.proveedor, m.categoria || compra.categoria, m.producto, origenId, compra.categoria, compra.iva, archivo)
    }
  }

  function obtener(compraId) {
    const filas = db.prepare(`SELECT ${COLUMNAS} FROM ingresos WHERE compra_id = ? ORDER BY id`).all(compraId)
    return agruparFilas(filas)[0] ?? null
  }

  /** Cuántas compras distintas hay entre esos ids */
  function contar(claves) {
    const marcas = claves.map(() => '?').join(', ')
    return db.prepare(`SELECT COUNT(DISTINCT compra_id) AS n FROM ingresos WHERE compra_id IN (${marcas})`).get(...claves).n
  }

  return {
    /**
     * Compras con filtros; las más recientes primero y, dentro de cada una, los artículos en
     * el orden en que se ingresaron. Con `material`, las compras que contienen ese artículo.
     * archivo: 'activas' (Lista de compras), 'archivadas' (Archivo) o nada (todas).
     */
    listar({ proveedor, material, fechaDesde, fechaHasta, archivo } = {}) {
      if (archivo !== undefined && !VISTAS_ARCHIVO.includes(archivo)) throw noValido('archivo debe ser activas o archivadas')
      // Los filtros eligen compras; luego se traen todas sus filas
      let subconsulta = 'SELECT compra_id FROM ingresos WHERE 1=1'
      const params = []
      if (proveedor) { subconsulta += ' AND proveedor LIKE ?'; params.push(`%${proveedor}%`) }
      if (material) { subconsulta += ' AND material LIKE ?'; params.push(`%${material}%`) }
      if (fechaDesde) { subconsulta += ' AND fecha >= ?'; params.push(fechaDesde) }
      if (fechaHasta) { subconsulta += ' AND fecha <= ?'; params.push(fechaHasta) }
      // Archivo: misma regla que estaArchivada (shared/archivo.js), en SQL para no traer lo que no se muestra.
      // IFNULL: con NULL, NOT (NULL = 'archivada' ...) daría NULL y la compra no saldría en ninguna vista
      const hoy = hoyLocalISO()
      const archivadaSQL = "(IFNULL(compra_archivo, '') = 'archivada' OR (compra_archivo IS NULL AND fecha < ?))"
      if (archivo === 'archivadas') { subconsulta += ` AND ${archivadaSQL}`; params.push(fechaLimiteArchivo(hoy)) }
      if (archivo === 'activas') { subconsulta += ` AND NOT ${archivadaSQL}`; params.push(fechaLimiteArchivo(hoy)) }

      const filas = db.prepare(
        `SELECT ${COLUMNAS}, (SELECT MAX(j.id) FROM ingresos j WHERE j.compra_id = i.compra_id) AS orden_compra ` +
        `FROM ingresos i WHERE compra_id IN (${subconsulta}) ORDER BY fecha DESC, orden_compra DESC, id ASC`
      ).all(...params)
      return agruparFilas(filas, hoy)
    },

    obtener(compraId) {
      const compra = obtener(compraId)
      if (!compra) throw noEncontrado('Compra no encontrada')
      return compra
    },

    /** Crea una compra con todas sus filas en una transacción */
    crear(cuerpo) {
      const compra = compraValida(cuerpo)
      const compraId = randomUUID()
      enTransaccion(db, () => insertarMateriales(compraId, compra))
      return obtener(compraId)
    },

    /** Reemplaza los artículos de una compra. No la saca ni la mete al Archivo */
    actualizar(compraId, cuerpo) {
      const compra = compraValida(cuerpo)
      const existe = obtener(compraId)
      if (!existe) throw noEncontrado('Compra no encontrada')
      enTransaccion(db, () => {
        db.prepare('DELETE FROM ingresos WHERE compra_id = ?').run(compraId)
        insertarMateriales(compraId, compra, existe.origen_id ?? null, existe.archivo ?? null)
      })
      return obtener(compraId)
    },

    eliminar(compraId) {
      const info = db.prepare('DELETE FROM ingresos WHERE compra_id = ?').run(compraId)
      if (Number(info.changes) === 0) throw noEncontrado('Compra no encontrada')
    },

    /** archivar: true las manda al Archivo; false las devuelve a la lista. Todo o nada */
    archivar(ids, archivar) {
      const claves = idsValidos(ids)
      if (typeof archivar !== 'boolean') throw noValido('Falta decir si se archivan o se devuelven')
      const marcas = claves.map(() => '?').join(', ')
      const cambiadas = enTransaccion(db, () => {
        const n = contar(claves)
        db.prepare(`UPDATE ingresos SET compra_archivo = ? WHERE compra_id IN (${marcas})`).run(archivar ? ARCHIVADA : ACTIVA, ...claves)
        return n
      })
      if (cambiadas === 0) throw noEncontrado('No se encontraron las compras elegidas')
      return { cambiadas, archivar }
    },

    /** Elimina varias compras con todos sus artículos. Todo o nada */
    eliminarVarias(ids) {
      const claves = idsValidos(ids)
      const marcas = claves.map(() => '?').join(', ')
      const eliminadas = enTransaccion(db, () => {
        const n = contar(claves)
        db.prepare(`DELETE FROM ingresos WHERE compra_id IN (${marcas})`).run(...claves)
        return n
      })
      if (eliminadas === 0) throw noEncontrado('No se encontraron las compras elegidas')
      return { eliminadas }
    },

    /** Todas las compras, agrupadas (respaldo JSON) */
    todas() {
      return agruparFilas(db.prepare('SELECT * FROM ingresos ORDER BY fecha DESC, id DESC').all())
    },

    /**
     * Carga compras de un respaldo JSON (shared/carga-compras.js): cada una es nueva, duplicada
     * (se omite) o modificada (según `decisiones`). Todo o nada.
     */
    cargarRespaldo(compras, decisiones = []) {
      return enTransaccion(db, () => {
        const existentes = agruparFilas(db.prepare('SELECT * FROM ingresos ORDER BY id').all())
        let plan
        try {
          plan = resolverCarga(compras, existentes, decisiones)
        } catch (err) {
          // Respaldo mal formado: 400; la compra guardada cambió mientras se decidía: 409
          throw new ErrorDatos(err.status ?? 400, err.message, err.campo)
        }
        if (!compras.length) throw noValido('Selecciona al menos una compra')
        for (const { compra: c, nueva } of plan.escrituras) {
          const id = nueva ? randomUUID() : c.id
          if (!nueva) db.prepare('DELETE FROM ingresos WHERE compra_id = ?').run(id)
          // Una compra que ya estaba conserva su lugar (lista o Archivo); una nueva queda en automático
          const archivo = !nueva && ESTADOS_ARCHIVO.includes(c.archivo) ? c.archivo : null
          registrarCompra(db, c)
          const insertar = db.prepare(INSERTAR)
          for (const m of c.materiales) {
            insertar.run(id, c.fecha, m.material, m.cantidad, m.unidad, m.monto, c.proveedor, m.categoria, m.producto, c.origen_id, c.categoria, c.iva ?? 0, archivo)
          }
        }
        return plan.resultado
      })
    },
  }
}
