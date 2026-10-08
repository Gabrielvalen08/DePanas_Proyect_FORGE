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

import { comprasACsv, comprasAJson, nombreArchivo } from '../utils/exportar'
import { RUTAS_ASIGNABLES, RUTA_USUARIOS } from '../utils/permisos'
import { USUARIOS as MENSAJES_USUARIOS } from '../utils/mensajes'

const BASE_URL = '/api'

const CLAVE_LISTAS          = 'depanas_listas'
const CLAVE_COMPRAS_ANTIGUA = 'depanas_compras'
const CLAVE_CATALOGO        = 'depanas_catalogo'
const CLAVE_USUARIOS        = 'depanas_usuarios'

// ---------------------------------------------------------------------------
// Catálogo de los desplegables (de "Datos De Panas.xlsx", igual que
// backend/db/catalogo.js). Cada material tiene su categoría y su producto,
// como en las filas del Excel ('' = aún sin asignar).
// En modo servidor manda /api/catalogo, que ya incluye este catálogo; en modo
// local, lo que el usuario agrega se guarda en localStorage (depanas_catalogo).
// ---------------------------------------------------------------------------
export const CATALOGO = {
  proveedores: ['Selectos', 'MMAG', 'Pepsi', 'Desechables Diver.'],
  categorias:  ['Materia Prima', 'Limpieza', 'Desechables', 'Servicios', 'Material Común', 'Bebidas'],
  productos: [
    'Cachitos', 'Pan Guayaba', 'Golfeados', 'Panadería', 'Arepas', 'Empanadas', 'Todos',
    'Arepas/Empanadas', 'Tequeños', 'Salsa', 'Gaseosas', 'Hidratantes',
  ],
  materiales: [
    ['Tocino La Rioja', 'Materia Prima', 'Cachitos'],
    ['Jamon Picnic', 'Materia Prima', 'Cachitos'],
    ['Anis', 'Materia Prima', 'Golfeados'],
    ['Manteca', 'Materia Prima', 'Panadería'],
    ['Ajo Chino', 'Materia Prima', 'Arepas/Empanadas'],
    ['Queso', '', ''],
    ['Guayaba', '', ''],
    ['Carne', '', ''],
    ['Pollo', '', ''],
    ['Cebolla', 'Materia Prima', 'Arepas/Empanadas'],
    ['Chile verde', '', ''],
    ['Fosforos', 'Material Común', 'Todos'],
    ['Gabacha #3 Blanca', 'Desechables', 'Todos'],
    ['Bolsa al Vacio 8*12', 'Desechables', 'Tequeños'],
    ['Azucar', 'Materia Prima', 'Todos'],
    ['Mr Músculo Antigrasa', 'Limpieza', ''],
    ['Frijol Negro', 'Materia Prima', 'Arepas/Empanadas'],
    ['Huevos', 'Materia Prima', 'Panadería'],
    ['Jamon Virginia', '', ''],
    ['Cilantro', 'Materia Prima', 'Salsa'],
    ['Perejil', 'Materia Prima', 'Salsa'],
    ['Sazón Completa', 'Materia Prima', 'Arepas/Empanadas'],
    ['Pechugas de Pollo', 'Materia Prima', 'Arepas/Empanadas'],
    ['Plátanos', 'Materia Prima', 'Arepas/Empanadas'],
    ['Alambrina ExtraFuerte', 'Materia Prima', 'Todos'],
    ['Pierna Mechada La Rioja', 'Materia Prima', ''],
    ['Jamón de Pavo', 'Materia Prima', 'Cachitos'],
    ['Gatorade', 'Bebidas', 'Hidratantes'],
    ['Agua', 'Bebidas', 'Hidratantes'],
    ['Pepsi', 'Bebidas', 'Gaseosas'],
    ['Lipton', 'Bebidas', 'Gaseosas'],
    ['Bandeja Bisagrada', 'Desechables', ''],
    ['Bandeja Kraft', 'Desechables', ''],
    ['Tapadera Cristal', 'Desechables', ''],
    ['Portion Cup Cuadrada', 'Desechables', ''],
    ['Tapa Portion Cup Cuadrado', 'Desechables', ''],
  ].map(([nombre, categoria, producto]) => ({ nombre, categoria, producto })),
}

const clave = texto => (texto || '').trim().toLowerCase()
const ordenar = lista => [...lista].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))

/** Tipos del catálogo y su lista en el objeto catálogo */
export const TIPOS_CATALOGO = ['proveedor', 'categoria', 'material', 'producto']
const LISTA = { proveedor: 'proveedores', categoria: 'categorias', producto: 'productos' }
const NOMBRE_TIPO = { proveedor: 'proveedor', categoria: 'categoría', material: 'material', producto: 'producto' }
const ARTICULO = { proveedor: 'un', categoria: 'una', material: 'un', producto: 'un' }

/** Quita repetidos sin distinguir mayúsculas y ordena alfabéticamente */
function sinDuplicados(nombres) {
  const unicos = new Map()
  for (const nombre of nombres) {
    const limpio = (nombre || '').trim()
    if (limpio && !unicos.has(clave(limpio))) unicos.set(clave(limpio), limpio)
  }
  return ordenar([...unicos.values()])
}

// ---------------------------------------------------------------------------
// Catálogo en modo local
// ---------------------------------------------------------------------------
// La primera vez se arma con el catálogo del Excel + lo que ya hay en las compras
// locales; desde la primera escritura se guarda completo en localStorage, así lo
// que se elimina no vuelve a aparecer.

function catalogoLocalInicial() {
  const cat = {
    proveedores: [...CATALOGO.proveedores],
    categorias: [...CATALOGO.categorias],
    productos: [...CATALOGO.productos],
    materiales: CATALOGO.materiales.map(m => ({ ...m })),
  }
  // Formato anterior de depanas_catalogo: solo lo agregado por el usuario
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE_CATALOGO) : null
    const previo = raw ? JSON.parse(raw) : null
    if (previo && !previo.version) {
      cat.categorias.push(...(previo.categorias || []))
      cat.productos.push(...(previo.productos || []))
      for (const m of previo.materiales || []) fijarMaterial(cat, m)
    }
  } catch {
    // Catálogo guardado ilegible: se usa solo el del Excel
  }
  for (const lista of getListas()) registrarCompraEn(cat, lista)
  return cat
}

/** Catálogo local completo (las listas de nombres sin repetir) */
function getCatalogoLocal() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE_CATALOGO) : null
    const datos = raw ? JSON.parse(raw) : null
    if (datos?.version === 2) return datos
  } catch {
    // Catálogo guardado ilegible: se vuelve a armar
  }
  return catalogoLocalInicial()
}

function setCatalogoLocal(cat) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CLAVE_CATALOGO, JSON.stringify({ version: 2, ...cat }))
}

/** Nombre ya registrado (sin distinguir mayúsculas) o lo agrega. { nombre, nuevo } */
function registrarEn(cat, tipo, nombre) {
  const limpio = (nombre || '').trim()
  if (tipo === 'material') {
    const existente = cat.materiales.find(m => clave(m.nombre) === clave(limpio))
    if (existente) return { nombre: existente.nombre, nuevo: false }
    cat.materiales.push({ nombre: limpio, categoria: '', producto: '' })
    return { nombre: limpio, nuevo: true }
  }
  const existente = cat[LISTA[tipo]].find(n => clave(n) === clave(limpio))
  if (existente) return { nombre: existente, nuevo: false }
  cat[LISTA[tipo]].push(limpio)
  return { nombre: limpio, nuevo: true }
}

function fijarMaterial(cat, m) {
  const { nombre } = registrarEn(cat, 'material', m.nombre)
  const destino = cat.materiales.find(x => x.nombre === nombre)
  if (m.categoria) destino.categoria = registrarEn(cat, 'categoria', m.categoria).nombre
  if (m.producto) destino.producto = registrarEn(cat, 'producto', m.producto).nombre
}

/** Lo mismo que registrarCompra del backend: proveedor, materiales y sus categorías y productos */
function registrarCompraEn(cat, lista) {
  if (lista.proveedor?.trim()) registrarEn(cat, 'proveedor', lista.proveedor)
  for (const m of lista.materiales || []) {
    if (!m.material?.trim()) continue
    const { nombre } = registrarEn(cat, 'material', m.material)
    const destino = cat.materiales.find(x => x.nombre === nombre)
    // Solo completa lo vacío: lo asignado en el catálogo manda
    if (m.categoria && !destino.categoria) destino.categoria = registrarEn(cat, 'categoria', m.categoria).nombre
    if (m.producto && !destino.producto) destino.producto = registrarEn(cat, 'producto', m.producto).nombre
  }
}

function registrarCompraLocal(lista) {
  const cat = getCatalogoLocal()
  registrarCompraEn(cat, lista)
  setCatalogoLocal(cat)
}

/** Catálogo vigente: el del servidor o el local */
function catalogo() {
  return catalogoServidor ?? getCatalogoLocal()
}

/** Proveedores para el autocompletado */
export function getProveedores() {
  return sinDuplicados(catalogo().proveedores)
}

/** Materiales para el autocompletado */
export function getMateriales() {
  return sinDuplicados(catalogo().materiales.map(m => m.nombre))
}

/** Categorías de los materiales */
export function getCategorias() {
  return sinDuplicados(catalogo().categorias)
}

/** Productos destino de los materiales (Cachitos, Arepas…) */
export function getProductos() {
  return sinDuplicados(catalogo().productos)
}

/**
 * Categoría y producto asignados a un material.
 * { existe, nombre, categoria, producto }; '' en lo que falte por asignar.
 */
export function getAsignacion(material) {
  const m = catalogo().materiales.find(x => clave(x.nombre) === clave(material))
  if (m) return { existe: true, nombre: m.nombre, categoria: m.categoria || '', producto: m.producto || '' }
  return { existe: false, nombre: (material || '').trim(), categoria: '', producto: '' }
}

/** true si al material le falta la categoría o el producto */
export function necesitaAsignacion(material) {
  if (!(material || '').trim()) return false
  const { categoria, producto } = getAsignacion(material)
  return !categoria || !producto
}

/**
 * Asigna categoría y producto a un material; lo agrega al catálogo si es nuevo,
 * igual que la categoría o el producto escritos que aún no existían.
 * Devuelve { material: { nombre, categoria, producto }, materialNuevo, categoriaNueva, productoNuevo }
 */
export async function asignarMaterial(material, { categoria, producto }) {
  if ((await detectarModo()) === 'servidor') {
    const resultado = await pedirJSON(
      `/catalogo/materiales/${encodeURIComponent(material.trim())}`, 'PUT', { categoria, producto }
    )
    // Se aplica en el acto para que el formulario lo vea sin esperar la recarga
    if (catalogoServidor) {
      const { material: m, categoriaNueva, productoNuevo } = resultado
      catalogoServidor = {
        ...catalogoServidor,
        categorias: categoriaNueva ? [...catalogoServidor.categorias, m.categoria] : catalogoServidor.categorias,
        productos: productoNuevo ? [...catalogoServidor.productos, m.producto] : catalogoServidor.productos,
        materiales: [...catalogoServidor.materiales.filter(x => clave(x.nombre) !== clave(m.nombre)), m],
      }
    }
    refrescarCache()
    return resultado
  }

  const cat = (categoria || '').trim()
  const prod = (producto || '').trim()
  if (!cat) throw new Error('Elige una categoría')
  if (!prod) throw new Error('Elige un producto')

  const catalogoLocal = getCatalogoLocal()
  const mat = registrarEn(catalogoLocal, 'material', material)
  const c = registrarEn(catalogoLocal, 'categoria', cat)
  const p = registrarEn(catalogoLocal, 'producto', prod)
  Object.assign(catalogoLocal.materiales.find(x => x.nombre === mat.nombre), { categoria: c.nombre, producto: p.nombre })
  setCatalogoLocal(catalogoLocal)
  propagarAsignacionLocal(mat.nombre, c.nombre, p.nombre)

  return {
    material: { nombre: mat.nombre, categoria: c.nombre, producto: p.nombre },
    materialNuevo: mat.nuevo,
    categoriaNueva: c.nuevo,
    productoNuevo: p.nuevo,
  }
}

/** Las compras locales de ese material toman su nueva categoría y producto */
function propagarAsignacionLocal(material, categoria, producto) {
  const listas = getListas()
  let cambio = false
  for (const l of listas) {
    for (const m of l.materiales) {
      if (clave(m.material) === clave(material)) {
        Object.assign(m, { categoria, producto })
        cambio = true
      }
    }
  }
  if (cambio) setListas(listas)
}

// ---------------------------------------------------------------------------
// Configuración: agregar, editar y eliminar opciones del catálogo
// ---------------------------------------------------------------------------

/**
 * Catálogo completo para la pantalla de Configuración, recién leído, con `uso`:
 * { proveedores, categorias, productos, materiales, uso: { proveedor: { nombre: compras },
 *   material: { … }, categoria: { nombre: materiales }, producto: { … } } } (claves en minúsculas)
 */
export async function fetchCatalogo() {
  if ((await detectarModo()) === 'servidor') {
    catalogoServidor = await (await pedir('/catalogo')).json()
    return catalogoServidor
  }
  await delay(100)
  const cat = getCatalogoLocal()
  const listas = getListas()
  const contarCompras = campo => {
    const uso = {}
    for (const l of listas) {
      const nombres = new Set(campo === 'proveedor' ? [clave(l.proveedor)] : l.materiales.map(m => clave(m.material)))
      for (const n of nombres) uso[n] = (uso[n] ?? 0) + 1
    }
    return uso
  }
  const contarMateriales = campo => {
    const uso = {}
    for (const m of cat.materiales) if (m[campo]) uso[clave(m[campo])] = (uso[clave(m[campo])] ?? 0) + 1
    return uso
  }
  return {
    proveedores: sinDuplicados(cat.proveedores),
    categorias: sinDuplicados(cat.categorias),
    productos: sinDuplicados(cat.productos),
    materiales: [...cat.materiales].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    uso: {
      proveedor: contarCompras('proveedor'),
      material: contarCompras('material'),
      categoria: contarMateriales('categoria'),
      producto: contarMateriales('producto'),
    },
  }
}

const yaExiste = (tipo, nombre) => `Ya existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${nombre}»`
const noExiste = (tipo, nombre) => `No existe ${ARTICULO[tipo]} ${NOMBRE_TIPO[tipo]} llamado «${nombre}»`

function buscarLocal(cat, tipo, nombre) {
  if (tipo === 'material') return cat.materiales.find(m => clave(m.nombre) === clave(nombre))?.nombre
  return cat[LISTA[tipo]].find(n => clave(n) === clave(nombre))
}

/**
 * Agrega una opción. datos: { nombre } y, para un material, { categoria, producto }
 * (si no existen, se crean). Devuelve { nombre, categoria?, producto?, categoriaNueva, productoNuevo }
 */
export async function agregarAlCatalogo(tipo, datos) {
  if ((await detectarModo()) === 'servidor') {
    const resultado = await pedirJSON(`/catalogo/${tipo}`, 'POST', datos)
    await refrescarCache()
    return resultado
  }
  await delay(100)
  const nombre = (datos.nombre || '').trim()
  if (!nombre) throw new Error(`Escribe el nombre del ${NOMBRE_TIPO[tipo]}`)
  const cat = getCatalogoLocal()
  const existente = buscarLocal(cat, tipo, nombre)
  if (existente) throw new Error(yaExiste(tipo, existente))
  if (tipo !== 'material') {
    registrarEn(cat, tipo, nombre)
    setCatalogoLocal(cat)
    return { nombre, categoriaNueva: false, productoNuevo: false }
  }
  if (!datos.categoria?.trim()) throw new Error('Elige una categoría')
  if (!datos.producto?.trim()) throw new Error('Elige un producto')
  registrarEn(cat, 'material', nombre)
  const c = registrarEn(cat, 'categoria', datos.categoria)
  const p = registrarEn(cat, 'producto', datos.producto)
  Object.assign(cat.materiales.find(m => m.nombre === nombre), { categoria: c.nombre, producto: p.nombre })
  setCatalogoLocal(cat)
  return { nombre, categoria: c.nombre, producto: p.nombre, categoriaNueva: c.nuevo, productoNuevo: p.nuevo }
}

/**
 * Cambia el nombre de una opción (y, en un material, su categoría y producto) y lo
 * actualiza en todas las compras. datos: { nombre, categoria?, producto? }.
 * Devuelve { anterior, nombre, compras, categoriaNueva, productoNuevo }
 */
export async function editarEnCatalogo(tipo, nombreActual, datos) {
  if ((await detectarModo()) === 'servidor') {
    const resultado = await pedirJSON(`/catalogo/${tipo}/${encodeURIComponent(nombreActual)}`, 'PUT', datos)
    await refrescarCache()
    return resultado
  }
  await delay(100)
  const cat = getCatalogoLocal()
  const anterior = buscarLocal(cat, tipo, nombreActual)
  if (!anterior) throw new Error(noExiste(tipo, nombreActual))
  const nuevo = (datos.nombre || '').trim() || anterior
  const choque = buscarLocal(cat, tipo, nuevo)
  if (choque && clave(choque) !== clave(anterior)) throw new Error(yaExiste(tipo, choque))

  // Catálogo
  if (tipo === 'material') {
    cat.materiales.find(m => m.nombre === anterior).nombre = nuevo
  } else {
    cat[LISTA[tipo]] = cat[LISTA[tipo]].map(n => (n === anterior ? nuevo : n))
    if (tipo !== 'proveedor') {
      for (const m of cat.materiales) if (clave(m[tipo]) === clave(anterior)) m[tipo] = nuevo
    }
  }
  let categoriaNueva = false
  let productoNuevo = false
  if (tipo === 'material' && datos.categoria?.trim() && datos.producto?.trim()) {
    const c = registrarEn(cat, 'categoria', datos.categoria)
    const p = registrarEn(cat, 'producto', datos.producto)
    Object.assign(cat.materiales.find(m => m.nombre === nuevo), { categoria: c.nombre, producto: p.nombre })
    categoriaNueva = c.nuevo
    productoNuevo = p.nuevo
  }
  setCatalogoLocal(cat)

  // Compras
  const listas = getListas()
  const asignado = cat.materiales.find(m => m.nombre === nuevo)
  const compras = new Set()
  for (const l of listas) {
    if (tipo === 'proveedor' && clave(l.proveedor) === clave(anterior)) {
      l.proveedor = nuevo
      compras.add(l.id)
    }
    for (const m of l.materiales) {
      if (tipo === 'material' && clave(m.material) === clave(anterior)) {
        m.material = nuevo
        if (datos.categoria?.trim()) Object.assign(m, { categoria: asignado.categoria, producto: asignado.producto })
        compras.add(l.id)
      } else if ((tipo === 'categoria' || tipo === 'producto') && clave(m[tipo]) === clave(anterior)) {
        m[tipo] = nuevo
        compras.add(l.id)
      }
    }
  }
  if (compras.size > 0) setListas(listas)
  const extra = tipo === 'material' ? { categoria: asignado.categoria, producto: asignado.producto } : {}
  return { anterior, nombre: nuevo, ...extra, compras: compras.size, categoriaNueva, productoNuevo }
}

/**
 * Quita una opción del catálogo. Las compras conservan su texto. Si es una
 * categoría o un producto, sus materiales quedan sin ella (se pedirá de nuevo).
 * Devuelve { nombre, materiales }
 */
export async function eliminarDelCatalogo(tipo, nombre) {
  if ((await detectarModo()) === 'servidor') {
    const res = await pedir(`/catalogo/${tipo}/${encodeURIComponent(nombre)}`, { method: 'DELETE' })
    const resultado = await res.json()
    await refrescarCache()
    return resultado
  }
  await delay(100)
  const cat = getCatalogoLocal()
  const registro = buscarLocal(cat, tipo, nombre)
  if (!registro) throw new Error(noExiste(tipo, nombre))
  let materiales = 0
  if (tipo === 'material') {
    cat.materiales = cat.materiales.filter(m => m.nombre !== registro)
  } else {
    cat[LISTA[tipo]] = cat[LISTA[tipo]].filter(n => n !== registro)
    if (tipo !== 'proveedor') {
      for (const m of cat.materiales) {
        if (clave(m[tipo]) === clave(registro)) {
          m[tipo] = ''
          materiales++
        }
      }
    }
  }
  setCatalogoLocal(cat)
  return { nombre: registro, materiales }
}

// ---------------------------------------------------------------------------
// Modo de datos: servidor (SQLite) o local (localStorage)
// ---------------------------------------------------------------------------
// Se decide UNA vez por carga de la página con /api/health. Con servidor, todo
// va al backend y sus errores se propagan (la UI muestra el error); nunca se
// guarda "a escondidas" en localStorage. Sin servidor, todo es local.

let modoPromesa = null
let catalogoServidor = null // GET /api/catalogo: opciones de los desplegables y asignaciones

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
  catalogoServidor = null
}

/**
 * fetch al backend; si responde con error, lanza con el mensaje del servidor
 * (y error.campo cuando el servidor dice qué campo del formulario lo causó)
 */
async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${BASE_URL}${ruta}`, opciones)
  if (!res.ok) {
    let mensaje = `Error ${res.status}`
    let campo
    try {
      const cuerpo = await res.json()
      mensaje = cuerpo.error || mensaje
      campo = cuerpo.campo
    } catch {
      // La respuesta de error no traía JSON
    }
    throw Object.assign(new Error(mensaje), campo ? { campo } : {})
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
    const datos = await (await pedir('/catalogo')).json()
    if (Array.isArray(datos?.materiales)) catalogoServidor = datos
  } catch {
    // Solo afecta a las sugerencias del autocompletado
  }
}

/** Lo que se envía al backend para crear o editar una compra */
function cuerpoCompra(lista) {
  const n = normalizar(lista)
  return {
    proveedor: n.proveedor,
    fecha: n.fecha,
    categoria: lista.categoria ?? '',
    materiales: n.materiales.map(({ material, cantidad, unidad, monto, categoria, producto }) => ({
      material, cantidad, unidad, monto, categoria, producto,
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
      { material: 'Pollo entero', cantidad: 3, unidad: 'lb', monto: 12.50, categoria: 'Materia Prima', producto: 'Arepas/Empanadas' },
    ],
  },
  {
    id: 2,
    proveedor: 'Walmart',
    fecha: '2026-09-28',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Aceite vegetal', cantidad: 1, unidad: 'galon', monto: 8.75, categoria: 'Materia Prima', producto: 'Todos' },
    ],
  },
  {
    id: 3,
    proveedor: 'Súper Selectos',
    fecha: '2026-09-29',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Cebolla blanca',    cantidad: 500, unidad: 'g',    monto: 1.20, categoria: 'Materia Prima', producto: 'Arepas/Empanadas' },
      { material: 'Arroz',             cantidad: 5,   unidad: 'lb',   monto: 4.25, categoria: 'Materia Prima', producto: 'Todos' },
      { material: 'Queso duro blando', cantidad: 1,   unidad: 'lb',   monto: 3.50, categoria: 'Materia Prima', producto: 'Arepas/Empanadas' },
    ],
  },
  {
    id: 4,
    proveedor: 'La Colonia',
    fecha: '2026-09-29',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Tomate',         cantidad: 2, unidad: 'kg',     monto: 3.00, categoria: 'Materia Prima', producto: 'Salsa' },
      { material: 'Plátano maduro', cantidad: 6, unidad: 'unidad', monto: 2.40, categoria: 'Materia Prima', producto: 'Arepas/Empanadas' },
    ],
  },
  {
    id: 5,
    proveedor: 'Distribuidora Flores',
    fecha: '2026-09-30',
    categoria: 'Materia Prima',
    materiales: [
      { material: 'Camarón mediano',           cantidad: 2, unidad: 'lb',    monto: 18.00, categoria: 'Materia Prima', producto: 'Todos' },
      { material: 'Harina de maíz precocida',  cantidad: 2, unidad: 'bolsa', monto: 3.90,  categoria: 'Materia Prima', producto: 'Arepas/Empanadas' },
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
    categoria: m.categoria || '',
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
    categoria: (m.categoria ?? '').trim(),
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
    return (await (await pedir(`/compras?${params}`)).json()).map(enriquecerLista)
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
  registrarCompraLocal(nueva)
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
  registrarCompraLocal(actualizada)
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
  const cat = getCatalogoLocal()
  for (const l of entrantes) registrarCompraEn(cat, l)
  setCatalogoLocal(cat)
  return { ok: true, nuevas: entrantes.length }
}

/**
 * Descarga las compras de un rango (vacío = sin límite) como CSV para Excel o
 * como JSON de respaldo. Funciona igual en los dos modos. Devuelve cuántas compras salieron.
 */
export async function exportarCompras({ desde = '', hasta = '', formato = 'csv' } = {}) {
  const compras = await fetchListas({ fechaDesde: desde, fechaHasta: hasta })
  if (compras.length === 0) throw new Error('no hay compras en ese rango')
  const csv = formato === 'csv'
  const contenido = csv ? comprasACsv(compras) : comprasAJson(compras)
  const tipo = csv ? 'text/csv;charset=utf-8' : 'application/json'
  descargarBlob(new Blob([contenido], { type: tipo }), nombreArchivo(desde, hasta, csv ? 'csv' : 'json'))
  return compras.length
}

// ---------------------------------------------------------------------------
// Usuarios: inicio de sesión y Gestor de usuarios
// ---------------------------------------------------------------------------
// Un usuario es { usuario, nombre, rol: 'admin' | 'operador', permisos: [rutas] }.
// La contraseña nunca sale de aquí: se guarda como hash PBKDF2, con el mismo
// formato que el backend (backend/contrasenas.js). Reglas (iguales en los dos
// modos): el usuario y la contraseña no se repiten, hay un solo administrador
// (permisos ['*'], no se elimina) y nadie más recibe el Gestor de usuarios.

/** Iguales a backend/db/usuarios.js: Cesar_01 / 1234 (admin) y Marta_02 / 5678 */
const USUARIOS_INICIALES = [
  {
    usuario: 'Cesar_01', nombre: 'César', rol: 'admin', permisos: ['*'],
    contrasena: 'pbkdf2$100000$5a43060896bd80a84a7d4224a028b545$c19cba8f54fc5c6afa5638a7ac9be25b870d6a132d9a64f6f96f597121b3d54e',
  },
  {
    usuario: 'Marta_02', nombre: 'Marta', rol: 'operador', permisos: [...RUTAS_ASIGNABLES],
    contrasena: 'pbkdf2$100000$d0f24824a99bff7180d523f67b5b6ff5$e1f9aaceda70ab381493fc4662cc7c561c76aef0415446fcb0b3d7c90fdda447',
  },
]

const ITERACIONES_HASH = 100_000
const FORMATO_USUARIO = /^[A-Za-z0-9_.-]{3,30}$/
const V = MENSAJES_USUARIOS.validacion

const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('')
const deHex = cadena => new Uint8Array(cadena.match(/../g).map(h => parseInt(h, 16)))

/** PBKDF2-SHA256 con WebCrypto (solo modo local; con servidor el hash lo hace el backend) */
async function derivar(contrasena, sal, iteraciones) {
  const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, llave, 256))
}

async function hashear(contrasena) {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITERACIONES_HASH}$${hex(sal)}$${await derivar(contrasena, sal, ITERACIONES_HASH)}`
}

async function verificar(contrasena, guardado) {
  const [algoritmo, iteraciones, sal, hash] = String(guardado).split('$')
  if (algoritmo !== 'pbkdf2' || !sal || !hash) return false
  return (await derivar(contrasena, deHex(sal), Number(iteraciones))) === hash
}

/** Error con el campo del formulario que lo causó, como los del backend */
const falloCampo = (mensaje, campo) => Object.assign(new Error(mensaje), campo ? { campo } : {})
const publico = ({ usuario, nombre, rol, permisos }) => ({ usuario, nombre, rol, permisos: [...permisos] })
const recortado = v => (typeof v === 'string' ? v.trim() : '')

function getUsuariosLocal() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_USUARIOS) || 'null')
    if (Array.isArray(datos) && datos.length > 0) return datos
  } catch {
    // Usuarios guardados ilegibles: se vuelve a los iniciales
  }
  return USUARIOS_INICIALES.map(u => ({ ...u, permisos: [...u.permisos] }))
}

function setUsuariosLocal(usuarios) {
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios))
}

const buscarUsuarioLocal = (usuarios, usuario) => usuarios.find(u => clave(u.usuario) === clave(usuario))

function validarNombre(nombre) {
  if (!nombre) throw falloCampo(V.nombre, 'nombre')
  if (nombre.length > 60) throw falloCampo(V.nombreLargo, 'nombre')
}

async function validarContrasena(usuarios, contrasena, excepto = '') {
  if (contrasena.length < 4) throw falloCampo(V.contrasena, 'contrasena')
  // Los hashes llevan sal: la única forma de saber si se repite es probarla contra cada uno
  for (const u of usuarios) {
    if (clave(u.usuario) !== clave(excepto) && await verificar(contrasena, u.contrasena)) {
      throw falloCampo(V.contrasenaRepetida, 'contrasena')
    }
  }
}

/** Pantallas sin repetir, todas asignables, al menos una y en el orden del menú */
function validarPermisos(permisos) {
  if (!Array.isArray(permisos)) throw falloCampo(V.permisos, 'permisos')
  const unicos = [...new Set(permisos)]
  if (unicos.includes(RUTA_USUARIOS) || unicos.includes('*')) throw falloCampo(V.gestor, 'permisos')
  const desconocida = unicos.find(p => !RUTAS_ASIGNABLES.includes(p))
  if (desconocida !== undefined) throw falloCampo(V.pantallaDesconocida(desconocida), 'permisos')
  if (unicos.length === 0) throw falloCampo(V.permisos, 'permisos')
  return RUTAS_ASIGNABLES.filter(r => unicos.includes(r))
}

/** Devuelve el usuario ({ usuario, nombre, rol, permisos }) si la contraseña es correcta; si no, lanza */
export async function iniciarSesion(usuario, contrasena) {
  if ((await detectarModo()) === 'servidor') {
    return pedirJSON('/sesion', 'POST', { usuario, contrasena })
  }
  const registro = buscarUsuarioLocal(getUsuariosLocal(), recortado(usuario))
  const limpia = recortado(contrasena)
  if (!registro || !limpia || !(await verificar(limpia, registro.contrasena))) throw new Error(V.incorrecta)
  return publico(registro)
}

/** Todos los usuarios, el administrador primero (sin contraseñas) */
export async function fetchUsuarios() {
  if ((await detectarModo()) === 'servidor') return (await pedir('/usuarios')).json()
  return getUsuariosLocal()
    .map(publico)
    .sort((a, b) => (b.rol === 'admin') - (a.rol === 'admin') || a.usuario.localeCompare(b.usuario, 'es', { sensitivity: 'base' }))
}

/** Crea un operador. datos: { usuario, nombre, contrasena, permisos } */
export async function crearUsuario(datos) {
  if ((await detectarModo()) === 'servidor') return pedirJSON('/usuarios', 'POST', datos)
  const usuarios = getUsuariosLocal()
  const usuario = recortado(datos.usuario)
  const nombre = recortado(datos.nombre)
  const contrasena = recortado(datos.contrasena)
  if (!FORMATO_USUARIO.test(usuario)) throw falloCampo(V.usuario, 'usuario')
  const existente = buscarUsuarioLocal(usuarios, usuario)
  if (existente) throw falloCampo(V.usuarioRepetido(existente.usuario), 'usuario')
  validarNombre(nombre)
  await validarContrasena(usuarios, contrasena)
  const permisos = validarPermisos(datos.permisos)
  const nuevo = { usuario, nombre, rol: 'operador', permisos, contrasena: await hashear(contrasena) }
  setUsuariosLocal([...usuarios, nuevo])
  return publico(nuevo)
}

/**
 * Cambia { nombre?, contrasena?, permisos? }. La contraseña vacía no se toca y
 * los permisos del administrador no se editan (siempre entra a todo).
 */
export async function editarUsuario(usuario, datos) {
  if ((await detectarModo()) === 'servidor') {
    return pedirJSON(`/usuarios/${encodeURIComponent(usuario)}`, 'PUT', datos)
  }
  const usuarios = getUsuariosLocal()
  const registro = buscarUsuarioLocal(usuarios, usuario)
  if (!registro) throw falloCampo(V.noExiste(usuario))
  const cambios = {}
  if (datos.nombre !== undefined) {
    cambios.nombre = recortado(datos.nombre)
    validarNombre(cambios.nombre)
  }
  const contrasena = recortado(datos.contrasena)
  if (contrasena) {
    await validarContrasena(usuarios, contrasena, registro.usuario)
    cambios.contrasena = await hashear(contrasena)
  }
  if (datos.permisos !== undefined && registro.rol !== 'admin') cambios.permisos = validarPermisos(datos.permisos)
  Object.assign(registro, cambios)
  setUsuariosLocal(usuarios)
  return publico(registro)
}

/** Elimina un usuario (el administrador no). Devuelve { usuario } */
export async function eliminarUsuario(usuario) {
  if ((await detectarModo()) === 'servidor') {
    return (await pedir(`/usuarios/${encodeURIComponent(usuario)}`, { method: 'DELETE' })).json()
  }
  const usuarios = getUsuariosLocal()
  const registro = buscarUsuarioLocal(usuarios, usuario)
  if (!registro) throw falloCampo(V.noExiste(usuario))
  if (registro.rol === 'admin') throw falloCampo(V.adminNoSeElimina)
  setUsuariosLocal(usuarios.filter(u => u !== registro))
  return { usuario: registro.usuario }
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
