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
 *  - El sabor venezolano va en el acceso, las confirmaciones y las pantallas vacías (los encabezados llevan solo el título).
 *  - Los errores van claros primero: qué pasó y qué hacer. Nunca culpan al usuario.
 *  - Los mensajes de validación son cortos: se leen junto al campo.
 *  - Nada de jerga que confunda: "pana", "chévere", "naguará" y "épale" bastan.
 */

const plural = (n, singular, pluralTexto = `${singular}es`) => (n === 1 ? singular : pluralTexto)
// En toda la interfaz los materiales se llaman «artículos» (en el código y los datos siguen como `material`)
const articulos = n => plural(n, 'artículo', 'artículos')
/** Nombre del formato de un archivo para el usuario: Excel o JSON */
const nombreFormato = formato => (formato === 'json' ? 'JSON' : 'Excel')

// ---------------------------------------------------------------------------
// Acceso
// ---------------------------------------------------------------------------
export const ACCESO = {
  titulo: '¡Épale, pana!',
  descripcion: 'Ingresa tu usuario y contraseña para entrar al registro de compras y costos de la cocina.',
  etiquetaUsuario: 'Usuario',
  etiquetaContrasena: 'Contraseña',
  etiqueta: 'Contraseña de acceso',
  // Ejemplo genérico: nunca un usuario real (no se le dice a nadie qué usuarios existen)
  placeholderUsuario: 'Usuario (ej. Juan_01)',
  placeholderContrasena: '••••',
  boton: 'Ingresar',
  olvideContrasena: 'Olvidé mi contraseña',
  ayudaOlvide: 'Pide al administrador del sistema que te ayude a restablecer tu clave.',
  faltaUsuario: 'Escribe tu usuario para entrar.',
  faltaContrasena: 'Escribe tu contraseña para entrar.',
  incorrecta: 'Usuario o contraseña incorrectos. Revísalos e inténtalo de nuevo.',
  pie: 'De Panas SV · Aquí se viene a comer rico',
  bloqueado: 'Listo, cerramos la sesión. ¡Nos vemos pronto, pana!',
  sesionVencida: 'Tu sesión se cerró por seguridad (mucho tiempo sin uso). Vuelve a entrar.',
  demasiadosIntentos: minutos =>
    `Demasiados intentos con una contraseña incorrecta. Espera ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} y vuelve a intentarlo.`,
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------
export const COMPRA = {
  guardada: '¡Listo, pana! Compra guardada.',
  cambiaParaReintentar: 'Corrige o cambia algún dato para volver a intentar.',
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
      `Se borrará la compra en ${proveedor} con ${n} ${articulos(n)}. Esto no se puede deshacer.`,
    confirmar: 'Sí, eliminar',
  },
  confirmarGuardar: {
    titulo: '¿Guardamos esta compra?',
    // En partes: la cantidad de artículos y el total van en negrita
    mensaje: (proveedor, n, total) => [
      { texto: `Se guardará la compra en ${proveedor} con ` },
      { texto: `${n} ${articulos(n)}`, negrita: true },
      { texto: ' por ' },
      { texto: total, negrita: true },
      { texto: '.' },
    ],
    confirmar: 'Sí, guardar',
  },
  confirmarCancelar: {
    titulo: '¿Cancelamos esta compra?',
    mensaje: 'Se perderá lo que escribiste hasta ahora.',
    confirmar: 'Sí, cancelar',
    volver: 'Seguir editando',
  },
  agregarFila: 'Agregar otro artículo',
  agregarArticulo: material => `Agregar artículo nuevo${material ? `: ${material}` : ''}`,
  editarArticulo: material => `Editar artículo: ${material}`,
  asignarArticulo: material => `Asignar categoría y producto${material ? ` a ${material}` : ''}`,
  sinPermisoEditarArticulo: material => `No tienes permiso para editar el artículo ${material}`,
  articuloIncompleto: 'A este artículo le falta información. Toca el botón de al lado para completarla.',
}

// ---------------------------------------------------------------------------
// Lista de compras (/compras)
// ---------------------------------------------------------------------------
export const LISTA_COMPRAS = {
  titulo: 'Listas de compra',
  columnas: { fecha: 'Fecha', proveedor: 'Proveedor', articulos: 'Artículos', costos: 'Costos' },
  cuenta: n => `${n} ${plural(n, 'compra', 'compras')}`,
  filtrar: 'Filtrar',
  filtrarActivos: n => `Filtrar, ${n} ${plural(n, 'filtro activo', 'filtros activos')}`,
  agregar: 'Agregar compra',
  masAcciones: 'Más acciones de Lista de compras',
  exportar: 'Exportar datos',
  cargar: 'Cargar datos',
  // Selección como en el correo: una casilla por compra y una para todas
  elegirTodas: 'Elegir todas las compras',
  todas: 'Elegir todas',
  elegirUna: (proveedor, fecha) => `Elegir la compra en ${proveedor} del ${fecha}`,
  elegidas: (n, total) => `${n} de ${total} ${plural(total, 'elegida', 'elegidas')}`,
  eliminarElegidas: n => `Eliminar ${n} ${plural(n, 'compra', 'compras')}`,
  eliminadas: n => `${n} ${plural(n, 'compra eliminada', 'compras eliminadas')}. La lista quedó al día.`,
  errorEliminar: detalle => `No pudimos eliminar las compras: ${detalle}. Inténtalo de nuevo.`,
  confirmarEliminarVarias: {
    titulo: n => `¿Eliminamos ${n} ${plural(n, 'compra', 'compras')}?`,
    mensaje: 'Se borrarán con todos sus artículos. Esto no se puede deshacer.',
    confirmar: 'Sí, eliminar',
  },
  // Páginas de 50 compras, con flechas arriba como en el correo
  paginacion: 'Páginas de la lista',
  rango: (desde, hasta, total) => `${desde}–${hasta} de ${total}`,
  anterior: 'Página anterior',
  siguiente: 'Página siguiente',
  // «Elegir todas» elige la página; un aviso ofrece elegir todas las de la lista
  paginaElegida: n => `Elegiste las ${n} compras de esta página.`,
  elegirTodasLista: total => `Elegir las ${total}`,
  todasLaLista: total => `Elegiste las ${total} compras de la lista.`,
  quitarSeleccion: 'Quitar la selección',
}

// ---------------------------------------------------------------------------
// Validación del formulario (corta: se lee junto al campo)
// ---------------------------------------------------------------------------
export const VALIDACION = {
  proveedor: 'Escribe a quién le compraste',
  proveedorPrimero: 'Debes seleccionar el proveedor primero',
  fecha: 'Elige el día de la compra',
  material: 'Escribe qué compraste',
  cantidad: 'Debe ser mayor a 0',
  unidad: 'Elige la unidad',
  precio: 'Debe ser mayor a 0',
  rangoFechas: 'La fecha final debe ser igual o posterior a la inicial',
}

// ---------------------------------------------------------------------------
// Categoría y producto de cada material
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Nombre parecido a otro ya registrado (posible error de dedo)
// ---------------------------------------------------------------------------
export const IVA = {
  titulo: 'IVA',
  subtotal: 'Subtotal',
  total: 'Total',
  etiqueta: tasa => `IVA (${Math.round(tasa * 100)} %)`,
}

export const NOMBRE_PARECIDO = {
  aviso: (escrito, parecido, tipo) => {
    const femenino = tipo === 'categoria'
    return `«${escrito.trim()}» se parece a «${parecido}», que ya está ${femenino ? 'registrada' : 'registrado'}. ` +
      `Revisa si es ${femenino ? 'la misma' : 'el mismo'}.`
  },
}

/** Dónde va un artículo: «Limpieza · Cachitos», o solo la categoría si no lleva productos */
const destinoArticulo = (categoria, producto) => (producto ? `${categoria} · ${producto}` : categoria)

/** « Y estrenamos la categoría «X» y el producto «Y».» cuando se crearon opciones nuevas */
function estrenosAsignacion(categoria, categoriaNueva, productosNuevos) {
  const nuevos = [
    categoriaNueva && `la categoría «${categoria}»`,
    productosNuevos.length === 1 && `el producto «${productosNuevos[0]}»`,
    productosNuevos.length > 1 && `los productos ${productosNuevos.map(p => `«${p}»`).join(', ')}`,
  ].filter(Boolean)
  return nuevos.length ? ` Y estrenamos ${nuevos.join(' y ')}.` : ''
}

export const ASIGNACION = {
  tituloNuevo: 'Artículo nuevo',
  tituloExistente: 'Categoría y producto',
  tituloEditar: 'Editar artículo',
  etiquetaArticulo: 'Artículo',
  nombreArticulo: 'Nombre del artículo',
  faltaNombre: 'Escribe el nombre del artículo',
  yaExiste: nombre => `Ya existe un artículo llamado «${nombre}»`,
  noExiste: (texto, esCategoria, esProveedor = false) =>
    `«${texto}» todavía no existe. Pulsa Enter o «Agregar» para crear ${esCategoria ? 'una categoría nueva' : esProveedor ? 'un proveedor nuevo' : 'un producto nuevo'}.`,
  ayudaBuscador: '¿No aparece la categoría o el producto? Escríbelo en el buscador y lo agregamos.',
  faltaCategoria: 'Elige o escribe una categoría',
  faltaInformacion: (sinCategoria, sinProducto) =>
    sinCategoria && sinProducto
      ? 'Este artículo aún no tiene categoría ni producto asociados.'
      : sinCategoria ? 'Este artículo aún no tiene categoría asociada.' : 'Este artículo aún no tiene producto asociado.',
  etiquetaProductos: 'Productos',
  productoConComa: 'El nombre de un producto no puede llevar comas.',
  sinCoincidencias: 'Nada por aquí con ese nombre',
  ahoraNo: 'Ahora no',
  cancelar: 'Cancelar',
  guardar: 'Guardar',
  confirmar: {
    titulo: '¿Guardamos este artículo?',
    // modo: 'nuevo' | 'completar' | 'editar'. compras: en cuántas compras ya está el artículo
    mensaje: ({ modo, anterior, nombre, categoria, productos, compras }) => {
      const destino = destinoArticulo(categoria, productos.join(', '))
      if (modo === 'nuevo') return `Se agregará «${nombre}» al catálogo, en ${destino}.`
      const renombrado = anterior !== nombre ? `«${anterior}» pasará a llamarse «${nombre}». ` : ''
      const enCompras = compras > 0 ? ` También se actualizará en ${compras} ${plural(compras, 'compra', 'compras')}.` : ''
      return `${renombrado}«${nombre}» quedará en ${destino}.${enCompras}`
    },
    confirmar: 'Sí, guardar',
  },
  asignado: ({ material, materialNuevo, categoriaNueva, productoNuevo, productosNuevos }) => {
    const prods = productosNuevos ?? (productoNuevo ? [material.producto] : [])
    return (
      `¡Anotado! «${material.nombre}» va a ${destinoArticulo(material.categoria, material.producto)}.` +
      (materialNuevo ? ' Ya quedó en el catálogo.' : '') +
      estrenosAsignacion(material.categoria, categoriaNueva, prods)
    )
  },
  editado: ({ anterior, nombre, categoria, producto, compras, categoriaNueva, productosNuevos = [] }) =>
    (anterior !== nombre ? `¡Chévere! «${anterior}» ahora se llama «${nombre}» y va a ` : `¡Anotado! «${nombre}» va a `) +
    `${destinoArticulo(categoria, producto)}.` +
    (compras > 0 ? ` Se actualizó en ${compras} ${plural(compras, 'compra', 'compras')}.` : '') +
    estrenosAsignacion(categoria, categoriaNueva, productosNuevos),
  errorGuardar: detalle =>
    `No pudimos guardar el artículo${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
}

// ---------------------------------------------------------------------------
// Aviso antes de perder datos sin guardar
// ---------------------------------------------------------------------------
export const AVISO_SALIDA = {
  titulo: '¿Salimos sin guardar?',
  mensaje: 'Tienes datos sin registrar. Si sales ahora, se pierden.',
  mensajeSinRegistrar: 'Elegiste un rango y todavía no lo has descargado. Si sales ahora, se pierde.',
  salir: 'Salir sin guardar',
  registrar: 'Registrar',
  seguir: 'Seguir aquí',
}

// ---------------------------------------------------------------------------
// Apagar el sistema (versión del .zip: el servidor corre oculto en la computadora)
// ---------------------------------------------------------------------------
// Una dirección que no existe (/compras/xyz)
export const NO_ENCONTRADA = {
  titulo: 'Pantalla no encontrada',
  texto: 'Esta dirección no lleva a ninguna pantalla de De Panas. Puede que esté mal escrita o que la pantalla haya cambiado de lugar.',
  accion: 'Volver al inicio',
}

export const APAGADO = {
  boton: 'Apagar De Panas SV',
  titulo: 'De Panas SV está apagado',
  texto: 'Ya puedes cerrar esta pestaña. Para volver a usarlo, abre «De Panas SV» desde el escritorio.',
  error: detalle => `No pudimos apagar el sistema${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
}

// ---------------------------------------------------------------------------
// Navegación entre pantallas
// ---------------------------------------------------------------------------
export const NAVEGACION = {
  regresar: 'Regresar',
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
// Catálogo: editar proveedores, categorías, artículos y productos
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
  categoria: { titulo: 'Categorías', singular: 'categoría', ruta: 'categorias', descripcion: 'Agrupan los artículos: materia prima, limpieza…' },
  material: { titulo: 'Artículos', singular: 'artículo', ruta: 'articulos', descripcion: 'Cada insumo con su categoría y su producto' },
  producto: { titulo: 'Productos', singular: 'producto', ruta: 'productos', descripcion: 'Cachitos, arepas… y los artículos que lleva cada uno' },
}

/** "la categoría «Lácteos» y el producto «Arepas»" cuando se estrenan al guardar */
function estrenos(r) {
  const prods = r.productosNuevos ?? (r.productoNuevo ? [r.producto] : [])
  const nuevos = [
    r.categoriaNueva && `la categoría «${r.categoria}»`,
    prods.length === 1 && `el producto «${prods[0]}»`,
    prods.length > 1 && `los productos ${prods.map(p => `«${p}»`).join(', ')}`,
  ].filter(Boolean)
  return nuevos.length ? ` Y estrenamos ${nuevos.join(' y ')}.` : ''
}

const usaCompras = tipo => tipo === 'proveedor' || tipo === 'material'

/** " Actualizamos 2 artículos." cuando cambian los artículos de una categoría o un producto */
const materialesCambiados = r =>
  (r.materiales ? ` Actualizamos ${r.materiales} ${articulos(r.materiales)}.` : '')

export const PANTALLA_CATALOGO = {
  secciones: SECCIONES,
  elegir: { titulo: 'Elige qué quieres editar', texto: 'Proveedores, categorías, artículos o productos.' },
  cargando: 'Buscando el catálogo…',
  errorCargar: 'No pudimos traer el catálogo. Recarga la página para intentarlo de nuevo.',
  buscar: tipo => `Buscar ${SECCIONES[tipo].singular}`,
  agregar: tipo => `Agregar ${SECCIONES[tipo].singular}`,
  tituloNuevo: tipo =>
    tipo === 'producto'
      ? `Agregar ${SECCIONES[tipo].singular}`
      : `${GENERO[tipo].nuevo} ${SECCIONES[tipo].singular}`,
  tituloEditar: tipo => `Editar ${SECCIONES[tipo].singular}`,
  nombre: 'Nombre',
  // En Categorías la columna y el campo del nombre se llaman «Categoría»
  etiquetaNombre: tipo => (tipo === 'categoria' ? 'Categoría' : 'Nombre'),
  ayudaRenombrar: n =>
    n > 0 ? `Si cambias el nombre, también se cambia en ${n} ${plural(n, 'compra', 'compras')}.` : undefined,
  faltaNombre: 'Escribe el nombre',
  guardar: 'Guardar',
  cancelar: 'Cancelar',
  editar: (tipo, nombre) => `Editar ${SECCIONES[tipo].singular} ${nombre}`,
  eliminar: (tipo, nombre) => `Eliminar ${SECCIONES[tipo].singular} ${nombre}`,
  columnaUso: tipo => (usaCompras(tipo) ? 'Compras' : 'Cantidad'),
  sinAsignar: 'Sin asignar',
  columnaMateriales: 'Artículos',
  columnaProductos: 'Productos',
  // Proveedores que surten una categoría: filtran los artículos en Agregar compra
  columnaProveedores: 'Proveedores',
  etiquetaProveedores: 'Proveedores que la surten',
  ayudaProveedores:
    'Al elegir uno de estos proveedores en una compra, solo salen los artículos de esta categoría. Un proveedor sin categorías no sugiere artículos: se escriben a mano.',
  sinProveedores: 'Ninguno',
  // Exportar y Cargar de cada sección (menú ⋮ de su lista)
  archivo: {
    masAcciones: tipo => `Más acciones de ${SECCIONES[tipo].titulo}`,
    exportarExcel: 'Exportar a Excel (.xlsx)',
    exportarJson: 'Exportar respaldo (.json)',
    cargar: 'Cargar respaldo (.json)',
    elegirArchivo: tipo => `Respaldo .json de ${SECCIONES[tipo].titulo.toLowerCase()}`,
    confirmarExportar: {
      titulo: '¿Descargamos el archivo?',
      mensaje: (tipo, n, formato) =>
        `Se descargarán ${n} ${n === 1 ? SECCIONES[tipo].singular : SECCIONES[tipo].titulo.toLowerCase()} en formato ${nombreFormato(formato)}.`,
      confirmar: 'Sí, descargar',
    },
    exportado: (tipo, n) =>
      `¡Listo! Descargamos ${n} ${n === 1 ? SECCIONES[tipo].singular : SECCIONES[tipo].titulo.toLowerCase()}. Guarda el archivo en un lugar seguro.`,
    errorExportar: detalle => `No pudimos exportar${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
    confirmarCargar: {
      titulo: tipo => `¿Cargamos ${SECCIONES[tipo].titulo.toLowerCase()}?`,
      mensaje: (tipo, n, archivo) =>
        `Se cargarán ${n} ${n === 1 ? SECCIONES[tipo].singular : SECCIONES[tipo].titulo.toLowerCase()} de «${archivo}». ` +
        'Lo nuevo se agrega y lo que ya existe se actualiza; no se borra nada.',
      confirmar: 'Sí, cargar',
    },
    // Ventana para elegir qué se exporta o qué se carga (todo empieza elegido)
    seleccion: {
      titulo: (tipo, accion, archivo) => {
        const nombre = SECCIONES[tipo].titulo.toLowerCase()
        if (accion === 'xlsx') return `Exportar ${nombre} a Excel`
        if (accion === 'json') return `Exportar respaldo de ${nombre}`
        return `Cargar ${nombre} de «${archivo}»`
      },
      ayuda: accion => (accion === 'cargar'
        ? 'Elige qué traer del respaldo. Lo nuevo se agrega y lo que ya existe se actualiza.'
        : 'Elige qué entra en el archivo.'),
      buscar: tipo => `Buscar ${SECCIONES[tipo].singular}`,
      elegirTodos: 'Elegir todos',
      quitarTodos: 'Quitar todos',
      cuenta: (n, total) => `${n} de ${total} ${plural(total, 'elegido', 'elegidos')}`,
      ninguno: 'Elige al menos uno para continuar.',
      sinResultados: 'Nada por aquí con ese nombre',
      nuevo: 'Nuevo',
      yaExiste: 'Ya existe',
      boton: (accion, n) => (accion === 'cargar' ? `Cargar ${n}` : `Descargar ${n}`),
      cancelar: 'Cancelar',
      articulos: n => `${n} ${articulos(n)}`,
      sinUbicacion: 'Sin ubicación',
      sinCategoria: 'Sin categoría',
    },
    cargado: (tipo, r) => {
      const cuantos = n => `${n} ${n === 1 ? SECCIONES[tipo].singular : SECCIONES[tipo].titulo.toLowerCase()}`
      return `¡Listo, pana! Agregamos ${cuantos(r.nuevos)} y actualizamos ${cuantos(r.actualizados)}.` +
        (r.omitidos ? ` ${r.omitidos} ${plural(r.omitidos, 'artículo no existe y se omitió', 'artículos no existen y se omitieron')}.` : '')
    },
    errorCargar: detalle => `No pudimos cargar el archivo${detalle ? `: ${detalle}` : ''}`,
  },
  // Ficha del proveedor (su ventana al agregarlo o editarlo, y columnas de la tabla)
  ficha: {
    ubicacion: 'Ubicación',
    telefonos: 'Teléfonos',
    telefono: n => `Teléfono ${n}`,
    agregarTelefono: 'Agregar teléfono',
    quitarTelefono: n => `Quitar teléfono ${n}`,
    contactos: 'Contactos',
    sinContactos: 'Todavía no hay contactos.',
    nombre: 'Nombre',
    telefonoOpcional: 'Teléfono (opcional)',
    contactoNombre: n => `Nombre del contacto ${n}`,
    contactoTelefono: n => `Teléfono del contacto ${n}`,
    agregarContacto: 'Agregar contacto',
    quitarContacto: n => `Quitar contacto ${n}`,
    columnaTelefono: 'Teléfono',
    columnaContacto: 'Contacto',
    otros: n => `+${n}`,
    sinDato: '—',
  },
  listaMateriales: (nombres, max = 4) =>
    nombres.length <= max ? nombres.join(', ') : `${nombres.slice(0, max).join(', ')} y ${nombres.length - max} más`,
  // Ventana de edición de una categoría o un producto: qué artículos lleva
  materiales: {
    titulo: tipo => (tipo === 'categoria' ? 'Artículos de esta categoría' : 'Artículos que lleva este producto'),
    nota: tipo =>
      tipo === 'categoria'
        ? 'Cada artículo va en una sola categoría: si eliges uno que está en otra, se cambia a esta. El que quites queda sin categoría.'
        : 'Un artículo puede ir en varios productos: el que elijas suma este a los que ya tenía, y el que quites deja de ir en este.',
    buscar: 'Buscar artículo',
    elegidos: n => `${n} ${plural(n, 'elegido', 'elegidos')}`,
    ahoraEn: (tipo, nombre) => (nombre ? `Ahora en «${nombre}»` : tipo === 'categoria' ? 'Sin categoría' : 'Sin producto'),
    tambienEn: otros => (otros ? `También en «${otros}»` : ''),
    ninguno: 'Todavía no hay artículos. Agrégalos en la sección Artículos.',
    sinResultados: 'Ningún artículo con ese nombre',
    // Panel doble del producto: un clic pasa el artículo de un lado al otro
    todosElegidos: 'Ya elegiste todos los artículos.',
    ningunoElegido: 'Todavía no lleva artículos. Toca uno de la izquierda para sumarlo.',
    agregar: nombre => `Agregar ${nombre}`,
    quitar: nombre => `Quitar ${nombre}`,
  },
  sinResultados: 'Nada por aquí con ese nombre',
  limpiarBusqueda: 'Limpiar búsqueda',
  vacio: tipo => `Todavía no hay ${SECCIONES[tipo].titulo.toLowerCase()}.`,
  uso: (tipo, n) =>
    usaCompras(tipo)
      ? (n === 0 ? 'Sin compras' : `${n} ${plural(n, 'compra', 'compras')}`)
      : (n === 0 ? 'Sin artículos' : `${n} ${articulos(n)}`),
  agregado: (tipo, r) =>
    `¡Listo, pana! Agregamos ${GENERO[tipo].un} ${SECCIONES[tipo].singular}: «${r.nombre}».` + estrenos(r) + materialesCambiados(r),
  editado: (tipo, r) =>
    (r.anterior !== r.nombre
      ? `¡Chévere! «${r.anterior}» ahora se llama «${r.nombre}»` +
        (r.compras ? ` y se actualizó en ${r.compras} ${plural(r.compras, 'compra', 'compras')}.` : '.')
      : `¡Chévere! Guardamos los cambios de «${r.nombre}».`) + estrenos(r) + materialesCambiados(r),
  eliminado: (tipo, r) =>
    `Eliminamos «${r.nombre}».` +
    (r.materiales
      ? ` ${r.materiales} ${articulos(r.materiales)} ${plural(r.materiales, 'quedó', 'quedaron')} sin ${SECCIONES[tipo].singular}; se pedirá al registrar una compra.`
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
        ? ` ${n} ${articulos(n)} ${plural(n, 'quedará', 'quedarán')} sin ${SECCIONES[tipo].singular} y se ${plural(n, 'pedirá', 'pedirán')} al registrar una compra.`
        : '')
    },
    confirmar: 'Sí, eliminar',
  },
}

// ---------------------------------------------------------------------------
// Gestor de usuarios (solo el administrador)
// ---------------------------------------------------------------------------
export const USUARIOS = {
  titulo: 'Usuarios',
  agregar: 'Agregar usuario',
  cargando: 'Buscando los usuarios…',
  errorCargar: 'No pudimos traer los usuarios. Recarga la página para intentarlo de nuevo.',
  columnas: { usuario: 'Usuario', nombre: 'Nombre', pantallas: 'Pantallas' },
  roles: { admin: 'Administrador', operador: 'Operador', empleado: 'Empleado' },
  rolTitulo: 'Rol',
  rolAyuda: 'Cada rol trae sus pantallas y funciones. Al cambiarlo se aplican las suyas; después puedes ajustarlas.',
  /** Qué trae cada rol al elegirlo */
  descripcionRol: {
    operador: 'Todas las pantallas y funciones, menos el Gestor de usuarios',
    empleado: 'Registra compras y las corrige. Sin Catálogo, sin eliminar compras y sin exportar ni cargar',
  },
  funcionesLimitadas: n => `${n} ${n === 1 ? 'función bloqueada' : 'funciones bloqueadas'}`,
  todas: 'Todas',
  cuentaPantallas: (n, total) => `${n} de ${total}`,
  tu: 'Tú',
  editar: usuario => `Editar usuario ${usuario}`,
  eliminar: usuario => `Eliminar usuario ${usuario}`,
  tituloNuevo: 'Nuevo usuario',
  tituloEditar: usuario => `Editar a ${usuario}`,
  campos: {
    usuario: 'Nombre de usuario para ingresar',
    nombre: 'Nombre',
    contrasena: 'Contraseña',
    contrasenaNueva: 'Nueva contraseña',
    confirmar: 'Repite la contraseña',
  },
  ayudas: {
    usuario: 'Con esto inicia sesión. De 3 a 30 letras, números, _ . o -, sin espacios. No se cambia después.',
    usuarioFijo: 'El usuario no se puede cambiar.',
    contrasena: 'Distinta a la de los demás usuarios.',
    contrasenaEditar: 'Déjala en blanco para no cambiarla.',
  },
  requisitosLista: 'La contraseña necesita:',
  requisitoCumple: 'cumple',
  requisitoFalta: 'falta',
  permisosTitulo: 'Pantallas y funciones',
  permisosAdmin: 'El administrador entra a todas las pantallas y puede hacer todo, también en las que se agreguen más adelante.',
  funcionesDe: titulo => `Qué puede hacer en ${titulo}`,
  /** Cada función que se puede quitar dentro de una pantalla */
  funciones: {
    'compras.editar': 'Editar compras',
    'compras.eliminar': 'Eliminar compras',
    'catalogo.agregar': 'Agregar',
    'catalogo.editar': 'Editar',
    'catalogo.eliminar': 'Eliminar',
    'catalogo.exportar': 'Exportar',
    'catalogo.cargar': 'Cargar respaldos',
  },
  permisosNota: 'El Gestor de usuarios es solo del administrador.',
  /** Lo que se hace en cada pantalla asignable (el título sale de navegacion.js) */
  pantallas: {
    '/': 'Registrar lo que llega a la cocina',
    '/compras': 'Ver, editar y eliminar las compras',
    '/catalogo': 'Proveedores, categorías, artículos y productos',
    '/exportar': 'Descargar las compras en Excel o JSON',
    '/cargar': 'Traer datos de otro equipo',
  },
  validacion: {
    usuario: 'El usuario lleva de 3 a 30 letras, números, _ . o - (sin espacios)',
    usuarioRepetido: usuario => `Ya existe el usuario «${usuario}». Elige otro`,
    nombre: 'Escribe el nombre de la persona',
    nombreLargo: 'El nombre es muy largo (máximo 60 caracteres)',
    noCoinciden: 'Las contraseñas no coinciden',
    permisos: 'Elige al menos una pantalla',
    gestor: 'El Gestor de usuarios es solo del administrador',
    pantallaDesconocida: ruta => `La pantalla «${ruta}» no existe`,
    rol: 'Elige un rol',
    unAdmin: 'Solo puede haber un administrador',
    funciones: 'Las funciones deben ser una lista',
    funcionDesconocida: f => `La función «${f}» no existe`,
    adminNoSeElimina: 'El administrador no se puede eliminar',
    noExiste: usuario => `No existe el usuario «${usuario}»`,
    incorrecta: 'Usuario o contraseña incorrectos',
  },
  guardar: 'Guardar',
  cancelar: 'Cancelar',
  creado: u => `¡Listo, pana! ${u.nombre} ya puede entrar como «${u.usuario}».`,
  editado: u => `¡Chévere! Guardamos los cambios de «${u.usuario}».`,
  eliminado: usuario => `Eliminamos a «${usuario}». Ya no podrá entrar al sistema.`,
  error: detalle => `No pudimos guardar el usuario${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
  errorEliminar: detalle => `No pudimos eliminar el usuario${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
  /** Requisitos de las contraseñas (solo el administrador los cambia) */
  requisitos: {
    titulo: 'Requisitos de contraseña',
    editar: 'Editar requisitos',
    tituloEditor: 'Requisitos de contraseña',
    minimo: 'Mínimo de caracteres',
    ayudaMinimo: (min, max) => `De ${min} a ${max}.`,
    opciones: {
      mayuscula: 'Al menos una letra mayúscula',
      minuscula: 'Al menos una letra minúscula',
      numero: 'Al menos un número',
      especial: 'Al menos un carácter especial (! @ # $ % & * …)',
    },
    guardado: '¡Listo! Las contraseñas nuevas ya piden estos requisitos.',
    error: detalle => `No pudimos guardar los requisitos${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
    errorCargar: 'No pudimos traer los requisitos de contraseña. Recarga la página para intentarlo de nuevo.',
  },
  confirmarEliminar: {
    titulo: '¿Eliminamos este usuario?',
    mensaje: (usuario, nombre) => `${nombre} («${usuario}») ya no podrá entrar al sistema. Esto no se puede deshacer.`,
    confirmar: 'Sí, eliminar',
  },
}

// ---------------------------------------------------------------------------
// Exportar y cargar datos
// ---------------------------------------------------------------------------
export const EXPORTAR = {
  /** Hoja «Resumen» del Excel: el reporte de gastos del rango exportado */
  hojaResumen: {
    hoja: 'Resumen',
    titulo: 'Resumen de gastos',
    desde: 'Desde',
    hasta: 'Hasta',
    compras: 'Compras',
    articulos: 'Artículos',
    subtotal: 'Subtotal',
    iva: 'IVA',
    total: 'Total',
    porProveedor: 'Por proveedor',
    porCategoria: 'Por categoría',
    porMes: 'Por mes',
  },
  rangoTitulo: 'Rango de fechas',
  rangos: { mes: 'Este mes', mesAnterior: 'Mes pasado', ano: 'Este año', todo: 'Todo' },
  desde: 'Desde',
  hasta: 'Hasta',
  formato: 'Formato',
  formatos: {
    xlsx: { titulo: 'Excel (.xlsx)', descripcion: 'Una fila por artículo y una hoja con el resumen de gastos; se abre directo en Excel o Google Sheets' },
    json: { titulo: 'Respaldo (.json)', descripcion: 'Para pasar las compras a otro equipo' },
  },
  calculando: 'Contando las compras del rango…',
  resumen: (n, total) => `${n} ${plural(n, 'compra', 'compras')} en el rango · ${total} en total`,
  sinCompras: 'No hay compras en ese rango. Prueba con otras fechas.',
  verTodo: 'Ver todas las fechas',
  descargar: 'Descargar',
  descargado: n => `¡Listo! Descargamos ${n} ${plural(n, 'compra', 'compras')}. Guarda el archivo en un lugar seguro.`,
  error: detalle => `No pudimos exportar${detalle ? `: ${detalle}` : ''}. Inténtalo de nuevo.`,
}

export const CARGAR = {
  titulo: 'Archivo de compras',
  archivo: 'Elegir archivo',
  ningunArchivo: 'Todavía no has elegido un archivo',
  soltar: 'También puedes soltarlo aquí',
  ayuda: 'Usa el respaldo .json que descargaste en Exportar datos. Cada compra llega con todos sus artículos.',
  // Errores: claros y sin modismos
  extension: 'Ese archivo no es .json. Elige el respaldo que descargaste en Exportar datos.',
  jsonInvalido: 'No pudimos leer el archivo: no es un JSON válido.',
  sinSeleccion: 'Elige al menos una compra.',
  minimo: 'Marca al menos un artículo o no traigas esta compra.',
  error: detalle => `No pudimos cargar los datos: ${detalle}`,
  // Selección
  seleccion: 'Elige las compras',
  proveedor: 'Proveedor', fecha: 'Fecha', total: 'Total',
  todas: 'Elegir todas', ninguna: 'Quitar selección',
  elegir: n => `Elegir compra ${n}`,
  resumen: (n, total) => `${n} ${plural(n, 'compra elegida', 'compras elegidas')} · ${total}`,
  importar: 'Cargar compras',
  estado: { nueva: 'Nueva', identica: 'Ya está guardada', conflicto: 'Trae cambios' },
  // Comparación
  comparar: 'Comparar compra',
  compararAyuda: 'Esta compra ya está guardada, pero el archivo trae cambios. Marca los artículos que se quedan: la compra final lleva exactamente los que marques de cada lado.',
  existente: 'Compra guardada', entrante: 'Compra del archivo',
  material: 'Artículo', cantidad: 'Cantidad', unidad: 'Unidad', monto: 'Precio', categoria: 'Categoría', producto: 'Producto',
  conservar: (lado, n) => `Conservar artículo ${n} de ${lado}`,
  final: 'Compra final',
  leyendaMuestra: 'Así',
  leyenda: 'se marca lo que cambió entre las dos compras.',
  cambio: 'cambió',
  soloAqui: 'Solo en esta compra',
  descartar: 'No traer esta compra',
  recuperar: 'Mejor sí traerla',
  descartadaNota: 'Tranquilo, pana: la compra guardada se queda tal como está.',
  aplicar: 'Guardar y cargar',
  volver: 'Volver a elegir compras',
  // Confirmación: con la voz de la casa, y solo nombra lo que pasó
  resultado: ({ nuevas = 0, actualizadas = 0, omitidas = 0, descartadas = 0 }) => {
    const hechas = [
      nuevas && `${nuevas} ${plural(nuevas, 'compra nueva llegó a la cocina', 'compras nuevas llegaron a la cocina')}`,
      actualizadas && `${actualizadas} ${plural(actualizadas, 'se actualizó', 'se actualizaron')}`,
    ].filter(Boolean)
    const intactas = [
      omitidas && `${omitidas} ya ${plural(omitidas, 'estaba guardada', 'estaban guardadas')}`,
      descartadas && `${descartadas} ${plural(descartadas, 'quedó', 'quedaron')} como ${plural(descartadas, 'estaba', 'estaban')}`,
    ].filter(Boolean)
    const unir = partes => (partes.length > 1 ? `${partes[0]} y ${partes[1]}` : partes[0])
    if (!hechas.length && !intactas.length) return 'Nada que cargar esta vez: el archivo no trajo compras nuevas.'
    if (!hechas.length) return `¡Todo en orden, pana! ${unir(intactas)}, así que no cambiamos nada.`
    const extra = intactas.length ? ` ${unir(intactas)}.` : ''
    return `¡Listo, pana! ${unir(hechas)}.${extra}`
  },
  vacio: 'El archivo está bien, pero viene vacío: no trae compras.',
  verLista: 'Ver la Lista de compras',
}

// ---------------------------------------------------------------------------
// Confirmaciones de los botones de acción (guardar, descartar, cargar, descargar…)
// Las de Compras y las de eliminar viven en COMPRA y en cada pantalla.
// ---------------------------------------------------------------------------
export const CONFIRMAR = {
  guardarCambios: {
    titulo: '¿Guardamos los cambios?',
    mensaje: 'Se aplicarán de inmediato.',
    confirmar: 'Sí, guardar',
  },
  descartar: {
    titulo: '¿Descartamos los cambios?',
    mensaje: 'Se perderá lo que escribiste hasta ahora.',
    confirmar: 'Sí, descartar',
    volver: 'Seguir editando',
  },
  apagar: {
    titulo: '¿Apagamos De Panas SV?',
    mensaje: 'El sistema se cierra en esta computadora. Para volver a usarlo, abre «De Panas SV» desde el escritorio.',
    confirmar: 'Sí, apagar',
  },
  cerrarSesion: {
    titulo: '¿Cerramos la sesión?',
    mensaje: 'Para volver a entrar necesitarás tu usuario y tu contraseña.',
    confirmar: 'Sí, cerrar sesión',
  },
  cargar: {
    titulo: '¿Cargamos estas compras?',
    mensaje: (n, total) => `Se cargarán ${n} ${plural(n, 'compra', 'compras')} por ${total}.`,
    confirmar: 'Sí, cargar',
  },
  descargar: {
    titulo: '¿Descargamos el archivo?',
    mensaje: (n, total, formato) =>
      `Se descargarán ${n} ${plural(n, 'compra', 'compras')} por ${total} en formato ${nombreFormato(formato)}.`,
    confirmar: 'Sí, descargar',
  },
}
