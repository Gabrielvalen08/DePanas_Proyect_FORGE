import {
  actualizarLista,
  eliminarLista,
  fetchListas,
  getProductos,
  getProveedores,
  guardarLista,
  totalLista,
} from './api'

describe('api: listas de compra', () => {
  it('devuelve las listas mock, más recientes primero', async () => {
    const listas = await fetchListas()
    expect(listas).toHaveLength(5)
    expect(listas[0].fecha).toBe('2026-09-30')
  })

  it('filtra por producto contenido en la lista', async () => {
    const listas = await fetchListas({ producto: 'arroz' })
    expect(listas).toHaveLength(1)
    expect(listas[0].proveedor).toBe('Súper Selectos')
  })

  it('filtra por proveedor y rango de fechas', async () => {
    expect(await fetchListas({ proveedor: 'selectos' })).toHaveLength(2)
    expect(await fetchListas({ fechaDesde: '2026-09-29', fechaHasta: '2026-09-29' })).toHaveLength(2)
  })

  it('guarda una lista nueva con números normalizados', async () => {
    const nueva = await guardarLista({
      proveedor: '  Walmart ',
      fecha: '2026-10-01',
      productos: [{ producto: 'Sal', cantidad: '2', unidad: 'kg', precio: '1.5' }],
    })
    expect(nueva).toMatchObject({ proveedor: 'Walmart', productos: [{ cantidad: 2, precio: 1.5 }] })
    expect(await fetchListas()).toHaveLength(6)
  })

  it('actualiza y elimina una lista', async () => {
    await actualizarLista(2, {
      proveedor: 'Walmart',
      fecha: '2026-09-28',
      productos: [{ producto: 'Aceite vegetal', cantidad: 2, unidad: 'galon', precio: 17.5 }],
    })
    const [editada] = await fetchListas({ proveedor: 'walmart' })
    expect(editada.productos[0].precio).toBe(17.5)

    await eliminarLista(2)
    expect(await fetchListas({ proveedor: 'walmart' })).toHaveLength(0)
  })

  it('migra una sola vez las compras del modelo anterior agrupando por proveedor y fecha', async () => {
    localStorage.setItem('depanas_compras', JSON.stringify([
      { id: 1, proveedor: 'A', producto: 'X', cantidad: 1, unidad: 'lb', precio: 2, fecha: '2026-01-01' },
      { id: 2, proveedor: 'A', producto: 'Y', cantidad: 1, unidad: 'lb', precio: 3, fecha: '2026-01-01' },
      { id: 3, proveedor: 'B', producto: 'Z', cantidad: 1, unidad: 'lb', precio: 4, fecha: '2026-01-02' },
    ]))
    const listas = await fetchListas()
    expect(listas).toHaveLength(2)
    expect(listas.find(l => l.proveedor === 'A').productos).toHaveLength(2)
    expect(localStorage.getItem('depanas_compras')).toBeNull()
  })

  it('total, proveedores y productos para el autocompletado', () => {
    expect(totalLista({ productos: [{ precio: 1.2 }, { precio: 4.25 }] })).toBeCloseTo(5.45)
    expect(getProveedores()).toContain('La Colonia')
    expect(getProductos()).toContain('Plátano maduro')
  })
})
