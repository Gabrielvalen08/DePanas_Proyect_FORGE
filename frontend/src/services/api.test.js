import {
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
  fetchUsuarios,
  iniciarSesion,
  actualizarLista,
  eliminarLista,
  fetchListas,
  asignarMaterial,
  getAsignacion,
  getCategorias,
  getMateriales,
  getProductos,
  getProveedores,
  necesitaAsignacion,
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
    expect(llamadas.find(l => l.metodo === 'PUT').cuerpo).toEqual({ categoria: 'Lácteos', producto: 'Tequeños' })
    expect(necesitaAsignacion('Queso')).toBe(false)
    expect(getCategorias()).toContain('Lácteos')
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

  it('total y opciones del autocompletado: catálogo del Excel + compras locales, sin repetir', () => {
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

  it('los materiales del Excel ya traen su categoría y producto', () => {
    expect(getAsignacion('tocino la rioja')).toEqual({
      existe: true, nombre: 'Tocino La Rioja', categoria: 'Materia Prima', producto: 'Cachitos',
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
      material: { nombre: 'Harina PAN', categoria: 'Materia Prima', producto: 'Arepas Rellenas' },
      materialNuevo: true,
      categoriaNueva: false,
      productoNuevo: true,
    })
    expect(necesitaAsignacion('harina pan')).toBe(false)
    expect(getMateriales()).toContain('Harina PAN')
    expect(getProductos()).toContain('Arepas Rellenas')
    expect(getCategorias().filter(c => c === 'Materia Prima')).toHaveLength(1)
  })

  it('pide categoría y producto', async () => {
    await expect(asignarMaterial('Sal', { categoria: '', producto: 'Todos' })).rejects.toThrow('Elige una categoría')
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

  it('una contraseña incorrecta rechaza el inicio de sesión', async () => {
    simular({ 'POST /sesion': { status: 401, cuerpo: { error: 'Usuario o contraseña incorrectos' } } })
    await expect(iniciarSesion('Cesar_01', '0000')).rejects.toThrow('Usuario o contraseña incorrectos')
  })
})

describe('api: usuarios (modo local)', () => {
  const NUEVO = { usuario: 'Luis_03', nombre: 'Luis', contrasena: 'arepa99', permisos: ['/compras', '/'] }

  it('trae a Cesar_01 (administrador) y a Marta_02 con todo menos el gestor', async () => {
    expect(await fetchUsuarios()).toEqual([
      { usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'] },
      { usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: ['/', '/compras', '/configuracion', '/exportar', '/cargar'] },
    ])
    expect(await iniciarSesion('cesar_01', '1234')).toMatchObject({ usuario: 'Cesar_01', rol: 'admin' })
    await expect(iniciarSesion('Cesar_01', '5678')).rejects.toThrow()
  })

  it('crea un operador y guarda solo el hash de su contraseña', async () => {
    expect(await crearUsuario({ ...NUEVO, rol: 'admin' })).toEqual({ usuario: 'Luis_03', nombre: 'Luis', rol: 'operador', permisos: ['/', '/compras'] })
    const guardado = localStorage.getItem('depanas_usuarios')
    expect(guardado).not.toContain('arepa99')
    expect(guardado).toContain('pbkdf2$')
    expect(await iniciarSesion('Luis_03', 'arepa99')).toMatchObject({ usuario: 'Luis_03' })
  })

  it('no repite usuario ni contraseña, y no da el gestor', async () => {
    await expect(crearUsuario({ ...NUEVO, usuario: 'MARTA_02' })).rejects.toMatchObject({ campo: 'usuario' })
    await expect(crearUsuario({ ...NUEVO, contrasena: '1234' })).rejects.toMatchObject({ campo: 'contrasena' })
    await expect(crearUsuario({ ...NUEVO, permisos: ['/usuarios'] })).rejects.toMatchObject({ campo: 'permisos' })
    await expect(crearUsuario({ ...NUEVO, permisos: [] })).rejects.toMatchObject({ campo: 'permisos' })
    await expect(editarUsuario('Marta_02', { contrasena: '1234' })).rejects.toMatchObject({ campo: 'contrasena' })
    expect(await fetchUsuarios()).toHaveLength(2)
  })

  it('el administrador conserva todas las pantallas y no se elimina', async () => {
    expect((await editarUsuario('Cesar_01', { permisos: ['/'] })).permisos).toEqual(['*'])
    await expect(eliminarUsuario('Cesar_01')).rejects.toThrow('El administrador no se puede eliminar')
    expect(await eliminarUsuario('marta_02')).toEqual({ usuario: 'Marta_02' })
    await expect(iniciarSesion('Marta_02', '5678')).rejects.toThrow()
  })
})
