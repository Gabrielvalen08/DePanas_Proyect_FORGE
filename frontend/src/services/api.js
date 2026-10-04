/**
 * api.js
 * Capa de servicio para comunicarse con el backend Node.js + Express.
 * Por ahora usa datos mock en localStorage para que el frontend funcione solo.
 * Cuando el backend esté listo, descomentar las llamadas fetch a /api/...
 *
 * Modelo: una lista de compra tiene un proveedor, una fecha y sus productos.
 *   { id, proveedor, fecha: 'YYYY-MM-DD',
 *     productos: [{ producto, cantidad, unidad, precio }] }
 * `precio` es el total pagado por esa línea; el gasto de la lista es la suma.
 */

const BASE_URL = '/api'

const CLAVE_LISTAS = 'depanas_listas'
const CLAVE_COMPRAS_ANTIGUA = 'depanas_compras' // modelo anterior: una fila por producto

// --- Mock data inicial ---
const MOCK_LISTAS = [
  {
    id: 1,
    proveedor: 'Súper Selectos',
    fecha: '2026-09-28',
    productos: [
      { producto: 'Pollo entero', cantidad: 3, unidad: 'lb', precio: 12.50 },
    ],
  },
  {
    id: 2,
    proveedor: 'Walmart',
    fecha: '2026-09-28',
    productos: [
      { producto: 'Aceite vegetal', cantidad: 1, unidad: 'galon', precio: 8.75 },
    ],
  },
  {
    id: 3,
    proveedor: 'Súper Selectos',
    fecha: '2026-09-29',
    productos: [
      { producto: 'Cebolla blanca', cantidad: 500, unidad: 'g', precio: 1.20 },
      { producto: 'Arroz', cantidad: 5, unidad: 'lb', precio: 4.25 },
      { producto: 'Queso duro blando', cantidad: 1, unidad: 'lb', precio: 3.50 },
    ],
  },
  {
    id: 4,
    proveedor: 'La Colonia',
    fecha: '2026-09-29',
    productos: [
      { producto: 'Tomate', cantidad: 2, unidad: 'kg', precio: 3.00 },
      { producto: 'Plátano maduro', cantidad: 6, unidad: 'unidad', precio: 2.40 },
    ],
  },
  {
    id: 5,
    proveedor: 'Distribuidora Flores',
    fecha: '2026-09-30',
    productos: [
      { producto: 'Camarón mediano', cantidad: 2, unidad: 'lb', precio: 18.00 },
      { producto: 'Harina de maíz precocida', cantidad: 2, unidad: 'bolsa', precio: 3.90 },
    ],
  },
]

// Convierte las compras del modelo anterior en listas, agrupando por proveedor + fecha
function migrarCompras(compras) {
  const grupos = new Map()
  compras.forEach(c => {
    const clave = `${c.proveedor}|${c.fecha}`
    if (!grupos.has(clave)) {
      grupos.set(clave, { id: grupos.size + 1, proveedor: c.proveedor, fecha: c.fecha, productos: [] })
    }
    grupos.get(clave).productos.push({
      producto: c.producto,
      cantidad: c.cantidad,
      unidad: c.unidad,
      precio: c.precio,
    })
  })
  return [...grupos.values()]
}

// Helpers para localStorage
function getListas() {
  try {
    const data = localStorage.getItem(CLAVE_LISTAS)
    if (data) return JSON.parse(data)

    // Migración única desde el modelo anterior
    const antiguas = localStorage.getItem(CLAVE_COMPRAS_ANTIGUA)
    if (antiguas) {
      const listas = migrarCompras(JSON.parse(antiguas))
      setListas(listas)
      localStorage.removeItem(CLAVE_COMPRAS_ANTIGUA)
      return listas
    }
    return structuredClone(MOCK_LISTAS)
  } catch {
    return structuredClone(MOCK_LISTAS)
  }
}

function setListas(listas) {
  localStorage.setItem(CLAVE_LISTAS, JSON.stringify(listas))
}

function siguienteId(listas) {
  return listas.length ? Math.max(...listas.map(l => l.id)) + 1 : 1
}

// Normaliza lo que llega del formulario: textos recortados y números
function normalizar({ proveedor, fecha, productos }) {
  return {
    proveedor: proveedor.trim(),
    fecha,
    productos: productos.map(p => ({
      producto: p.producto.trim(),
      cantidad: parseFloat(p.cantidad),
      unidad: p.unidad,
      precio: parseFloat(p.precio),
    })),
  }
}

/** Gasto total de una lista: suma de los precios de sus productos */
export function totalLista(lista) {
  return lista.productos.reduce((suma, p) => suma + Number(p.precio || 0), 0)
}

// Lista de proveedores y productos únicos para autocompletado
export function getProveedores() {
  return [...new Set(getListas().map(l => l.proveedor))].sort()
}

export function getProductos() {
  return [...new Set(getListas().flatMap(l => l.productos.map(p => p.producto)))].sort()
}

// --- LISTAS DE COMPRA CRUD ---

/**
 * Obtiene las listas de compra, con filtros opcionales.
 * @param {Object} filters - { proveedor, producto, fechaDesde, fechaHasta }
 *   producto: devuelve las listas que contienen algún producto que coincida.
 */
export async function fetchListas(filters = {}) {
  // --- Backend real (descomentar cuando esté listo) ---
  // const params = new URLSearchParams(filters)
  // const res = await fetch(`${BASE_URL}/listas?${params}`)
  // if (!res.ok) throw new Error('Error al cargar las listas de compra')
  // return res.json()

  // --- Mock ---
  await delay(300)
  let listas = getListas()
  const contiene = (texto, busqueda) => texto.toLowerCase().includes(busqueda.toLowerCase())
  if (filters.proveedor) {
    listas = listas.filter(l => contiene(l.proveedor, filters.proveedor))
  }
  if (filters.producto) {
    listas = listas.filter(l => l.productos.some(p => contiene(p.producto, filters.producto)))
  }
  if (filters.fechaDesde) {
    listas = listas.filter(l => l.fecha >= filters.fechaDesde)
  }
  if (filters.fechaHasta) {
    listas = listas.filter(l => l.fecha <= filters.fechaHasta)
  }
  return listas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
}

/**
 * Guarda una lista de compra nueva.
 * @param {Object} lista - { proveedor, fecha, productos: [{ producto, cantidad, unidad, precio }] }
 */
export async function guardarLista(lista) {
  // --- Backend real ---
  // const res = await fetch(`${BASE_URL}/listas`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(lista),
  // })
  // if (!res.ok) throw new Error('Error al guardar')
  // return res.json()

  // --- Mock ---
  await delay(400)
  const listas = getListas()
  const nueva = { id: siguienteId(listas), ...normalizar(lista) }
  setListas([...listas, nueva])
  return nueva
}

/**
 * Reemplaza los datos de una lista existente.
 */
export async function actualizarLista(id, lista) {
  // --- Backend real ---
  // const res = await fetch(`${BASE_URL}/listas/${id}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(lista),
  // })
  // if (!res.ok) throw new Error('Error al actualizar')
  // return res.json()

  // --- Mock ---
  await delay(400)
  const listas = getListas()
  if (!listas.some(l => l.id === id)) throw new Error('La lista no existe')
  const actualizada = { id, ...normalizar(lista) }
  setListas(listas.map(l => (l.id === id ? actualizada : l)))
  return actualizada
}

/**
 * Elimina una lista de compra por ID.
 */
export async function eliminarLista(id) {
  // --- Backend real ---
  // const res = await fetch(`${BASE_URL}/listas/${id}`, { method: 'DELETE' })
  // if (!res.ok) throw new Error('Error al eliminar')

  // --- Mock ---
  await delay(200)
  setListas(getListas().filter(l => l.id !== id))
}

// Utilidad
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
