/**
 * api.js
 * Capa de servicio para comunicarse con el backend Node.js + Express.
 *
 * Dos modos, que nunca se mezclan (ver detectarModo):
 *  - servidor: si /api/health responde, todo va al backend SQLite (/api/compras)
 *    y sus errores se propagan a la UI.
 *  - local: sin servidor, todo se guarda en localStorage (con datos de ejemplo).
 *
 * Modelo de datos: una lista de compra agrupa varios materiales bajo un
 * mismo proveedor, fecha y categoría.
 *   {
 *     id,
 *     proveedor,
 *     fecha: 'YYYY-MM-DD',
 *     categoria,
 *     materiales: [{ material, cantidad, unidad, monto, producto }]
 *   }
 * `monto` es el total pagado por esa línea; el gasto total = suma de montos.
 * `producto` es el destino final del material (opcional, puede ser vacío).
 */

const BASE_URL = '/api'

const CLAVE_LISTAS          = 'depanas_listas'
const CLAVE_COMPRAS_ANTIGUA = 'depanas_compras'
const CLAVE_CATALOGO        = 'depanas_catalogo'

// ---------------------------------------------------------------------------
// Catálogo inicial de materiales (de Tabla_DePanas.xlsx)
// ---------------------------------------------------------------------------
export const CATALOGO_INICIAL = [
  { nombre: 'Agua',                      categoria: 'Bebidas',        producto: 'Hidratantes' },
  { nombre: 'Ajo Chino',                 categoria: 'Materia Prima',  producto: '' },
  { nombre: 'Alambrina ExtraFuerte',     categoria: 'Materia Prima',  producto: 'Todos' },
  { nombre: 'Anis',                      categoria: 'Materia Prima',  producto: 'Golfeados' },
  { nombre: 'Azucar',                    categoria: 'Materia Prima',  producto: 'Todos' },
  { nombre: 'Bandeja Bisagrada',         categoria: 'Desechables',    producto: '' },
  { nombre: 'Bandeja Kraft',             categoria: 'Desechables',    producto: '' },
  { nombre: 'Bolsa al Vacio 8*12',       categoria: 'Desechables',    producto: 'Tequeños' },
  { nombre: 'Cebolla',                   categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
  { nombre: 'Cebolla blanca',            categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
  { nombre: 'Cilantro',                  categoria: 'Materia Prima',  producto: 'Salsa' },
  { nombre: 'Fosforos',                  categoria: 'Material Común', producto: 'Todos' },
  { nombre: 'Frijol Negro',              categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
  { nombre: 'Gabacha #3 Blanca',         categoria: 'Desechables',    producto: 'Todos' },
  { nombre: 'Gatorade',                  categoria: 'Bebidas',        producto: 'Hidratantes' },
  { nombre: 'Huevos',                    categoria: 'Materia Prima',  producto: 'Panadería' },
  { nombre: 'Jamon Picnic',              categoria: 'Materia Prima',  producto: 'Cachitos' },
  { nombre: 'Jamón de Pavo',             categoria: 'Materia Prima',  producto: 'Cachitos' },
  { nombre: 'Lipton',                    categoria: 'Bebidas',        producto: 'Gaseosas' },
  { nombre: 'Manteca',                   categoria: 'Materia Prima',  producto: 'Panadería' },
  { nombre: 'Mr Músculo Antigrasa',      categoria: 'Limpieza',       producto: '' },
  { nombre: 'Pechugas de Pollo',         categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
  { nombre: 'Pepsi',                     categoria: 'Bebidas',        producto: 'Gaseosas' },
  { nombre: 'Perejil',                   categoria: 'Materia Prima',  producto: 'Salsa' },
  { nombre: 'Pierna Mechada La Rioja',   categoria: 'Materia Prima',  producto: '' },
  { nombre: 'Plátanos',                  categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
  { nombre: 'Plátano maduro',            categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
  { nombre: 'Portion Cup Cuadrada',      categoria: 'Desechables',    producto: '' },
  { nombre: 'Sazón Completa',            categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
  { nombre: 'Tapa Portion Cup Cuadrado', categoria: 'Desechables',    producto: '' },
  { nombre: 'Tapadera Cristal',          categoria: 'Desechables',    producto: '' },
  { nombre: 'Tocino La Rioja',           categoria: 'Materia Prima',  producto: 'Cachitos' },
  { nombre: 'Arroz',                     categoria: 'Materia Prima',  producto: 'Todos' },
  { nombre: 'Queso duro blando',         categoria: 'Materia Prima',  producto: 'Arepas/Empanadas' },
]

/** Devuelve el catálogo completo de materiales */
export function getCatalogoMateriales() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE_CATALOGO) : null
    if (raw) return JSON.parse(raw)
  } catch {
    // Catálogo guardado ilegible: se usa el inicial
  }
  return structuredClone(CATALOGO_INICIAL)
}

/**
 * Dado el nombre exacto de un material, devuelve { categoria, producto } o null.
 */
export function buscarEnCatalogo(nombreMaterial) {
  if (!nombreMaterial) return null
  const catalogo = getCatalogoMateriales()
  const encontrado = catalogo.find(
    m => m.nombre.toLowerCase() === nombreMaterial.trim().toLowerCase()
  )
  return encontrado ? { categoria: encontrado.categoria, producto: encontrado.producto } : null
}

/** Lista de nombres de materiales para autocompletado */
export function getMateriales() {
  const deCatalogo = getCatalogoMateriales().map(m => m.nombre)
  const deListas = listasParaSugerencias().flatMap(l => (l.materiales || []).map(m => m.material))
  return [...new Set([...deCatalogo, ...deListas])].filter(Boolean).sort()
}

/** Alias para mantener compatibilidad */
export const getProductos = getMateriales

/** Lista de categorías únicas para autocompletado */
export function getCategorias() {
  const cats = [...new Set(getCatalogoMateriales().map(m => m.categoria))].filter(Boolean)
  return cats.sort()
}

// ---------------------------------------------------------------------------
// Modo de datos: servidor (SQLite) o local (localStorage)
// ---------------------------------------------------------------------------
// Se decide UNA vez por carga de la página con /api/health. Con servidor, todo
// va al backend y sus errores se propagan (la UI muestra el error); nunca se
// guarda "a escondidas" en localStorage. Sin servidor, todo es local.

let modoPromesa = null
let cacheServidor = null // últimas compras del servidor, para el autocompletado

/** Resuelve 'servidor' o 'local' */
export function detectarModo() {
  if (!modoPromesa) {
    modoPromesa = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/health`)
        const json = res.ok ? await res.json() : null
        if (json?.ok) {
          refrescarCache() // sugerencias del autocompletado
          return 'servidor'
        }
        return 'local'
      } catch {
        return 'local'
      }
    })()
  }
  return modoPromesa
}

/** Solo para tests: vuelve a detectar el modo en la próxima llamada */
export function reiniciarModo() {
  modoPromesa = null
  cacheServidor = null
}

/** fetch al backend; si responde con error, lanza con el mensaje del servidor */
async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${BASE_URL}${ruta}`, opciones)
  if (!res.ok) {
    let mensaje = `Error ${res.status}`
    try {
      mensaje = (await res.json()).error || mensaje
    } catch {
      // La respuesta de error no traía JSON
    }
    throw new Error(mensaje)
  }
  return res
}

async function pedirJSON(ruta, metodo, cuerpo) {
  const res = await pedir(ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
  return res.status === 204 ? null : res.json()
}

async function refrescarCache() {
  try {
    cacheServidor = (await (await pedir('/compras')).json()).map(enriquecerLista)
  } catch {
    // Solo afecta a las sugerencias del autocompletado
  }
}

function listasParaSugerencias() {
  return cacheServidor ?? getListas()
}

/** Lo que se envía al backend para crear o editar una compra */
function cuerpoCompra(lista) {
  const n = normalizar(lista)
  return {
    proveedor: n.proveedor,
    fecha: n.fecha,
    categoria: lista.categoria ?? '',
    materiales: n.materiales.map(({ material, cantidad, unidad, monto, producto }) => ({
      material, cantidad, unidad, monto, producto,
    })),
  }
}

// ---------------------------------------------------------------------------
// Mock data inicial (solo modo local)
// ---------------------------------------------------------------------------
const MOCK_LISTAS = [
  {
    id: 1,
    proveedor: 'Súper Selectos',
    fecha: '2026-09-28',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Pollo entero', cantidad: 3, unidad: 'lb', monto: 12.50, producto: '' },
    ],
  },
  {
    id: 2,
    proveedor: 'Walmart',
    fecha: '2026-09-28',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Aceite vegetal', cantidad: 1, unidad: 'galon', monto: 8.75, producto: '' },
    ],
  },
  {
    id: 3,
    proveedor: 'Súper Selectos',
    fecha: '2026-09-29',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Cebolla blanca',    cantidad: 500, unidad: 'g',    monto: 1.20, producto: 'Arepas/Empanadas' },
      { material: 'Arroz',             cantidad: 5,   unidad: 'lb',   monto: 4.25, producto: 'Todos' },
      { material: 'Queso duro blando', cantidad: 1,   unidad: 'lb',   monto: 3.50, producto: 'Arepas/Empanadas' },
    ],
  },
  {
    id: 4,
    proveedor: 'La Colonia',
    fecha: '2026-09-29',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Tomate',         cantidad: 2, unidad: 'kg',     monto: 3.00, producto: '' },
      { material: 'Plátano maduro', cantidad: 6, unidad: 'unidad', monto: 2.40, producto: 'Arepas/Empanadas' },
    ],
  },
  {
    id: 5,
    proveedor: 'Distribuidora Flores',
    fecha: '2026-09-30',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Camarón mediano',           cantidad: 2, unidad: 'lb',    monto: 18.00, producto: '' },
      { material: 'Harina de maíz precocida',  cantidad: 2, unidad: 'bolsa', monto: 3.90,  producto: 'Arepas/Empanadas' },
    ],
  },
]

// Convierte compras del modelo anterior (o filas planas) en listas
function migrarCompras(compras) {
  const grupos = new Map()
  compras.forEach(c => {
    const clave = c.compra_id || `${c.proveedor}|${c.fecha}`
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        id: grupos.size + 1,
        proveedor: c.proveedor,
        fecha: c.fecha,
        categoria: c.categoria || 'Materia Prima',
        materiales: [],
      })
    }
    grupos.get(clave).materiales.push({
      material: c.material || c.producto,
      cantidad: c.cantidad,
      unidad:   c.unidad,
      monto:    c.monto !== undefined ? c.monto : c.precio,
      producto: c.productoDestino || (c.material ? c.producto || '' : ''),
    })
  })
  return [...grupos.values()].map(enriquecerLista)
}

function enriquecerLista(lista) {
  if (!lista) return lista
  const mat = (lista.materiales || lista.productos || []).map(m => ({
    material: m.material || m.producto || '',
    cantidad: Number(m.cantidad) || 1,
    unidad:   m.unidad || 'unidad',
    monto:    Number(m.monto !== undefined ? m.monto : m.precio) || 0,
    producto: m.productoDestino || (m.material ? (m.producto || '') : ''),
    // retrocompatibilidad:
    precio:   Number(m.monto !== undefined ? m.monto : m.precio) || 0,
  }))

  return {
    ...lista,
    categoria:  lista.categoria || 'Materia Prima',
    materiales: mat,
    // compatibilidad para código/tests que lean productos:
    productos:  mat.map(m => ({ ...m, producto: m.material, precio: m.monto })),
  }
}

// Helpers para localStorage (modo local)
function getListas() {
  try {
    if (typeof localStorage === 'undefined') return MOCK_LISTAS.map(enriquecerLista)
    const data = localStorage.getItem(CLAVE_LISTAS)
    if (data) return JSON.parse(data).map(enriquecerLista)

    // Migración única desde el modelo anterior si existiese
    const antiguas = localStorage.getItem(CLAVE_COMPRAS_ANTIGUA)
    if (antiguas) {
      const listas = migrarCompras(JSON.parse(antiguas))
      setListas(listas)
      localStorage.removeItem(CLAVE_COMPRAS_ANTIGUA)
      return listas
    }
    return structuredClone(MOCK_LISTAS).map(enriquecerLista)
  } catch {
    return structuredClone(MOCK_LISTAS).map(enriquecerLista)
  }
}

function setListas(listas) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CLAVE_LISTAS, JSON.stringify(listas))
  }
}

function siguienteId(listas) {
  return listas.length ? Math.max(...listas.map(l => Number(l.id) || 0)) + 1 : 1
}

function normalizar({ proveedor, fecha, categoria, materiales, productos }) {
  const items = materiales || productos || []
  const mat = items.map(m => ({
    material:  (m.material ?? m.producto ?? '').trim(),
    cantidad:  parseFloat(m.cantidad) || 1,
    unidad:    m.unidad || 'unidad',
    monto:     parseFloat(m.monto !== undefined ? m.monto : m.precio) || 0,
    producto:  (m.material !== undefined ? m.producto ?? '' : m.productoDestino ?? '').trim(),
    precio:    parseFloat(m.monto !== undefined ? m.monto : m.precio) || 0,
  }))

  return {
    proveedor: (proveedor || '').trim(),
    fecha,
    categoria: (categoria || 'Materia Prima').trim(),
    materiales: mat,
    productos: mat.map(m => ({ ...m, producto: m.material, precio: m.monto })),
  }
}

// ---------------------------------------------------------------------------
// Cálculo de gasto total de una lista
// ---------------------------------------------------------------------------
export function totalLista(lista) {
  const items = lista?.materiales || lista?.productos || []
  return items.reduce((suma, m) => suma + Number(m.monto !== undefined ? m.monto : m.precio || 0), 0)
}

// ---------------------------------------------------------------------------
// Listas de proveedores para autocompletado
// ---------------------------------------------------------------------------
export function getProveedores() {
  return [...new Set(listasParaSugerencias().map(l => l.proveedor))].filter(Boolean).sort()
}

// ---------------------------------------------------------------------------
// CRUD de listas de compra
// ---------------------------------------------------------------------------

/** filters: { proveedor, material (o producto), fechaDesde, fechaHasta } */
export async function fetchListas(filters = {}) {
  const material = filters.material || filters.producto

  if ((await detectarModo()) === 'servidor') {
    const params = new URLSearchParams()
    if (filters.proveedor) params.set('proveedor', filters.proveedor)
    if (material) params.set('material', material)
    if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde)
    if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta)
    const compras = (await (await pedir(`/compras?${params}`)).json()).map(enriquecerLista)
    if ([...params].length === 0) cacheServidor = compras
    return compras
  }

  await delay(200)
  let listas = getListas()
  const contiene = (texto, busqueda) => (texto || '').toLowerCase().includes(busqueda.toLowerCase())
  if (filters.proveedor) listas = listas.filter(l => contiene(l.proveedor, filters.proveedor))
  if (material) listas = listas.filter(l => (l.materiales || []).some(m => contiene(m.material, material)))
  if (filters.fechaDesde) listas = listas.filter(l => l.fecha >= filters.fechaDesde)
  if (filters.fechaHasta) listas = listas.filter(l => l.fecha <= filters.fechaHasta)
  return listas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
}

export async function guardarLista(lista) {
  if ((await detectarModo()) === 'servidor') {
    const guardada = enriquecerLista(await pedirJSON('/compras', 'POST', cuerpoCompra(lista)))
    refrescarCache()
    return guardada
  }

  await delay(200)
  const listas = getListas()
  const nueva = enriquecerLista({ id: siguienteId(listas), ...normalizar(lista) })
  setListas([...listas, nueva])
  return nueva
}

export async function actualizarLista(id, lista) {
  if ((await detectarModo()) === 'servidor') {
    const actualizada = enriquecerLista(await pedirJSON(`/compras/${encodeURIComponent(id)}`, 'PUT', cuerpoCompra(lista)))
    refrescarCache()
    return actualizada
  }

  await delay(200)
  const listas = getListas()
  if (!listas.some(l => l.id === id)) throw new Error('La lista no existe')
  const actualizada = enriquecerLista({ id, ...normalizar(lista) })
  setListas(listas.map(l => (l.id === id ? actualizada : l)))
  return actualizada
}

export async function eliminarLista(id) {
  if ((await detectarModo()) === 'servidor') {
    await pedir(`/compras/${encodeURIComponent(id)}`, { method: 'DELETE' })
    refrescarCache()
    return
  }

  await delay(150)
  setListas(getListas().filter(l => l.id !== id))
}

// ---------------------------------------------------------------------------
// Exportar / Importar (portabilidad entre dispositivos)
// ---------------------------------------------------------------------------

/** Con servidor descarga depanas.db; sin servidor, un JSON con las compras locales */
export async function exportarDB() {
  if ((await detectarModo()) === 'servidor') {
    const res = await pedir('/db/exportar')
    descargarBlob(await res.blob(), 'depanas.db')
    return
  }
  await exportarJSON()
}

/**
 * .db/.sqlite: reemplaza la base del servidor (el servidor guarda un respaldo).
 * .json: fusiona las compras con las existentes.
 */
export async function importarDB(archivo) {
  if (/\.(db|sqlite)$/i.test(archivo.name)) {
    if ((await detectarModo()) !== 'servidor') {
      throw new Error('Para cargar un archivo .db el servidor debe estar en ejecución')
    }
    const form = new FormData()
    form.append('db', archivo)
    const resultado = await (await pedir('/db/importar', { method: 'POST', body: form })).json()
    refrescarCache()
    return resultado
  }
  return importarJSON(archivo)
}

export async function exportarJSON() {
  if ((await detectarModo()) === 'servidor') {
    const res = await pedir('/db/exportar-json')
    descargarBlob(await res.blob(), 'depanas_compras.json')
    return
  }
  const blob = new Blob([JSON.stringify(getListas(), null, 2)], { type: 'application/json' })
  descargarBlob(blob, 'depanas_compras.json')
}

/** Acepta compras (con materiales) o filas planas de `ingresos` */
export async function importarJSON(archivo) {
  const datos = JSON.parse(await archivo.text())
  if (!Array.isArray(datos)) throw new Error('Formato inválido: se esperaba una lista de compras')

  if ((await detectarModo()) === 'servidor') {
    const resultado = await pedirJSON('/db/importar-json', 'POST', datos)
    refrescarCache()
    return resultado
  }

  // Local: se fusionan con las listas existentes (no se reemplazan)
  const entrantes = datos.every(d => Array.isArray(d?.materiales)) ? datos.map(enriquecerLista) : migrarCompras(datos)
  const listas = getListas()
  let id = siguienteId(listas)
  setListas([...listas, ...entrantes.map(l => ({ ...l, id: id++ }))])
  return { ok: true, nuevas: entrantes.length }
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  // Revocar en el acto puede cancelar la descarga en algunos navegadores
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
