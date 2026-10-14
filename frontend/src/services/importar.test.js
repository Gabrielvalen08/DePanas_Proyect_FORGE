import { fetchListas, importarCompras, leerComprasJSON, reiniciarModo } from './api'
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
it('exportación e importación local conservan todos los atributos y permiten repetir la compra', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
  const datos = await leerComprasJSON({ name: 'compras.JSON', text: async () => comprasAJson([compra]) })
  await importarCompras(datos)
  await importarCompras(datos)
  const listas = await fetchListas()
  expect(listas).toHaveLength(2)
  expect(listas[0].id).not.toBe(listas[1].id)
  const exportadas = JSON.parse(comprasAJson(listas))
  for (const c of exportadas) expect({ ...c, id: compra.id }).toEqual(compra)
})
it('envía compras completas al servidor y propaga sus errores sin escribir datos locales', async () => {
  const fetch = vi.fn(async url => url.endsWith('/health') ? Response.json({ ok: true }) : Response.json({ error: 'No se pudo guardar' }, { status: 500 }))
  vi.stubGlobal('fetch', fetch)
  await expect(importarCompras([compra])).rejects.toThrow('No se pudo guardar')
  expect(JSON.parse(fetch.mock.calls.find(([url]) => url.endsWith('/db/importar-json'))[1].body)).toEqual([compra])
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

