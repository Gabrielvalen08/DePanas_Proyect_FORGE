import {
  actualizarLista,
  eliminarLista,
  fetchListas,
  getProductos,
  getProveedores,
  guardarLista,
  reiniciarModo,
  totalLista,
} from './api'

// El modo (servidor/local) se detecta una vez por carga: cada test empieza de cero
beforeEach(() => reiniciarModo())
afterEach(() => vi.unstubAllGlobals())

describe('api: modo servidor', () => {
  const COMPRA = {
    id: 'c-1', proveedor: 'Walmart', fecha: '2026-10-01', categoria: '',
    materiales: [{ id: 7, material: 'Arroz', cantidad: 5, unidad: 'lb', monto: 4.25, producto: '' }],
  }

  /** Simula el backend: responde según "MÉTODO ruta" y registra las llamadas */
  function simularServidor(respuestas) {
    const llamadas = []
    vi.stubGlobal('fetch', vi.fn(async (url, opciones = {}) => {
      const metodo = opciones.method || 'GET'
      const ruta = url.replace('/api', '').split('?')[0]
      llamadas.push({ metodo, ruta, url, cuerpo: opciones.body ? JSON.parse(opciones.body) : undefined })
      if (ruta === '/health') return Response.json({ ok: true })
      const r = respuestas[`${metodo} ${ruta}`]
      if (!r) return Response.json([])
      return r.status === 204 ? new Response(null, { status: 204 }) : Response.json(r.cuerpo, { status: r.status ?? 200 })
    }))
    return llamadas
  }

  it('lee las compras del backend sin mezclar datos locales', async () => {
    simularServidor({ 'GET /compras': { cuerpo: [COMPRA] } })
    const listas = await fetchListas({ material: 'arroz' })
    expect(listas).toHaveLength(1)
    expect(listas[0].materiales[0]).toMatchObject({ material: 'Arroz', unidad: 'lb', monto: 4.25 })
  })

  it('con el backend vacío devuelve vacío (no los datos de ejemplo)', async () => {
    simularServidor({ 'GET /compras': { cuerpo: [] } })
    expect(await fetchListas()).toEqual([])
  })

  it('guardar, editar y eliminar van al backend con el id de la compra', async () => {
    const llamadas = simularServidor({
      'POST /compras': { status: 201, cuerpo: COMPRA },
      'PUT /compras/c-1': { cuerpo: COMPRA },
      'DELETE /compras/c-1': { status: 204 },
    })
    const lista = { proveedor: 'Walmart', fecha: '2026-10-01', materiales: [{ material: 'Arroz', cantidad: 5, unidad: 'lb', monto: 4.25 }] }

    await guardarLista(lista)
    await actualizarLista('c-1', lista)
    await eliminarLista('c-1')

    const escrituras = llamadas.filter(l => l.metodo !== 'GET')
    expect(escrituras.map(l => `${l.metodo} ${l.ruta}`)).toEqual(['POST /compras', 'PUT /compras/c-1', 'DELETE /compras/c-1'])
    expect(escrituras[0].cuerpo.materiales[0]).toEqual({ material: 'Arroz', cantidad: 5, unidad: 'lb', monto: 4.25, producto: '' })
    expect(localStorage.getItem('depanas_listas')).toBeNull()
  })

  it('si el backend rechaza el guardado, el error llega a la UI (no se guarda en local)', async () => {
    simularServidor({ 'POST /compras': { status: 400, cuerpo: { error: 'Fila 1: el monto debe ser mayor a 0' } } })
    await expect(guardarLista({ proveedor: 'X', fecha: '2026-10-01', materiales: [] }))
      .rejects.toThrow('Fila 1: el monto debe ser mayor a 0')
    expect(localStorage.getItem('depanas_listas')).toBeNull()
  })
})

describe('api: listas de compra (modo local)', () => {
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
