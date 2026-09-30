/**
 * api.js
 * Capa de servicio para comunicarse con el backend Node.js + Express.
 * Por ahora usa datos mock en localStorage para que el frontend funcione solo.
 * Cuando el backend esté listo, descomentar las llamadas fetch a /api/...
 */

const BASE_URL = '/api'

// --- Mock data inicial ---
const MOCK_COMPRAS = [
  {
    id: 1,
    proveedor: 'Súper Selectos',
    producto: 'Pollo entero',
    cantidad: 3,
    unidad: 'lb',
    precio: 12.50,
    fecha: '2026-09-28',
  },
  {
    id: 2,
    proveedor: 'Walmart',
    producto: 'Aceite vegetal',
    cantidad: 1,
    unidad: 'galon',
    precio: 8.75,
    fecha: '2026-09-28',
  },
  {
    id: 3,
    proveedor: 'Súper Selectos',
    producto: 'Cebolla blanca',
    cantidad: 500,
    unidad: 'g',
    precio: 1.20,
    fecha: '2026-09-29',
  },
  {
    id: 4,
    proveedor: 'La Colonia',
    producto: 'Tomate',
    cantidad: 2,
    unidad: 'kg',
    precio: 3.00,
    fecha: '2026-09-29',
  },
  {
    id: 5,
    proveedor: 'Distribuidora Flores',
    producto: 'Camarón mediano',
    cantidad: 2,
    unidad: 'lb',
    precio: 18.00,
    fecha: '2026-09-30',
  },
]

// Helpers para localStorage
function getCompras() {
  try {
    const data = localStorage.getItem('depanas_compras')
    return data ? JSON.parse(data) : MOCK_COMPRAS
  } catch {
    return MOCK_COMPRAS
  }
}

function setCompras(compras) {
  localStorage.setItem('depanas_compras', JSON.stringify(compras))
}

function getNextId() {
  const compras = getCompras()
  return compras.length ? Math.max(...compras.map(c => c.id)) + 1 : 1
}

// Lista de proveedores y productos únicos para autocompletado
export function getProveedores() {
  const compras = getCompras()
  return [...new Set(compras.map(c => c.proveedor))].sort()
}

export function getProductos() {
  const compras = getCompras()
  return [...new Set(compras.map(c => c.producto))].sort()
}

// --- COMPRAS CRUD ---

/**
 * Obtiene todas las compras, con filtros opcionales.
 * @param {Object} filters - { proveedor, producto, fechaDesde, fechaHasta }
 */
export async function fetchCompras(filters = {}) {
  // --- Backend real (descomentar cuando esté listo) ---
  // const params = new URLSearchParams(filters)
  // const res = await fetch(`${BASE_URL}/compras?${params}`)
  // if (!res.ok) throw new Error('Error al cargar compras')
  // return res.json()

  // --- Mock ---
  await delay(300)
  let compras = getCompras()
  if (filters.proveedor) {
    compras = compras.filter(c =>
      c.proveedor.toLowerCase().includes(filters.proveedor.toLowerCase())
    )
  }
  if (filters.producto) {
    compras = compras.filter(c =>
      c.producto.toLowerCase().includes(filters.producto.toLowerCase())
    )
  }
  if (filters.fechaDesde) {
    compras = compras.filter(c => c.fecha >= filters.fechaDesde)
  }
  if (filters.fechaHasta) {
    compras = compras.filter(c => c.fecha <= filters.fechaHasta)
  }
  return compras.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/**
 * Guarda un lote de filas de compra (una sesión de "Agregar Compra").
 * @param {Array} filas - [{ proveedor, producto, cantidad, unidad, precio, fecha }]
 */
export async function guardarCompras(filas) {
  // --- Backend real ---
  // const res = await fetch(`${BASE_URL}/compras`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ filas }),
  // })
  // if (!res.ok) throw new Error('Error al guardar')
  // return res.json()

  // --- Mock ---
  await delay(400)
  const compras = getCompras()
  const nuevas = filas.map(f => ({
    ...f,
    id: getNextId() + compras.length,
    precio: parseFloat(f.precio),
    cantidad: parseFloat(f.cantidad),
  }))
  // Re-asignar IDs secuencialmente para evitar colisiones
  let nextId = compras.length ? Math.max(...compras.map(c => c.id)) + 1 : 1
  nuevas.forEach(n => { n.id = nextId++ })
  setCompras([...compras, ...nuevas])
  return nuevas
}

/**
 * Elimina una compra por ID.
 */
export async function eliminarCompra(id) {
  // --- Backend real ---
  // const res = await fetch(`${BASE_URL}/compras/${id}`, { method: 'DELETE' })
  // if (!res.ok) throw new Error('Error al eliminar')

  // --- Mock ---
  await delay(200)
  const compras = getCompras().filter(c => c.id !== id)
  setCompras(compras)
}

// Utilidad
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
