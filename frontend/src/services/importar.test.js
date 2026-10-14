import { contenidoCompra } from '../../../shared/carga-compras.js'
import { actualizarLista, analizarCompras, fetchListas, importarCompras, leerComprasJSON, reiniciarModo } from './api'
import { comprasAJson } from '../utils/exportar'
const compra = { id: 'origen', proveedor: 'Distribuidor', fecha: '2026-10-13', categoria: '', materiales: [
  { material: 'Harina', cantidad: 2.5, unidad: 'kg', monto: 4.75, categoria: 'Materia Prima', producto: 'Arepas' },
  { material: 'Jabón', cantidad: 1, unidad: 'botella', monto: 2.25, categoria: '', producto: '' },
] }
beforeEach(() => { localStorage.clear(); localStorage.setItem('depanas_listas', '[]'); reiniciarModo() })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('valida extensión, JSON, fecha real y tipos antes de guardar', async () => {
  await expect(leerComprasJSON({ name: 'datos.csv', text: async () => '[]' })).rejects.toThrow('extensión')
  await expect(leerComprasJSON({ name: 'datos.json', text: async () => '{' })).rejects.toThrow('JSON válido')
  for (const dato of [null, { ...compra, fecha: '2026-02-30' }, { ...compra, materiales: [{ ...compra.materiales[0], monto: '4.75' }] }]) {
    await expect(importarCompras([compra, dato])).rejects.toThrow()
    expect(localStorage.getItem('depanas_listas')).toBe('[]')
  }
})
it('exportación e importación local conservan todos los atributos y omiten una compra repetida', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
  const datos = await leerComprasJSON({ name: 'compras.JSON', text: async () => comprasAJson([compra]) })
  await importarCompras(datos)
  await importarCompras(datos)
  const listas = await fetchListas()
  expect(listas).toHaveLength(1)
  expect(listas[0].origen_id).toBe(compra.id)
  const exportadas = JSON.parse(comprasAJson(listas))
  for (const c of exportadas) expect({ ...c, id: compra.id }).toEqual({ ...compra, origen_id: compra.id })
})
it('envía compras completas al servidor y propaga sus errores sin escribir datos locales', async () => {
  const fetch = vi.fn(async url => url.endsWith('/health') ? Response.json({ ok: true }) : Response.json({ error: 'No se pudo guardar' }, { status: 500 }))
  vi.stubGlobal('fetch', fetch)
  await expect(importarCompras([compra])).rejects.toThrow('No se pudo guardar')
  expect(JSON.parse(fetch.mock.calls.find(([url]) => url.endsWith('/db/importar-json'))[1].body)).toEqual({ compras: [compra], decisiones: [] })
  expect(localStorage.getItem('depanas_listas')).toBe('[]')
})
it('si falla el almacenamiento restaura compras y catálogo', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
  const setItem = Storage.prototype.setItem
  const antes = localStorage.getItem('depanas_catalogo')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (clave, valor) {
    if (clave === 'depanas_listas') throw new Error('Sin espacio')
    return setItem.call(this, clave, valor)
  })
  await expect(importarCompras([compra])).rejects.toThrow('Sin espacio')
  expect(localStorage.getItem('depanas_listas')).toBe('[]')
  expect(localStorage.getItem('depanas_catalogo')).toBe(antes)
})




it('combina una compra modificada localmente y conserva el origen al editar y reexportar', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
  await importarCompras([compra])
  const existente = (await fetchListas())[0]
  const entrante = { ...compra, fecha: '2026-10-14', proveedor: 'Otro', materiales: [{ ...compra.materiales[0], cantidad: 4, monto: 9 }] }
  const vista = await analizarCompras([entrante])
  expect(vista[0].estado).toBe('conflicto')
  await expect(importarCompras([entrante])).rejects.toThrow('Compara')
  const decision = { origen: 'origen', base: contenidoCompra(existente), accion: 'combinar', existentes: [1], entrantes: [0], proveedor: 'entrante', fecha: 'entrante' }
  expect(await importarCompras([entrante], [decision])).toMatchObject({ actualizadas: 1, nuevas: 0 })
  const final = (await fetchListas())[0]
  expect(final.id).toBe(existente.id)
  expect(final.proveedor).toBe('Otro')
  expect(final.fecha).toBe(entrante.fecha)
  expect(final.materiales).toMatchObject([compra.materiales[1], entrante.materiales[0]])
  await expect(importarCompras([entrante], [decision])).rejects.toThrow('cambió')
  await actualizarLista(final.id, final)
  expect((await fetchListas())[0].origen_id).toBe(compra.id)
  expect(JSON.parse(comprasAJson(await fetchListas()))[0].origen_id).toBe(compra.id)
})
it('descarte conserva la compra original y no afecta otras compras nuevas del lote', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
  await importarCompras([compra])
  const existente = (await fetchListas())[0]
  const modificada = { ...compra, proveedor: 'Otro' }
  const nueva = { ...compra, id: 'nueva' }
  const decision = { origen: 'origen', base: contenidoCompra(existente), accion: 'omitir' }
  expect(await importarCompras([modificada, nueva], [decision])).toMatchObject({ nuevas: 1, descartadas: 1 })
  expect((await fetchListas()).find(c => c.origen_id === 'origen').proveedor).toBe(compra.proveedor)
})
it('recorta los espacios al cargar en modo local: " Distribuidor " es el mismo proveedor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
  const conEspacios = { ...compra, proveedor: ' Distribuidor ', materiales: compra.materiales.map(m => ({ ...m, material: ` ${m.material} ` })) }
  const datos = await leerComprasJSON({ name: 'compras.json', text: async () => JSON.stringify([conEspacios]) })
  expect(datos[0].proveedor).toBe('Distribuidor')
  await importarCompras([conEspacios])
  const [guardada] = await fetchListas()
  expect(guardada.proveedor).toBe('Distribuidor')
  expect(guardada.materiales.map(m => m.material)).toEqual(['Harina', 'Jabón'])
  const catalogo = JSON.parse(localStorage.getItem('depanas_catalogo'))
  expect(JSON.stringify(catalogo)).not.toContain(' Distribuidor ')
})
