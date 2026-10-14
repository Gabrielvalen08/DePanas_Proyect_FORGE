/** Formato real de exportarCompras: compras completas, sin convertir ni completar datos. */
export function validarComprasJSON(datos) {
  if (!Array.isArray(datos)) throw new Error('Formato inválido: se esperaba una lista de compras exportada por De Panas')
  const texto = v => typeof v === 'string'
  const positivo = v => typeof v === 'number' && Number.isFinite(v) && v > 0
  for (const [i, c] of datos.entries()) {
    const fallo = detalle => { throw new Error(`Compra ${i + 1}: ${detalle}`) }
    if (!c || typeof c !== 'object' || Array.isArray(c)) fallo('estructura inválida')
    if (!(texto(c.id) && c.id.trim()) && !(Number.isSafeInteger(c.id) && c.id > 0)) fallo('identificador inválido')
    if (!texto(c.proveedor) || !c.proveedor.trim()) fallo('falta el proveedor')
    if (!texto(c.fecha) || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) fallo('fecha inválida')
    const fecha = new Date(`${c.fecha}T00:00:00Z`)
    if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== c.fecha) fallo('fecha inválida')
    if (!texto(c.categoria)) fallo('categoría inválida')
    if (!Array.isArray(c.materiales) || !c.materiales.length) fallo('la compra necesita materiales')
    for (const [j, m] of c.materiales.entries()) {
      if (!m || !texto(m.material) || !m.material.trim() || !positivo(m.cantidad) || !positivo(m.monto) ||
          !texto(m.unidad) || !m.unidad.trim() || !texto(m.categoria) || !texto(m.producto)) {
        fallo(`material ${j + 1}: revisa material, cantidad, monto, unidad, categoría y producto`)
      }
    }
    if (!Number.isFinite(c.materiales.reduce((s, m) => s + m.monto, 0))) fallo('total inválido')
  }
  return datos
}
