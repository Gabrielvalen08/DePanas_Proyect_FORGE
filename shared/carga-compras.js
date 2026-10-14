import { validarComprasJSON } from './compras-json.js'

export const identidadCompra = c => String(c.origen_id ?? c.id)

/** Ignora identificadores de filas y campos internos; conserva los datos del negocio. */
export function contenidoCompra(c, ordenar = false) {
  const materiales = c.materiales.map(m => ({
    material: m.material, cantidad: m.cantidad, unidad: m.unidad, monto: m.monto,
    categoria: m.categoria ?? '', producto: m.producto ?? '',
  }))
  // Una exportación que cambia solo el orden de las filas sigue siendo idéntica.
  if (ordenar) materiales.sort((a, b) => {
    const izquierda = JSON.stringify(a)
    const derecha = JSON.stringify(b)
    return izquierda < derecha ? -1 : izquierda > derecha ? 1 : 0
  })
  return JSON.stringify({
    proveedor: c.proveedor, fecha: c.fecha, categoria: c.categoria ?? '',
    materiales,
  })
}

export function analizarCarga(compras, existentes) {
  validarComprasJSON(compras)
  const vistas = new Set()
  const porOrigen = new Map()
  for (const c of existentes) {
    const origen = identidadCompra(c)
    if (!porOrigen.has(origen)) porOrigen.set(origen, c)
    else porOrigen.set(origen, null)
  }
  return compras.map(entrante => {
    const origen = identidadCompra(entrante)
    if (vistas.has(origen)) throw new Error('El archivo repite el identificador de una compra. Revisa el respaldo antes de cargarlo.')
    vistas.add(origen)
    if (porOrigen.has(origen) && porOrigen.get(origen) === null) {
      throw new Error('Hay varias compras guardadas con el mismo identificador original. Revisa esas compras antes de cargar el archivo.')
    }
    const existente = porOrigen.get(origen)
    const estado = !existente ? 'nueva' : contenidoCompra(existente, true) === contenidoCompra(entrante, true) ? 'identica' : 'conflicto'
    return { origen, entrante, existente, estado }
  })
}

function seleccionar(filas, indices) {
  if (!Array.isArray(indices) || new Set(indices).size !== indices.length ||
      indices.some(i => !Number.isInteger(i) || i < 0 || i >= filas.length)) {
    throw new Error('La selección de materiales no es válida.')
  }
  return indices.map(i => ({ ...filas[i] }))
}

/** Las decisiones contienen índices, nunca filas arbitrarias; se revisan de nuevo al guardar. */
export function resolverCarga(compras, existentes, decisiones = []) {
  if (!Array.isArray(decisiones)) throw new Error('Las decisiones de comparación no son válidas.')
  const analisis = analizarCarga(compras, existentes)
  const claves = new Set()
  for (const d of decisiones) {
    if (!d || typeof d.origen !== 'string' || claves.has(d.origen) || !analisis.some(a => a.origen === d.origen)) {
      throw new Error('Las decisiones de comparación no son válidas.')
    }
    claves.add(d.origen)
  }
  const pendientes = analisis.filter(a => a.estado === 'conflicto' && !decisiones.some(d => d.origen === a.origen))
  if (pendientes.length) {
    const error = new Error('Hay compras modificadas. Compara sus materiales antes de guardar.')
    error.status = 409
    throw error
  }
  const resultado = { nuevas: 0, actualizadas: 0, omitidas: 0, descartadas: 0 }
  const escrituras = []
  for (const a of analisis) {
    const d = decisiones.find(d => d.origen === a.origen)
    // Una decisión hecha sobre una compra que cambió desde la comparación nunca se aplica.
    if (d && (!a.existente || d.base !== contenidoCompra(a.existente))) {
      const error = new Error('La compra cambió desde la comparación. Vuelve a revisar el archivo antes de guardar.')
      error.status = 409
      throw error
    }
    if (a.estado === 'identica') { resultado.omitidas++; continue }
    if (a.estado === 'nueva') {
      escrituras.push({ compra: { ...a.entrante, origen_id: a.origen }, nueva: true })
      resultado.nuevas++
      continue
    }
    if (d.accion === 'omitir') { resultado.descartadas++; continue }
    if (d.accion !== 'combinar' || !['existente', 'entrante'].includes(d.proveedor) || !['existente', 'entrante'].includes(d.fecha)) {
      throw new Error('Elige los datos que quieres conservar en la comparación.')
    }
    const materiales = [...seleccionar(a.existente.materiales, d.existentes), ...seleccionar(a.entrante.materiales, d.entrantes)]
    const compra = {
      ...a.existente, origen_id: a.origen,
      proveedor: a[d.proveedor].proveedor, fecha: a[d.fecha].fecha, materiales,
    }
    validarComprasJSON([compra])
    if (contenidoCompra(compra, true) === contenidoCompra(a.existente, true)) resultado.descartadas++
    else { escrituras.push({ compra, nueva: false }); resultado.actualizadas++ }
  }
  return { escrituras, resultado }
}
