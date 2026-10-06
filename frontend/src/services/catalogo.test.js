import {
  agregarAlCatalogo,
  editarEnCatalogo,
  eliminarDelCatalogo,
  exportarCompras,
  fetchCatalogo,
  fetchListas,
  getAsignacion,
  getCategorias,
  getProveedores,
  guardarLista,
  reiniciarModo,
} from './api'

// Catálogo editable (Configuración) y exportar por rango
beforeEach(() => {
  reiniciarModo()
  localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

describe('catálogo en modo local', () => {
  it('trae el catálogo del Excel + lo de las compras de ejemplo, con cuánto se usa cada cosa', async () => {
    const cat = await fetchCatalogo()
    expect(cat.proveedores).toEqual(expect.arrayContaining(['Selectos', 'MMAG', 'La Colonia']))
    expect(cat.uso.proveedor['súper selectos']).toBe(2)
    expect(cat.uso.categoria['materia prima']).toBeGreaterThan(10)
  })

  it('agregar un material crea su categoría y producto nuevos; no admite repetidos', async () => {
    const r = await agregarAlCatalogo('material', { nombre: 'Harina PAN', categoria: 'Harinas', producto: 'Arepas' })
    expect(r).toMatchObject({ nombre: 'Harina PAN', categoria: 'Harinas', producto: 'Arepas', categoriaNueva: true, productoNuevo: false })
    expect(getAsignacion('harina pan')).toMatchObject({ categoria: 'Harinas', producto: 'Arepas' })
    await expect(agregarAlCatalogo('proveedor', { nombre: 'mmag' })).rejects.toThrow('Ya existe un proveedor llamado «MMAG»')
  })

  it('renombrar un proveedor lo cambia en las compras', async () => {
    const r = await editarEnCatalogo('proveedor', 'Súper Selectos', { nombre: 'Selectos Centro' })
    expect(r).toMatchObject({ anterior: 'Súper Selectos', nombre: 'Selectos Centro', compras: 2 })
    expect(await fetchListas({ proveedor: 'Selectos Centro' })).toHaveLength(2)
    expect(getProveedores()).not.toContain('Súper Selectos')
  })

  it('cambiar la categoría y el producto de un material se aplica a sus compras', async () => {
    await editarEnCatalogo('material', 'Arroz', { nombre: 'Arroz blanco', categoria: 'Granos', producto: 'Arepas' })
    const [lista] = await fetchListas({ material: 'Arroz blanco' })
    expect(lista.materiales.find(m => m.material === 'Arroz blanco')).toMatchObject({ categoria: 'Granos', producto: 'Arepas' })
    expect(getCategorias()).toContain('Granos')
  })

  it('eliminar una categoría deja sin ella a sus materiales, y no vuelve a aparecer', async () => {
    const r = await eliminarDelCatalogo('categoria', 'Bebidas')
    expect(r.materiales).toBeGreaterThan(0)
    expect(getAsignacion('Pepsi').categoria).toBe('')
    reiniciarModo()
    expect(getCategorias()).not.toContain('Bebidas')
  })

  it('una compra con un proveedor nuevo lo registra en el catálogo', async () => {
    await guardarLista({ proveedor: 'Walmart Escalón', fecha: '2026-10-01', materiales: [{ material: 'Sal', cantidad: 1, unidad: 'kg', monto: 1 }] })
    expect(getProveedores()).toContain('Walmart Escalón')
  })
})

describe('catálogo en modo servidor', () => {
  function simularServidor(respuestas) {
    const llamadas = []
    vi.stubGlobal('fetch', vi.fn(async (url, opciones = {}) => {
      const metodo = opciones.method || 'GET'
      const ruta = url.replace('/api', '').split('?')[0]
      llamadas.push({ metodo, ruta, cuerpo: opciones.body ? JSON.parse(opciones.body) : undefined })
      if (ruta === '/health') return Response.json({ ok: true })
      const r = respuestas[`${metodo} ${ruta}`]
      return Response.json(r?.cuerpo ?? { proveedores: [], categorias: [], productos: [], materiales: [], uso: {} }, { status: r?.status ?? 200 })
    }))
    return llamadas
  }

  it('agregar, editar y eliminar van a /api/catalogo y los errores llegan con el mensaje del servidor', async () => {
    const llamadas = simularServidor({
      'POST /catalogo/proveedor': { cuerpo: { nombre: 'La Colonia' } },
      'PUT /catalogo/material/Queso': { cuerpo: { anterior: 'Queso', nombre: 'Queso duro', compras: 3 } },
      'DELETE /catalogo/producto/Salsa': { cuerpo: { nombre: 'Salsa', materiales: 2 } },
      'POST /catalogo/categoria': { status: 409, cuerpo: { error: 'Ya existe una categoría llamada «Bebidas»' } },
    })
    await agregarAlCatalogo('proveedor', { nombre: 'La Colonia' })
    expect((await editarEnCatalogo('material', 'Queso', { nombre: 'Queso duro', categoria: 'Lácteos', producto: 'Tequeños' })).compras).toBe(3)
    expect((await eliminarDelCatalogo('producto', 'Salsa')).materiales).toBe(2)
    await expect(agregarAlCatalogo('categoria', { nombre: 'bebidas' })).rejects.toThrow('Ya existe una categoría llamada «Bebidas»')

    const escrituras = llamadas.filter(l => l.metodo !== 'GET').map(l => `${l.metodo} ${l.ruta}`)
    expect(escrituras).toEqual(['POST /catalogo/proveedor', 'PUT /catalogo/material/Queso', 'DELETE /catalogo/producto/Salsa', 'POST /catalogo/categoria'])
    expect(llamadas.find(l => l.metodo === 'PUT').cuerpo).toEqual({ nombre: 'Queso duro', categoria: 'Lácteos', producto: 'Tequeños' })
    expect(localStorage.getItem('depanas_catalogo')).toBeNull()
  })
})

describe('exportar compras por rango', () => {
  it('descarga solo las compras del rango, con el nombre del rango', async () => {
    const urls = []
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(blob => { urls.push(blob); return 'blob:x' }), revokeObjectURL: vi.fn() })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { urls.push(this.download) })

    const n = await exportarCompras({ desde: '2026-09-29', hasta: '2026-09-29', formato: 'csv' })
    expect(n).toBe(2)
    const [blob, nombre] = urls
    expect(nombre).toBe('depanas_compras_2026-09-29_2026-09-29.csv')
    const texto = await blob.text()
    expect(texto.split('\r\n').filter(Boolean)).toHaveLength(1 + 5) // encabezado + 5 materiales
    clic.mockRestore()
  })

  it('sin compras en el rango avisa en vez de descargar un archivo vacío', async () => {
    await expect(exportarCompras({ desde: '2020-01-01', hasta: '2020-01-31' })).rejects.toThrow('no hay compras en ese rango')
  })
})
