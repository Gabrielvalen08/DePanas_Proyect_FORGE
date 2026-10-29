import {
  crearUsuario,
  fetchRequisitosContrasena,
  guardarRequisitosContrasena,
  detectarModo,
  editarUsuario,
  eliminarUsuario,
  fetchUsuarios,
  iniciarSesion,
  actualizarLista,
  eliminarLista,
  fetchListas,
  asignarMaterial,
  importarCatalogo,
  eliminarDelCatalogo,
  editarEnCatalogo,
  agregarAlCatalogo,
  fetchCatalogo,
  getAsignacion,
  getCategorias,
  getMateriales,
  getMaterialesPorProveedor,
  getCategoriasDeProveedor,
  ordenarMaterialesPorCategoria,
  getProductos,
  getPrecioSugerido,
  getProveedores,
  necesitaAsignacion,
  guardarLista,
  reiniciarModo,
  totalLista,
  EVENTO_SESION_VENCIDA,
  cerrarSesionServidor,
  fijarTokenSesion,
} from './api'
import { FUNCIONES, RUTAS_ASIGNABLES } from '../../../shared/usuarios.js'

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

  it('con sesión, cada pedido lleva el token; un 401 avisa que la sesión venció y cerrar sesión la cierra en el servidor', async () => {
    const llamadas = simularServidor({
      'GET /compras': { cuerpo: [] },
      'DELETE /compras/c-9': { status: 401, cuerpo: { error: 'Tu sesión venció' } },
      'DELETE /sesion': { status: 204 },
    })
    fijarTokenSesion('token-de-prueba')
    await fetchListas()
    const pedido = vi.mocked(fetch).mock.calls.find(([url]) => url.includes('/compras'))
    expect(pedido[1].headers).toMatchObject({ Authorization: 'Bearer token-de-prueba' })

    const aviso = vi.fn()
    window.addEventListener(EVENTO_SESION_VENCIDA, aviso)
    await expect(eliminarLista('c-9')).rejects.toMatchObject({ status: 401 })
    expect(aviso).toHaveBeenCalledTimes(1)
    window.removeEventListener(EVENTO_SESION_VENCIDA, aviso)

    await cerrarSesionServidor()
    expect(llamadas.some(l => l.metodo === 'DELETE' && l.ruta === '/sesion')).toBe(true)
  })

  it('sin sesión un 401 no avisa nada (aún no se entró); demasiados intentos trae los minutos de espera', async () => {
    simularServidor({
      'GET /compras': { status: 401, cuerpo: { error: 'Tu sesión venció' } },
      'POST /sesion': { status: 429, cuerpo: { error: 'Demasiados intentos', minutos: 5 } },
    })
    const aviso = vi.fn()
    window.addEventListener(EVENTO_SESION_VENCIDA, aviso)
    await expect(fetchListas()).rejects.toMatchObject({ status: 401 })
    expect(aviso).not.toHaveBeenCalled()
    window.removeEventListener(EVENTO_SESION_VENCIDA, aviso)
    await expect(iniciarSesion('Cesar_01', 'mala')).rejects.toMatchObject({ status: 429, minutos: 5 })
  })

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
    expect(escrituras[0].cuerpo.materiales[0]).toEqual({ material: 'Arroz', cantidad: 5, unidad: 'lb', monto: 4.25, categoria: '', producto: '' })
    expect(localStorage.getItem('depanas_listas')).toBeNull()
  })

  it('el autocompletado usa el catálogo del servidor (Excel + compras guardadas)', async () => {
    simularServidor({
      'GET /catalogo': {
        cuerpo: {
          proveedores: ['MMAG', 'Selectos', 'Walmart'], categorias: ['Materia Prima'], productos: ['Todos'],
          materiales: [{ nombre: 'Arroz', categoria: 'Materia Prima', producto: 'Todos' }, { nombre: 'Jamón de Pavo', categoria: '', producto: '' }],
        },
      },
    })
    await fetchListas()
    await vi.waitFor(() => expect(getProveedores()).toContain('Walmart'))
    expect(getProveedores()).toContain('MMAG')
    expect(getMateriales()).toEqual(expect.arrayContaining(['Arroz', 'Jamón de Pavo']))
    expect(getProveedores()).not.toContain('La Colonia') // los datos de ejemplo locales no se mezclan
  })

  it('filtra los artículos por las categorías del proveedor y manda el proveedor al asignar un artículo', async () => {
    const llamadas = simularServidor({
      'GET /catalogo': {
        cuerpo: {
          proveedores: ['Pepsi', 'Selectos'], categorias: ['Bebidas', 'Materia Prima'], productos: ['Todos'],
          materiales: [{ nombre: 'Arroz', categoria: 'Materia Prima', producto: 'Todos' }, { nombre: 'Agua', categoria: 'Bebidas', producto: 'Todos' }],
          proveedoresPorCategoria: { bebidas: ['Pepsi'] },
        },
      },
      'PUT /catalogo/materiales/Cafe': {
        cuerpo: {
          material: { nombre: 'Cafe', categoria: 'Materia Prima', producto: 'Todos', productos: ['Todos'] },
          materialNuevo: true, categoriaNueva: false, productoNuevo: false, productosNuevos: [], proveedor: 'Pepsi', proveedorVinculado: true,
        },
      },
    })
    await fetchCatalogo()
    expect(getMaterialesPorProveedor('pepsi')).toEqual(['Agua'])
    expect(getMaterialesPorProveedor('Selectos')).toEqual(['Arroz', 'Agua']) // sin categorías: todos, Materia Prima primero

    await asignarMaterial('Cafe', { categoria: 'Materia Prima', productos: ['Todos'], proveedor: 'Pepsi' })
    expect(llamadas.find(l => l.metodo === 'PUT').cuerpo).toEqual({ categoria: 'Materia Prima', productos: ['Todos'], proveedor: 'Pepsi' })
    // Se aplica en el acto, sin esperar la recarga
    expect(getCategoriasDeProveedor('Pepsi')).toEqual(['Bebidas', 'Materia Prima'])
  })

  it('sin modo detectado las sugerencias no traen datos locales; al detectar el servidor ya tienen su catálogo', async () => {
    simularServidor({
      'GET /catalogo': {
        cuerpo: { proveedores: ['Pepsi'], categorias: ['Bebidas'], productos: ['Todos'], materiales: [{ nombre: 'Agua', categoria: 'Bebidas', producto: 'Todos' }] },
      },
    })
    // Tras recargar la página nada pidió datos todavía: no se cuelan los de ejemplo del modo local
    expect(getMateriales()).toEqual([])
    expect(getPrecioSugerido('Arroz')).toBeNull()
    expect(await detectarModo()).toBe('servidor')
    expect(getMateriales()).toEqual(['Agua'])
    expect(getMaterialesPorProveedor('Pepsi')).toEqual(['Agua'])
  })

  it('una categoría manda sus proveedores al backend', async () => {
    const llamadas = simularServidor({
      'POST /catalogo/categoria': { cuerpo: { nombre: 'Lácteos', materiales: 0, proveedores: ['Selectos'] } },
      'GET /catalogo': { cuerpo: { proveedores: [], categorias: [], productos: [], materiales: [] } },
    })
    await agregarAlCatalogo('categoria', { nombre: 'Lácteos', materiales: [], proveedores: ['Selectos'] })
    expect(llamadas.find(l => l.metodo === 'POST').cuerpo).toEqual({ nombre: 'Lácteos', materiales: [], proveedores: ['Selectos'] })
  })

  it('el precio sugerido de cada material lo calcula el backend (última compra)', async () => {
    simularServidor({
      'GET /catalogo': {
        cuerpo: {
          proveedores: [], categorias: [], productos: [],
          materiales: [{ nombre: 'Arroz', categoria: 'Materia Prima', producto: 'Todos' }],
          precios: { arroz: { precio: 1.2, unidad: 'bolsa' } },
        },
      },
    })
    await fetchListas()
    await vi.waitFor(() => expect(getPrecioSugerido(' ARROZ ')).toEqual({ precio: 1.2, unidad: 'bolsa' }))
    expect(getPrecioSugerido('Sal')).toBeNull()
  })

  it('asignar categoría y producto va al backend y el formulario lo ve en el acto', async () => {
    const llamadas = simularServidor({
      'GET /catalogo': {
        cuerpo: { proveedores: [], categorias: ['Materia Prima'], productos: ['Todos'], materiales: [{ nombre: 'Queso', categoria: '', producto: '' }] },
      },
      'PUT /catalogo/materiales/Queso': {
        cuerpo: { material: { nombre: 'Queso', categoria: 'Lácteos', producto: 'Tequeños' }, materialNuevo: false, categoriaNueva: true, productoNuevo: true },
      },
    })
    await fetchListas()
    await vi.waitFor(() => expect(getAsignacion('queso').existe).toBe(true))
    expect(necesitaAsignacion('Queso')).toBe(true)

    const resultado = await asignarMaterial('Queso', { categoria: 'Lácteos', producto: 'Tequeños' })
    expect(resultado.categoriaNueva).toBe(true)
    expect(llamadas.find(l => l.metodo === 'PUT').cuerpo).toEqual({ categoria: 'Lácteos', productos: ['Tequeños'] })
    expect(necesitaAsignacion('Queso')).toBe(false)
    expect(getCategorias()).toContain('Lácteos')
    expect(localStorage.getItem('depanas_catalogo')).toBeNull()
  })

  it('cargar un respaldo de una sección va al backend con las filas ya validadas', async () => {
    const llamadas = simularServidor({ 'POST /catalogo/proveedor/importar': { cuerpo: { nuevos: 1, actualizados: 0, omitidos: 0 } } })
    const r = await importarCatalogo('proveedor', [{ nombre: ' La Pulpería ', telefonos: ['7123-4567', ''] }])
    expect(r).toEqual({ nuevos: 1, actualizados: 0, omitidos: 0 })
    expect(llamadas.find(l => l.metodo === 'POST').cuerpo).toEqual({
      filas: [{ nombre: 'La Pulpería', ubicacion: '', telefonos: ['7123-4567'], contactos: [] }],
    })
    expect(localStorage.getItem('depanas_catalogo')).toBeNull()
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

  it('total y opciones del autocompletado: catálogo del Excel + compras locales, sin repetir', async () => {
    await detectarModo()
    expect(totalLista({ productos: [{ precio: 1.2 }, { precio: 4.25 }] })).toBeCloseTo(5.45)
    expect(getProveedores()).toEqual(expect.arrayContaining(['Selectos', 'MMAG', 'Pepsi', 'Desechables Diver.', 'La Colonia']))
    expect(getMateriales()).toEqual(expect.arrayContaining(['Tocino La Rioja', 'Jamón de Pavo', 'Plátano maduro']))
    expect(getCategorias()).toHaveLength(6)
    expect(getProductos()).toContain('Tequeños')
    expect(getMateriales().filter(m => m === 'Cebolla')).toHaveLength(1)
  })
})

describe('api: categoría y producto de cada material (modo local)', () => {
  beforeEach(() => localStorage.clear())

  it('los materiales del Excel ya traen su categoría y producto', async () => {
    await detectarModo()
    expect(getAsignacion('tocino la rioja')).toEqual({
      existe: true, nombre: 'Tocino La Rioja', categoria: 'Materia Prima', producto: 'Cachitos', productos: ['Cachitos'],
    })
    expect(necesitaAsignacion('Tocino La Rioja')).toBe(false)
    expect(necesitaAsignacion('Queso')).toBe(true) // en el Excel no tiene asignación
    expect(necesitaAsignacion('Mr Músculo Antigrasa')).toBe(true) // tiene categoría pero no producto
    expect(necesitaAsignacion('Harina PAN')).toBe(true) // material nuevo
    expect(necesitaAsignacion('')).toBe(false)
  })

  it('un material nuevo se guarda con su categoría y producto, y crea los que no existían', async () => {
    const resultado = await asignarMaterial('Harina PAN', { categoria: 'materia prima', producto: 'Arepas Rellenas' })
    expect(resultado).toEqual({
      material: { nombre: 'Harina PAN', categoria: 'Materia Prima', producto: 'Arepas Rellenas', productos: ['Arepas Rellenas'] },
      materialNuevo: true,
      categoriaNueva: false,
      productoNuevo: true,
      productosNuevos: ['Arepas Rellenas'],
    })
    expect(necesitaAsignacion('harina pan')).toBe(false)
    expect(getMateriales()).toContain('Harina PAN')
    expect(getProductos()).toContain('Arepas Rellenas')
    expect(getCategorias().filter(c => c === 'Materia Prima')).toHaveLength(1)
  })

  it('ordenarMaterialesPorCategoria ordena Materia Prima primero, luego otras categorías y artículos alfabéticamente', () => {
    const lista = [
      { nombre: 'Servilletas', categoria: 'Limpieza' },
      { nombre: 'Harina PAN', categoria: 'Materia Prima' },
      { nombre: 'Queso', categoria: 'Lácteos' },
      { nombre: 'Aceite', categoria: 'Materia Prima' },
      { nombre: 'Caja', categoria: '' },
    ]
    const res = ordenarMaterialesPorCategoria(lista)
    expect(res.map(x => x.nombre)).toEqual([
      'Aceite',
      'Harina PAN',
      'Queso',
      'Servilletas',
      'Caja',
    ])
  })

  it('un catálogo nuevo trae del Excel qué surte cada proveedor: con Pepsi solo salen las bebidas', async () => {
    await detectarModo()
    expect(getCategoriasDeProveedor('Pepsi')).toEqual(['Bebidas'])
    expect(getMaterialesPorProveedor('Pepsi')).toEqual(['Agua', 'Gatorade', 'Lipton', 'Pepsi'])
    expect(getCategoriasDeProveedor('Selectos')).toEqual(['Limpieza', 'Materia Prima', 'Material Común'])
  })

  it('getMaterialesPorProveedor da solo los artículos de las categorías del proveedor; sin categorías, todos', async () => {
    await agregarAlCatalogo('categoria', { nombre: 'Lácteos', materiales: [], proveedores: [] })
    await agregarAlCatalogo('proveedor', { nombre: 'La Lechería' })
    await editarEnCatalogo('categoria', 'Lácteos', { proveedores: ['la lechería'] })
    await editarEnCatalogo('material', 'Queso', { categoria: 'Lácteos', productos: ['Todos'] })
    expect(getCategoriasDeProveedor('La Lechería')).toEqual(['Lácteos'])
    expect(getMaterialesPorProveedor('la lechería')).toEqual(['Queso'])

    const todos = getMaterialesPorProveedor('Proveedor Inexistente')
    expect(todos).toEqual(expect.arrayContaining(['Agua', 'Tocino La Rioja', 'Pepsi', 'Queso']))
    // Ordenados por categoría: Materia Prima primero
    expect(todos.indexOf('Tocino La Rioja')).toBeLessThan(todos.indexOf('Agua'))
  })

  it('proveedores de una categoría: se validan, siguen al renombrar y salen al eliminar', async () => {
    await expect(agregarAlCatalogo('categoria', { nombre: 'Lácteos', proveedores: ['Nadie'] }))
      .rejects.toMatchObject({ campo: 'proveedores', message: 'No existe un proveedor llamado «Nadie»' })
    expect(getCategorias()).not.toContain('Lácteos')

    const r = await agregarAlCatalogo('categoria', { nombre: 'Lácteos', proveedores: ['MMAG', 'selectos'] })
    expect(r.proveedores).toEqual(['MMAG', 'Selectos'])
    await editarEnCatalogo('categoria', 'Lácteos', { nombre: 'Quesos' })
    await editarEnCatalogo('proveedor', 'MMAG', { nombre: 'MMAG SV' })
    expect((await fetchCatalogo()).proveedoresPorCategoria.quesos).toEqual(['MMAG SV', 'Selectos'])
    await eliminarDelCatalogo('proveedor', 'Selectos')
    expect((await fetchCatalogo()).proveedoresPorCategoria.quesos).toEqual(['MMAG SV'])
    await eliminarDelCatalogo('categoria', 'Quesos')
    expect((await fetchCatalogo()).proveedoresPorCategoria.quesos).toBeUndefined()
  })

  it('una compra y un artículo asignado con proveedor ligan la categoría a ese proveedor', async () => {
    await guardarLista({
      proveedor: 'Distribuidora Sol', fecha: '2026-10-01',
      materiales: [{ material: 'Servilletas', cantidad: 1, unidad: 'caja', monto: 3, categoria: 'Desechables', producto: 'Todos' }],
    })
    expect(getCategoriasDeProveedor('Distribuidora Sol')).toEqual(['Desechables'])
    const r = await asignarMaterial('Lejía', { categoria: 'Limpieza', productos: ['Todos'], proveedor: 'distribuidora sol' })
    expect(r).toMatchObject({ proveedor: 'Distribuidora Sol', proveedorVinculado: true })
    expect(getCategoriasDeProveedor('Distribuidora Sol')).toEqual(['Desechables', 'Limpieza'])
  })

  it('cargar categorías suma sus proveedores y omite los que no existen', async () => {
    const r = await importarCatalogo('categoria', [{ nombre: 'Bebidas', articulos: [], proveedores: ['Pepsi', 'Nadie'] }])
    expect(r.omitidos).toBe(1)
    expect(getCategoriasDeProveedor('Pepsi')).toContain('Bebidas')
  })

  it('pide categoría y producto', async () => {
    await expect(asignarMaterial('Sal', { categoria: '', producto: 'Todos' })).rejects.toThrow('Elige una categoría')
    await expect(asignarMaterial('Sal', { categoria: 'Materia Prima', productos: [] })).rejects.toThrow('Elige al menos un producto')
  })

  it('un artículo puede llevar varios productos: se guardan todos y cada uno cuenta en el catálogo', async () => {
    const resultado = await asignarMaterial('Harina PAN', { categoria: 'Materia Prima', productos: ['Arepas', 'Tequeños Fritos'] })
    expect(resultado.material.producto).toBe('Arepas, Tequeños Fritos')
    expect(resultado.productosNuevos).toEqual(['Tequeños Fritos'])
    expect(getAsignacion('harina pan').productos).toEqual(['Arepas', 'Tequeños Fritos'])
    expect(getProductos()).toContain('Tequeños Fritos')

    const cat = await fetchCatalogo()
    expect(cat.uso.producto['tequeños fritos']).toBe(1)
    expect(cat.materiales.find(m => m.nombre === 'Harina PAN').productos).toEqual(['Arepas', 'Tequeños Fritos'])
  })
})

describe('api: ficha del proveedor (modo local)', () => {
  beforeEach(() => localStorage.clear())

  it('guarda ubicación, teléfonos y contactos; la conserva al renombrar y la quita al eliminar', async () => {
    const ficha = { ubicacion: 'Santa Tecla', telefonos: ['7123-4567', ''], contactos: [{ nombre: 'Ana', telefono: '' }] }
    const creado = await agregarAlCatalogo('proveedor', { nombre: 'La Pulpería', ficha })
    expect(creado.ficha).toEqual({ ubicacion: 'Santa Tecla', telefonos: ['7123-4567'], contactos: [{ nombre: 'Ana', telefono: '' }] })

    await editarEnCatalogo('proveedor', 'La Pulpería', { nombre: 'Pulpería Don Juan' })
    let cat = await fetchCatalogo()
    expect(cat.fichas['la pulpería']).toBeUndefined()
    expect(cat.fichas['pulpería don juan'].telefonos).toEqual(['7123-4567'])

    await eliminarDelCatalogo('proveedor', 'Pulpería Don Juan')
    cat = await fetchCatalogo()
    expect(cat.fichas['pulpería don juan']).toBeUndefined()
  })

  it('un teléfono inválido se rechaza con el campo que hay que corregir', async () => {
    await expect(agregarAlCatalogo('proveedor', { nombre: 'X', ficha: { telefonos: ['7123-4567', 'hola'] } }))
      .rejects.toMatchObject({ campo: 'telefono-1' })
    expect((await fetchCatalogo()).proveedores).not.toContain('X')
  })
})

describe('api: cargar un respaldo de una sección del Catálogo (modo local)', () => {
  beforeEach(() => localStorage.clear())

  it('crea lo que falta, actualiza lo que existe, suma productos y omite artículos que no existen', async () => {
    expect(await importarCatalogo('proveedor', [{ nombre: 'La Pulpería', ubicacion: 'Santa Tecla', telefonos: [], contactos: [] }]))
      .toEqual({ nuevos: 1, actualizados: 0, omitidos: 0 })
    expect((await fetchCatalogo()).fichas['la pulpería'].ubicacion).toBe('Santa Tecla')

    expect(await importarCatalogo('material', [{ nombre: 'Tocino La Rioja', categoria: 'Carnes', productos: ['Tequeños'] }]))
      .toEqual({ nuevos: 0, actualizados: 1, omitidos: 0 })
    expect(getAsignacion('Tocino La Rioja')).toMatchObject({ categoria: 'Carnes', productos: ['Cachitos', 'Tequeños'] })

    expect(await importarCatalogo('producto', [{ nombre: 'Pastelitos', articulos: ['Tocino La Rioja', 'No existe'] }]))
      .toEqual({ nuevos: 1, actualizados: 0, omitidos: 1 })
    expect(getAsignacion('Tocino La Rioja').productos).toEqual(['Cachitos', 'Tequeños', 'Pastelitos'])
  })

  it('un respaldo de otra sección o con filas inválidas se rechaza sin cambiar nada', async () => {
    await expect(importarCatalogo('material', [{ nombre: 'Sal', categoria: '' }])).rejects.toThrow('Fila 1: falta la categoría')
    expect(getAsignacion('Sal').existe).toBe(false)
  })
})

describe('api: precio sugerido (modo local)', () => {
  beforeEach(() => localStorage.clear())

  const comprar = (fecha, cantidad, monto, unidad = 'bolsa') => guardarLista({
    proveedor: 'Selectos', fecha,
    materiales: [{ material: 'Quesillo', cantidad, unidad, monto, categoria: 'Materia Prima', producto: 'Todos' }],
  })

  it('sugiere el precio unitario de la última compra y lo actualiza con una más reciente', async () => {
    expect(getPrecioSugerido('Quesillo')).toBeNull()

    await comprar('2026-10-01', 5, 5)
    expect(getPrecioSugerido('quesillo')).toEqual({ precio: 1, unidad: 'bolsa' })

    await comprar('2026-10-08', 5, 6)
    expect(getPrecioSugerido('quesillo')).toEqual({ precio: 1.2, unidad: 'bolsa' })
  })

  it('una compra más antigua registrada después no pisa el precio más reciente', async () => {
    await comprar('2026-10-08', 5, 6)
    await comprar('2026-09-01', 2, 1)
    expect(getPrecioSugerido('quesillo').precio).toBe(1.2)
  })

  it('redondea los decimales largos y conserva la unidad de esa compra', async () => {
    await comprar('2026-10-09', 3, 1, 'kg')
    expect(getPrecioSugerido('quesillo')).toEqual({ precio: 0.3333, unidad: 'kg' })
  })

  it('un material sin compras no tiene precio sugerido', () => {
    expect(getPrecioSugerido('Sal')).toBeNull()
    expect(getPrecioSugerido('')).toBeNull()
  })
})

describe('api: usuarios (modo servidor)', () => {
  function simular(respuestas) {
    const llamadas = []
    vi.stubGlobal('fetch', vi.fn(async (url, opciones = {}) => {
      const metodo = opciones.method || 'GET'
      const ruta = url.replace('/api', '')
      llamadas.push({ metodo, ruta, cuerpo: opciones.body ? JSON.parse(opciones.body) : undefined })
      if (ruta === '/health') return Response.json({ ok: true })
      const r = respuestas[`${metodo} ${ruta}`] ?? { cuerpo: {} }
      return Response.json(r.cuerpo, { status: r.status ?? 200 })
    }))
    return llamadas
  }
  const MARTA = { usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: ['/'] }

  it('inicia sesión y gestiona usuarios en el backend, sin guardar nada en localStorage', async () => {
    const llamadas = simular({
      'POST /sesion': { cuerpo: MARTA },
      'GET /usuarios': { cuerpo: [MARTA] },
      'POST /usuarios': { status: 201, cuerpo: MARTA },
      'PUT /usuarios/Marta_02': { cuerpo: MARTA },
      'DELETE /usuarios/Marta_02': { cuerpo: { usuario: 'Marta_02' } },
    })
    expect(await iniciarSesion('Marta_02', '5678')).toEqual(MARTA)
    expect(await fetchUsuarios()).toEqual([MARTA])
    await crearUsuario({ usuario: 'Marta_02', nombre: 'Marta', contrasena: '5678', permisos: ['/'] })
    await editarUsuario('Marta_02', { contrasena: 'nueva' })
    expect(await eliminarUsuario('Marta_02')).toEqual({ usuario: 'Marta_02' })

    const escrituras = llamadas.filter(l => l.metodo !== 'GET').map(l => `${l.metodo} ${l.ruta}`)
    expect(escrituras).toEqual(['POST /sesion', 'POST /usuarios', 'PUT /usuarios/Marta_02', 'DELETE /usuarios/Marta_02'])
    expect(localStorage.getItem('depanas_usuarios')).toBeNull()
  })

  it('el error del backend llega con el campo que hay que cambiar', async () => {
    simular({ 'POST /usuarios': { status: 409, cuerpo: { error: 'Esa contraseña ya la usa otro usuario. Elige una diferente', campo: 'contrasena' } } })
    await expect(crearUsuario({ usuario: 'Luis_03' })).rejects.toMatchObject({
      message: 'Esa contraseña ya la usa otro usuario. Elige una diferente', campo: 'contrasena',
    })
  })

  it('los requisitos de contraseña se leen y se guardan en el backend', async () => {
    const REQ = { minimo: 10, mayuscula: true, minuscula: true, numero: false, especial: true }
    const llamadas = simular({ 'GET /requisitos-contrasena': { cuerpo: REQ }, 'PUT /requisitos-contrasena': { cuerpo: REQ } })
    expect(await fetchRequisitosContrasena()).toEqual(REQ)
    expect(await guardarRequisitosContrasena(REQ)).toEqual(REQ)
    expect(llamadas.find(l => l.metodo === 'PUT')).toMatchObject({ ruta: '/requisitos-contrasena', cuerpo: REQ })
    expect(localStorage.getItem('depanas_requisitos_contrasena')).toBeNull()
  })

  it('una contraseña incorrecta rechaza el inicio de sesión', async () => {
    simular({ 'POST /sesion': { status: 401, cuerpo: { error: 'Usuario o contraseña incorrectos' } } })
    await expect(iniciarSesion('Cesar_01', '0000')).rejects.toThrow('Usuario o contraseña incorrectos')
  })
})

describe('api: usuarios (modo local)', () => {
  const NUEVO = { usuario: 'Luis_03', nombre: 'Luis', contrasena: 'Arepa#99', rol: 'operador', permisos: ['/compras', '/'] }

  it('trae a Cesar_01 (administrador) y a Marta_02 (operadora) con sus funciones', async () => {
    expect(await fetchUsuarios()).toEqual([
      { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'], funciones: ['*'] },
      { usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: RUTAS_ASIGNABLES, funciones: FUNCIONES },
    ])
    expect(await iniciarSesion('cesar_01', 'DePanas#2026')).toMatchObject({ usuario: 'Cesar_01', rol: 'admin' })
    await expect(iniciarSesion('Cesar_01', '1234')).rejects.toThrow()
    await expect(iniciarSesion('Cesar_01', '5678')).rejects.toThrow()
  })

  it('un navegador con la contraseña anterior de César (1234) pasa a la nueva', async () => {
    const anterior = 'pbkdf2$100000$5a43060896bd80a84a7d4224a028b545$c19cba8f54fc5c6afa5638a7ac9be25b870d6a132d9a64f6f96f597121b3d54e'
    localStorage.setItem('depanas_usuarios', JSON.stringify([
      { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'], contrasena: anterior },
    ]))
    await expect(iniciarSesion('Cesar_01', '1234')).rejects.toThrow()
    expect(await iniciarSesion('Cesar_01', 'DePanas#2026')).toMatchObject({ usuario: 'Cesar_01' })
  })

  it('crea un usuario con el rol que se pide (nunca administrador) y guarda solo el hash de su contraseña', async () => {
    await expect(crearUsuario({ ...NUEVO, rol: 'admin' })).rejects.toMatchObject({ campo: 'rol' })
    expect(await crearUsuario(NUEVO)).toEqual({
      usuario: 'Luis_03', nombre: 'Luis', rol: 'operador', permisos: ['/', '/compras'], funciones: ['compras.editar', 'compras.eliminar'],
    })
    const guardado = localStorage.getItem('depanas_usuarios')
    expect(guardado).not.toContain('Arepa#99')
    expect(guardado).toContain('pbkdf2$')
    expect(await iniciarSesion('Luis_03', 'Arepa#99')).toMatchObject({ usuario: 'Luis_03' })
  })

  it('el empleado trae sus pantallas y funciones: sin Catálogo y sin eliminar compras', async () => {
    const empleado = await crearUsuario({ usuario: 'Ana_04', nombre: 'Ana', contrasena: 'Tequeño#1', rol: 'empleado' })
    expect(empleado).toMatchObject({ rol: 'empleado', permisos: ['/', '/compras'], funciones: ['compras.editar'] })
    const ajustado = await editarUsuario('Ana_04', { permisos: ['/compras', '/catalogo'], funciones: ['compras.eliminar', 'catalogo.agregar'] })
    expect(ajustado).toMatchObject({ permisos: ['/compras', '/catalogo'], funciones: ['compras.eliminar', 'catalogo.agregar'] })
    // Las funciones de una pantalla que ya no tiene se quitan
    expect((await editarUsuario('Ana_04', { permisos: ['/compras'], funciones: ['compras.eliminar', 'catalogo.agregar'] })).funciones)
      .toEqual(['compras.eliminar'])
  })

  it('la contraseña nueva cumple los requisitos, que el administrador puede cambiar', async () => {
    expect(await fetchRequisitosContrasena()).toEqual({ minimo: 8, mayuscula: true, minuscula: true, numero: true, especial: true })
    await expect(crearUsuario({ ...NUEVO, contrasena: 'arepa#99' })).rejects.toMatchObject({ campo: 'contrasena', message: /mayúscula/ })
    await expect(editarUsuario('Marta_02', { contrasena: '5679' })).rejects.toMatchObject({ campo: 'contrasena' })

    await expect(guardarRequisitosContrasena({ minimo: 2 })).rejects.toMatchObject({ campo: 'minimo' })
    await guardarRequisitosContrasena({ minimo: 6, mayuscula: false, minuscula: true, numero: true, especial: false })
    expect(await crearUsuario({ ...NUEVO, contrasena: 'arepa9' })).toMatchObject({ usuario: 'Luis_03' })
  })

  it('no repite el usuario y no da el gestor', async () => {
    await expect(crearUsuario({ ...NUEVO, usuario: 'MARTA_02' })).rejects.toMatchObject({ campo: 'usuario' })
    await expect(crearUsuario({ ...NUEVO, permisos: ['/usuarios'] })).rejects.toMatchObject({ campo: 'permisos' })
    await expect(crearUsuario({ ...NUEVO, permisos: [] })).rejects.toMatchObject({ campo: 'permisos' })
    await expect(crearUsuario({ ...NUEVO, funciones: ['compras.inventar'] })).rejects.toMatchObject({ campo: 'funciones' })
    expect(await fetchUsuarios()).toHaveLength(2)
  })

  it('una contraseña que ya usa otro se acepta: no se compara, porque eso revelaría la del otro', async () => {
    expect(await crearUsuario({ ...NUEVO, contrasena: 'DePanas#2026' })).toMatchObject({ usuario: NUEVO.usuario })
    expect(await editarUsuario('Marta_02', { contrasena: 'DePanas#2026' })).toMatchObject({ usuario: 'Marta_02' })
    expect(await iniciarSesion('Marta_02', 'DePanas#2026')).toMatchObject({ usuario: 'Marta_02' })
  })

  it('al entrar, una contraseña guardada con menos iteraciones se recalcula con las actuales', async () => {
    await editarUsuario('Marta_02', { nombre: 'Marta' }) // guarda los usuarios en depanas_usuarios
    // Un hash viejo de 10 iteraciones (en las pruebas el actual usa 1000; la app real, 600 000)
    const sal = new Uint8Array(16).fill(7)
    const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode('5678'), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: 10 }, llave, 256)
    const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
    const usuarios = JSON.parse(localStorage.getItem('depanas_usuarios'))
    usuarios.find(u => u.usuario === 'Marta_02').contrasena = `pbkdf2$10$${hex(sal)}$${hex(bits)}`
    localStorage.setItem('depanas_usuarios', JSON.stringify(usuarios))

    await iniciarSesion('Marta_02', '5678')
    const despues = JSON.parse(localStorage.getItem('depanas_usuarios')).find(u => u.usuario === 'Marta_02')
    expect(despues.contrasena).toMatch(/^pbkdf2\$1000\$/)
    expect(await iniciarSesion('Marta_02', '5678')).toMatchObject({ usuario: 'Marta_02' })
  })

  it('el administrador conserva su rol, todas las pantallas y funciones, y no se elimina', async () => {
    expect(await editarUsuario('Cesar_01', { permisos: ['/'], funciones: [], rol: 'empleado' }))
      .toMatchObject({ rol: 'admin', permisos: ['*'], funciones: ['*'] })
    await expect(eliminarUsuario('Cesar_01')).rejects.toThrow('El administrador no se puede eliminar')
    expect(await eliminarUsuario('marta_02')).toEqual({ usuario: 'Marta_02' })
    await expect(iniciarSesion('Marta_02', '5678')).rejects.toThrow()
  })
})
