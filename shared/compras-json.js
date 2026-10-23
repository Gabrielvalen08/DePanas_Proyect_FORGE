const recortar = v => (typeof v === 'string' ? v.trim() : v)

/** Copia con los textos sin espacios al inicio ni al final (" MMAG " es "MMAG", como al guardar a mano) */
function recortarCompra(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return c
  const copia = { ...c }
  for (const campo of ['id', 'origen_id', 'proveedor', 'fecha', 'categoria']) {
    if (campo in copia) copia[campo] = recortar(copia[campo])
  }
  if (Array.isArray(c.materiales)) {
    copia.materiales = c.materiales.map(m => {
      if (!m || typeof m !== 'object') return m
      const material = { ...m }
      for (const campo of ['material', 'unidad', 'categoria', 'producto']) {
        if (campo in material) material[campo] = recortar(material[campo])
      }
      return material
    })
  }
  return copia
}

/**
 * Formato real de exportarCompras: compras completas, sin completar datos.
 * Devuelve una copia con los textos recortados; usa siempre lo que devuelve.
 */
export function validarComprasJSON(entrada) {
  if (!Array.isArray(entrada)) throw new Error('Formato inválido: se esperaba una lista de compras exportada por De Panas')
  const datos = entrada.map(recortarCompra)
  const texto = v => typeof v === 'string'
  const positivo = v => typeof v === 'number' && Number.isFinite(v) && v > 0
  for (const [i, c] of datos.entries()) {
    const fallo = detalle => { throw new Error(`Compra ${i + 1}: ${detalle}`) }
    if (!c || typeof c !== 'object' || Array.isArray(c)) fallo('estructura inválida')
    if (!(texto(c.id) && c.id.trim()) && !(Number.isSafeInteger(c.id) && c.id > 0)) fallo('identificador inválido')
    if (c.origen_id !== undefined && (!texto(c.origen_id) || !c.origen_id.trim())) fallo('identificador original inválido')
    if (!texto(c.proveedor) || !c.proveedor.trim()) fallo('falta el proveedor')
    if (!texto(c.fecha) || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) fallo('fecha inválida')
    const fecha = new Date(`${c.fecha}T00:00:00Z`)
    if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== c.fecha) fallo('fecha inválida')
    if (!texto(c.categoria)) fallo('categoría inválida')
    if (!Array.isArray(c.materiales) || !c.materiales.length) fallo('la compra necesita artículos')
    for (const [j, m] of c.materiales.entries()) {
      if (!m || !texto(m.material) || !m.material.trim() || !positivo(m.cantidad) || !positivo(m.monto) ||
          !texto(m.unidad) || !m.unidad.trim() || !texto(m.categoria) || !texto(m.producto)) {
        fallo(`artículo ${j + 1}: revisa artículo, cantidad, monto, unidad, categoría y producto`)
      }
    }
    if (!Number.isFinite(c.materiales.reduce((s, m) => s + m.monto, 0))) fallo('total inválido')
  }
  return datos
}
