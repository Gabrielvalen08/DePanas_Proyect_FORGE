import test from 'node:test'
import assert from 'node:assert/strict'
import { analizarCarga, contenidoCompra, resolverCarga } from '../../shared/carga-compras.js'
import { validarComprasJSON } from '../../shared/compras-json.js'

const original = { id: 'local', origen_id: 'origen', proveedor: 'Marta', fecha: '2026-10-13', categoria: '', materiales: [
  { material: 'Harina', cantidad: 2, unidad: 'kg', monto: 6, categoria: 'Materia Prima', producto: 'Arepas' },
  { material: 'Jabón', cantidad: 1, unidad: 'botella', monto: 3, categoria: 'Limpieza', producto: 'Todos' },
] }
const entrante = { ...structuredClone(original), id: 'otro-equipo', proveedor: 'César', fecha: '2026-10-14', materiales: [
  { ...original.materiales[0], cantidad: 4, monto: 12 },
  { material: 'Agua', cantidad: 1, unidad: 'litro', monto: 1, categoria: 'Bebidas', producto: 'Todos' },
] }
const decision = { origen: 'origen', base: contenidoCompra(original), accion: 'combinar', existentes: [1], entrantes: [0], proveedor: 'entrante', fecha: 'existente' }

test('compara por origen e ignora campos internos, no por proveedor y fecha', () => {
  const igual = { ...original, id: 'tercer-equipo', materiales: original.materiales.map(m => ({ ...m, id: 20, precio: m.monto })) }
  assert.equal(analizarCarga([igual], [original])[0].estado, 'identica')
  assert.equal(analizarCarga([{ ...igual, materiales: [...igual.materiales].reverse() }], [original])[0].estado, 'identica')
  assert.equal(analizarCarga([{ ...original, id: 'nativa-distinta', origen_id: undefined }], [original])[0].estado, 'nueva')
})
test('combina exactamente las filas elegidas, con todos sus atributos y metadatos elegidos', () => {
  const plan = resolverCarga([entrante], [original], [decision])
  assert.deepEqual(plan.escrituras[0].compra.materiales, [original.materiales[1], entrante.materiales[0]])
  assert.equal(plan.escrituras[0].compra.proveedor, 'César')
  assert.equal(plan.escrituras[0].compra.fecha, original.fecha)
  assert.equal(plan.escrituras[0].compra.id, original.id)
  assert.equal(plan.resultado.actualizadas, 1)
})
test('descarta o conserva sin cambios sin escribir', () => {
  for (const d of [{ ...decision, accion: 'omitir' }, { ...decision, existentes: [0, 1], entrantes: [], proveedor: 'existente' }]) {
    const plan = resolverCarga([entrante], [original], [d])
    assert.equal(plan.escrituras.length, 0)
    assert.equal(plan.resultado.descartadas, 1)
  }
})
test('rechaza decisiones pendientes, fuera de rango, vacías y comparaciones obsoletas', () => {
  assert.throws(() => resolverCarga([entrante], [original]), /Compara/)
  assert.throws(() => resolverCarga([entrante], [{ ...original, materiales: [...original.materiales].reverse() }], [decision]), /cambió/)
  for (const cambio of [{ existentes: [8] }, { existentes: [0, 0] }, { existentes: [], entrantes: [] }, { base: 'obsoleta' }, { proveedor: 'arbitrario' }]) {
    assert.throws(() => resolverCarga([entrante], [original], [{ ...decision, ...cambio }]))
  }
})
test('rechaza identidades repetidas o ambiguas sin elegir una compra arbitrariamente', () => {
  assert.throws(() => analizarCarga([entrante, entrante], [original]), /repite/)
  assert.throws(() => analizarCarga([entrante], [original, { ...original, id: 'duplicada' }]), /varias compras/)
})
test('recorta los espacios de los textos sin tocar el archivo original', () => {
  const conEspacios = { ...structuredClone(original), proveedor: ' Marta ', categoria: ' ', materiales: original.materiales.map(m => ({ ...m, material: ` ${m.material}  `, unidad: `${m.unidad} ` })) }
  const [limpia] = validarComprasJSON([conEspacios])
  assert.equal(limpia.proveedor, 'Marta')
  assert.equal(limpia.categoria, '')
  assert.deepEqual(limpia.materiales.map(m => [m.material, m.unidad]), [['Harina', 'kg'], ['Jabón', 'botella']])
  assert.equal(conEspacios.proveedor, ' Marta ')
  assert.equal(analizarCarga([conEspacios], [original])[0].estado, 'identica')
})
