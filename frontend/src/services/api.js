/**
 * api.js
 * Capa de servicio para comunicarse con el backend Node.js + Express.
 * Soporta modo local/mock (localStorage) y llamadas al backend SQLite (/api).
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
  } catch {}
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
  const deListas = getListas().flatMap(l => (l.materiales || []).map(m => m.material))
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
// Mock data inicial (5 listas alineadas con los tests y el nuevo modelo)
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

// Convierte las compras del modelo anterior en listas
function migrarCompras(compras) {
  const grupos = new Map()
  compras.forEach(c => {
    const clave = `${c.proveedor}|${c.fecha}`
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        id: grupos.size + 1,
        proveedor: c.proveedor,
        fecha: c.fecha,
        categoria: 'Materia Prima',
        materiales: [],
      })
    }
    const item = {
      material: c.material || c.producto,
      cantidad: c.cantidad,
      unidad:   c.unidad,
      monto:    c.monto !== undefined ? c.monto : c.precio,
      producto: c.productoDestino || '',
    }
    grupos.get(clave).materiales.push(item)
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

  const res = {
    ...lista,
    categoria:  lista.categoria || 'Materia Prima',
    materiales: mat,
    // compatibilidad para código/tests que lean productos:
    productos:  mat.map(m => ({ ...m, producto: m.material, precio: m.monto })),
  }
  return res
}

// Helpers para localStorage
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
  return listas.length ? Math.max(...listas.map(l => l.id)) + 1 : 1
}

function normalizar({ proveedor, fecha, categoria, materiales, productos }) {
  const items = materiales || productos || []
  const mat = items.map(m => ({
    material:  (m.material ?? m.producto ?? '').trim(),
    cantidad:  parseFloat(m.cantidad) || 1,
    unidad:    m.unidad || 'unidad',
    monto:     parseFloat(m.monto !== undefined ? m.monto : m.precio) || 0,
    producto:  (m.productoDestino ?? m.producto ?? '').trim(),
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
  return [...new Set(getListas().map(l => l.proveedor))].filter(Boolean).sort()
}

// ---------------------------------------------------------------------------
// CRUD de listas de compra
// ---------------------------------------------------------------------------

export async function fetchListas(filters = {}) {
  // Intentar backend si está disponible
  try {
    const params = new URLSearchParams()
    if (filters.proveedor) params.set('proveedor', filters.proveedor)
    if (filters.material || filters.producto) params.set('material', filters.material || filters.producto)
    if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde)
    if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta)

    const res = await fetch(`${BASE_URL}/ingresos?${params}`).catch(() => null)
    if (res && res.ok) {
      const filas = await res.json()
      // Agrupar filas planas en compras
      const comprasMap = new Map()
      filas.forEach(f => {
        const clave = `${f.proveedor}|${f.fecha}|${f.categoria}`
        if (!comprasMap.has(clave)) {
          comprasMap.set(clave, {
            id: f.id,
            proveedor: f.proveedor,
            fecha: f.fecha,
            categoria: f.categoria,
            materiales: [],
          })
        }
        comprasMap.get(clave).materiales.push({
          id: f.id,
          material: f.material,
          cantidad: f.cantidad,
          monto: f.monto,
          producto: f.producto || '',
        })
      })
      if (comprasMap.size > 0) {
        return [...comprasMap.values()].map(enriquecerLista)
      }
    }
  } catch {}

  // Fallback a almacenamiento local mock
  await delay(200)
  let listas = getListas()
  const contiene = (texto, busqueda) => (texto || '').toLowerCase().includes(busqueda.toLowerCase())
  if (filters.proveedor) listas = listas.filter(l => contiene(l.proveedor, filters.proveedor))
  if (filters.material || filters.producto) {
    const term = filters.material || filters.producto
    listas = listas.filter(l => (l.materiales || []).some(m => contiene(m.material, term)))
  }
  if (filters.fechaDesde) listas = listas.filter(l => l.fecha >= filters.fechaDesde)
  if (filters.fechaHasta) listas = listas.filter(l => l.fecha <= filters.fechaHasta)
  return listas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
}

export async function guardarLista(lista) {
  // Intentar backend
  try {
    const res = await fetch(`${BASE_URL}/ingresos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proveedor: lista.proveedor,
        fecha: lista.fecha,
        categoria: lista.categoria,
        materiales: (lista.materiales || lista.productos || []).map(m => ({
          material: m.material || m.producto,
          cantidad: m.cantidad,
          monto: m.monto !== undefined ? m.monto : m.precio,
          producto: m.productoDestino || m.producto || '',
        })),
      }),
    }).catch(() => null)
    if (res && res.ok) {
      const data = await res.json()
      // Guardar también copia local
      const listas = getListas()
      const nueva = enriquecerLista({ id: siguienteId(listas), ...normalizar(lista) })
      setListas([...listas, nueva])
      return { id: data[0]?.id || siguienteId(listas), ...nueva }
    }
  } catch {}

  // Fallback / mock
  await delay(200)
  const listas = getListas()
  const nueva = enriquecerLista({ id: siguienteId(listas), ...normalizar(lista) })
  setListas([...listas, nueva])
  return nueva
}

export async function actualizarLista(id, lista) {
  await delay(200)
  const listas = getListas()
  if (!listas.some(l => l.id === id)) throw new Error('La lista no existe')
  const actualizada = enriquecerLista({ id, ...normalizar(lista) })
  setListas(listas.map(l => (l.id === id ? actualizada : l)))
  return actualizada
}

export async function eliminarLista(id) {
  await delay(150)
  setListas(getListas().filter(l => l.id !== id))
}

// ---------------------------------------------------------------------------
// Exportar / Importar (portabilidad entre dispositivos)
// ---------------------------------------------------------------------------

/** Descarga depanas.db o exporta JSON */
export async function exportarDB() {
  try {
    const res = await fetch(`${BASE_URL}/db/exportar`)
    if (res.ok) {
      const blob = await res.blob()
      descargarBlob(blob, 'depanas.db')
      return
    }
  } catch {}
  // Si backend no responde, exportar JSON
  await exportarJSON()
}

/** Sube depanas.db al servidor */
export async function importarDB(archivo) {
  if (archivo.name.endsWith('.db') || archivo.name.endsWith('.sqlite')) {
    const form = new FormData()
    form.append('db', archivo)
    const res = await fetch(`${BASE_URL}/db/importar`, { method: 'POST', body: form })
    if (!res.ok) throw new Error('Error al importar la base de datos')
    return await res.json()
  }
  // Si es JSON
  return await importarJSON(archivo)
}

export async function exportarJSON() {
  try {
    const res = await fetch(`${BASE_URL}/db/exportar-json`).catch(() => null)
    if (res && res.ok) {
      const blob = await res.blob()
      descargarBlob(blob, 'depanas_ingresos.json')
      return
    }
  } catch {}

  const listas = getListas()
  const blob = new Blob([JSON.stringify(listas, null, 2)], { type: 'application/json' })
  descargarBlob(blob, 'depanas_ingresos.json')
}

export async function importarJSON(archivo) {
  const texto = await archivo.text()
  const datos = JSON.parse(texto)
  if (!Array.isArray(datos)) throw new Error('Formato inválido')

  try {
    await fetch(`${BASE_URL}/db/importar-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    }).catch(() => null)
  } catch {}

  setListas(datos.map(enriquecerLista))
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
