/**
 * mensajes.js — Todo lo que el sistema le dice al usuario, con la voz de marca
 * (Brandbook DE PANAS 2026, diapositiva 10 "Voz de Marca"):
 *
 *   Tono:    cercano y conversacional; auténtico, venezolano y sutilmente
 *            nostálgico; amigable, invita a probar cosas nuevas.
 *   Estilo:  lenguaje simple, humano y cotidiano; vibrante y caribeño.
 *   Frases:  "Tu antojo venezolano en El Salvador", "Aquí se viene a comer rico",
 *            "Hoy toca arepita", "Naguará, qué rico".
 *
 * Reglas para mantenerla útil:
 *  - El sabor venezolano va en confirmaciones, encabezados y pantallas vacías.
 *  - Los errores van claros primero: qué pasó y qué hacer. Nunca culpan al usuario.
 *  - Los mensajes de validación son cortos: se leen junto al campo.
 *  - Nada de jerga que confunda: "pana", "chévere", "naguará" y "épale" bastan.
 */

/** Las frases del brandbook, tal cual */
export const FRASES_MARCA = [
  'Tu antojo venezolano en El Salvador',
  'Aquí se viene a comer rico',
  'Hoy toca arepita',
  'Naguará, qué rico',
]

const plural = (n, singular, pluralTexto = `${singular}es`) => (n === 1 ? singular : pluralTexto)

// ---------------------------------------------------------------------------
// Encabezados: una frase por página que cambia cada día (no en cada recarga)
// ---------------------------------------------------------------------------
export const FRASES_ENCABEZADO = {
  '/': [
    'Hoy toca arepita: anota lo que llegó a la cocina',
    'Aquí se viene a comer rico… y a llevar las cuentas claras',
    '¿Qué trajimos hoy para la cocina, pana?',
    'Cada insumo cuenta para la sazón',
    'Del mercado a la plancha, todo queda anotado',
  ],
  '/compras': [
    'Naguará, mira todo lo que ha entrado a la cocina',
    'Cuentas claras, arepas bien rellenas',
    'Todo lo que compramos, en un solo lugar',
    'Tu antojo venezolano en El Salvador empieza aquí',
  ],
  '/configuracion': [
    'Cada cosa en su sitio, como en la cocina de la abuela',
    'Ordena tus proveedores, materiales y productos',
    'Un catálogo bien hecho, una sazón bien medida',
  ],
  '/exportar': [
    'Llévate tus cuentas a donde quieras',
    'Las compras, listas para el Excel',
  ],
  '/cargar': [
    'Pronto podrás traer tus datos de otro equipo',
  ],
}

/** Día del año (1–366): la frase cambia a medianoche y es la misma en toda la jornada */
function diaDelAno(fecha) {
  const inicio = new Date(fecha.getFullYear(), 0, 0)
  return Math.floor((fecha - inicio) / 86_400_000)
}

export function fraseDelDia(ruta, fecha = new Date()) {
  const frases = FRASES_ENCABEZADO[ruta] ?? FRASES_ENCABEZADO['/']
  return frases[diaDelAno(fecha) % frases.length]
}

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------
export const ACCESO = {
  titulo: '¡Épale, pana!',
  descripcion: 'Escribe la contraseña para entrar al registro de compras y costos de la cocina.',
  etiqueta: 'Contraseña de acceso',
  boton: 'Entrar',
  faltaContrasena: 'Escribe la contraseña para entrar.',
  incorrecta: 'Esa no es la contraseña. Revísala e inténtalo de nuevo.',
  pie: 'De Panas SV · Aquí se viene a comer rico',
  bloqueado: 'Listo, cerramos la sesión. ¡Nos vemos pronto, pana!',
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------
export const COMPRA = {
  guardada: (proveedor, n) =>
    `¡Listo, pana! La compra en ${proveedor} quedó guardada (${n} ${plural(n, 'material')}).`,
  errorGuardar: detalle =>
    `No pudimos guardar la compra${detalle ? `: ${detalle}` : ''}. Revisa los datos e inténtalo de nuevo.`,
  actualizada: '¡Chévere! La compra quedó actualizada.',
  errorActualizar: detalle =>
    `No pudimos actualizar la compra${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
  eliminada: 'Compra eliminada. La lista quedó al día.',
  errorEliminar: 'No pudimos eliminar la compra. Inténtalo de nuevo en un momento.',
  errorCargar: 'No pudimos traer las compras. Recarga la página para intentarlo de nuevo.',
  confirmarEliminar: {
    titulo: '¿Eliminamos esta compra?',
    mensaje: (proveedor, n) =>
      `Se borrará la compra en ${proveedor} con ${n} ${plural(n, 'material')}. Esto no se puede deshacer.`,
    confirmar: 'Sí, eliminar',
  },
  faltaAsignacion: material =>
    `La compra no se guardó: falta decirnos la categoría y el producto de «${material}».`,
}

// ---------------------------------------------------------------------------
// Validación del formulario (corta: se lee junto al campo)
// ---------------------------------------------------------------------------
export const VALIDACION = {
  resumen: 'Revisa estos campos antes de guardar',
  proveedor: 'Escribe a quién le compraste',
  fecha: 'Elige el día de la compra',
  material: 'Escribe qué compraste',
  cantidad: 'La cantidad debe ser mayor a 0',
  precio: 'El precio debe ser mayor a 0',
  rangoFechas: 'La fecha final debe ser igual o posterior a la inicial',
}

// ---------------------------------------------------------------------------
// Categoría y producto de cada material
// ---------------------------------------------------------------------------
export const ASIGNACION = {
  tituloNuevo: 'Material nuevo',
  tituloExistente: 'Categoría y producto',
  descripcionNuevo: material =>
    `«${material}» es nuevo por aquí. ¿A qué categoría y producto pertenece? Lo recordaremos para las próximas compras.`,
  descripcionExistente: (material, pideCategoria, pideProducto) =>
    pideCategoria && pideProducto
      ? `Cuéntanos a qué categoría y producto pertenece «${material}».`
      : pideCategoria
        ? `Cuéntanos a qué categoría pertenece «${material}».`
        : `Cuéntanos a qué producto se destina «${material}».`,
  noExiste: (texto, esCategoria) =>
    `«${texto}» todavía no existe. Pulsa Enter o «Agregar» para crear ${esCategoria ? 'una categoría nueva' : 'un producto nuevo'}.`,
  faltaCategoria: 'Elige o escribe una categoría',
  faltaProducto: 'Elige o escribe un producto',
  sinCoincidencias: 'Nada por aquí con ese nombre',
  ahoraNo: 'Ahora no',
  guardar: 'Guardar',
  asignado: ({ material, materialNuevo, categoriaNueva, productoNuevo }) => {
    const nuevos = [
      categoriaNueva && `la categoría «${material.categoria}»`,
      productoNuevo && `el producto «${material.producto}»`,
    ].filter(Boolean)
    return (
      `¡Anotado! «${material.nombre}» va a ${material.categoria} · ${material.producto}.` +
      (materialNuevo ? ' Ya quedó en el catálogo.' : '') +
      (nuevos.length ? ` Y estrenamos ${nuevos.join(' y ')}.` : '')
    )
  },
  errorGuardar: detalle =>
    `No pudimos guardar la categoría y el producto${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
}

// ---------------------------------------------------------------------------
// Pantallas vacías y de carga
// ---------------------------------------------------------------------------
export const ESTADOS = {
  cargando: 'Buscando las compras…',
  sinResultados: {
    titulo: 'Nada por aquí',
    texto: 'Prueba con otros filtros o límpialos para ver todo.',
    accion: 'Limpiar filtros',
  },
  sinCompras: {
    titulo: 'Todavía no hay compras',
    texto: '¡Anota la primera, que hoy toca arepita!',
    accion: 'Agregar compra',
  },
}

// ---------------------------------------------------------------------------
// Datos: exportar, cargar y dónde se guardan
// ---------------------------------------------------------------------------
export const DATOS = {
  modoServidor: 'Todo se guarda en la base de datos de la cocina.',
  modoLocal: 'Sin conexión con el servidor: por ahora las compras se guardan solo en este navegador.',
}

// ---------------------------------------------------------------------------
// Configuración: editar proveedores, categorías, materiales y productos
// ---------------------------------------------------------------------------
// Género de cada tipo: "una categoría nueva" pero "un proveedor nuevo"
const GENERO = {
  proveedor: { un: 'un', este: 'este', nuevo: 'Nuevo' },
  categoria: { un: 'una', este: 'esta', nuevo: 'Nueva' },
  material: { un: 'un', este: 'este', nuevo: 'Nuevo' },
  producto: { un: 'un', este: 'este', nuevo: 'Nuevo' },
}

const SECCIONES = {
  proveedor: { titulo: 'Proveedores', singular: 'proveedor', ruta: 'proveedores', descripcion: 'A quién le compramos' },
  categoria: { titulo: 'Categorías', singular: 'categoría', ruta: 'categorias', descripcion: 'Materia prima, limpieza, bebidas…' },
  material: { titulo: 'Materiales', singular: 'material', ruta: 'materiales', descripcion: 'Cada insumo con su categoría y su producto' },
  producto: { titulo: 'Productos', singular: 'producto', ruta: 'productos', descripcion: 'Cachitos, arepas, tequeños…' },
}

/** "la categoría «Lácteos» y el producto «Arepas»" cuando se estrenan al guardar */
function estrenos(r) {
  const nuevos = [
    r.categoriaNueva && `la categoría «${r.categoria}»`,
    r.productoNuevo && `el producto «${r.producto}»`,
  ].filter(Boolean)
  return nuevos.length ? ` Y estrenamos ${nuevos.join(' y ')}.` : ''
}

const usaCompras = tipo => tipo === 'proveedor' || tipo === 'material'

export const CONFIGURACION = {
  intro: 'Elige qué quieres editar. Si le cambias el nombre a algo, también se cambia en las compras que ya guardaste.',
  secciones: SECCIONES,
  elegir: { titulo: 'Elige qué quieres editar', texto: 'Proveedores, categorías, materiales o productos.' },
  cargando: 'Buscando el catálogo…',
  errorCargar: 'No pudimos traer el catálogo. Recarga la página para intentarlo de nuevo.',
  buscar: tipo => `Buscar ${SECCIONES[tipo].singular}`,
  agregar: tipo => `Agregar ${SECCIONES[tipo].singular}`,
  tituloNuevo: tipo => `${GENERO[tipo].nuevo} ${SECCIONES[tipo].singular}`,
  tituloEditar: tipo => `Editar ${SECCIONES[tipo].singular}`,
  nombre: 'Nombre',
  ayudaRenombrar: n =>
    n > 0 ? `Si cambias el nombre, también se cambia en ${n} ${plural(n, 'compra', 'compras')}.` : undefined,
  faltaNombre: 'Escribe el nombre',
  guardar: 'Guardar',
  cancelar: 'Cancelar',
  editar: (tipo, nombre) => `Editar ${SECCIONES[tipo].singular} ${nombre}`,
  eliminar: (tipo, nombre) => `Eliminar ${SECCIONES[tipo].singular} ${nombre}`,
  columnaUso: tipo => (usaCompras(tipo) ? 'Compras' : 'Materiales'),
  sinAsignar: 'Sin asignar',
  sinResultados: 'Nada por aquí con ese nombre',
  vacio: tipo => `Todavía no hay ${SECCIONES[tipo].titulo.toLowerCase()}.`,
  uso: (tipo, n) =>
    usaCompras(tipo)
      ? (n === 0 ? 'Sin compras' : `${n} ${plural(n, 'compra', 'compras')}`)
      : (n === 0 ? 'Sin materiales' : `${n} ${plural(n, 'material')}`),
  agregado: (tipo, r) =>
    `¡Listo, pana! Agregamos ${GENERO[tipo].un} ${SECCIONES[tipo].singular}: «${r.nombre}».` + estrenos(r),
  editado: (tipo, r) =>
    (r.anterior !== r.nombre
      ? `¡Chévere! «${r.anterior}» ahora se llama «${r.nombre}»` +
        (r.compras ? ` y se actualizó en ${r.compras} ${plural(r.compras, 'compra', 'compras')}.` : '.')
      : `¡Chévere! Guardamos los cambios de «${r.nombre}».`) + estrenos(r),
  eliminado: (tipo, r) =>
    `Eliminamos «${r.nombre}».` +
    (r.materiales
      ? ` ${r.materiales} ${plural(r.materiales, 'material')} ${plural(r.materiales, 'quedó', 'quedaron')} sin ${SECCIONES[tipo].singular}; se pedirá al registrar una compra.`
      : ''),
  error: detalle => `No pudimos guardar el cambio${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
  errorEliminar: detalle => `No pudimos eliminarlo${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
  confirmarEliminar: {
    titulo: tipo => `¿Eliminamos ${GENERO[tipo].este} ${SECCIONES[tipo].singular}?`,
    mensaje: (tipo, nombre, n) => {
      const base = `«${nombre}» dejará de aparecer en las opciones.`
      if (usaCompras(tipo)) {
        return base + (n ? ` ${n === 1 ? 'La compra que ya lo usa no cambia' : `Las ${n} compras que ya lo usan no cambian`}.` : '')
      }
      return base + (n
        ? ` ${n} ${plural(n, 'material')} ${plural(n, 'quedará', 'quedarán')} sin ${SECCIONES[tipo].singular} y se ${plural(n, 'pedirá', 'pedirán')} al registrar una compra.`
        : '')
    },
    confirmar: 'Sí, eliminar',
  },
}

// ---------------------------------------------------------------------------
// Exportar y cargar datos
// ---------------------------------------------------------------------------
export const EXPORTAR = {
  intro: 'Elige el rango de fechas y el formato. Sin fechas, exportamos todas las compras.',
  rangoTitulo: 'Rango de fechas',
  rangos: { mes: 'Este mes', mesAnterior: 'Mes pasado', ano: 'Este año', todo: 'Todo' },
  desde: 'Desde',
  hasta: 'Hasta',
  formato: 'Formato',
  formatos: {
    csv: { titulo: 'Excel (.csv)', descripcion: 'Una fila por material, para abrir en Excel o Google Sheets' },
    json: { titulo: 'Respaldo (.json)', descripcion: 'Para pasar las compras a otro equipo' },
  },
  calculando: 'Contando las compras del rango…',
  resumen: (n, total) => `${n} ${plural(n, 'compra', 'compras')} en el rango · ${total} en total`,
  sinCompras: 'No hay compras en ese rango. Prueba con otras fechas.',
  descargar: 'Descargar',
  descargado: n => `¡Listo! Descargamos ${n} ${plural(n, 'compra', 'compras')}. Guarda el archivo en un lugar seguro.`,
  error: detalle => `No pudimos exportar${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
}

export const CARGAR = {
  titulo: 'Estamos trabajando en ello',
  texto: 'Muy pronto vas a poder traer tus compras desde otro equipo. ¡Aguanta un poquito, pana!',
  volver: 'Volver a Agregar compra',
}
