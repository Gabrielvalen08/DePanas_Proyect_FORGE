# utils/

Funciones puras, sin React. Cada archivo tiene su `*.test.js`.

`formato.js`:

| Función                 | Ejemplo                                                |
| ----------------------- | ------------------------------------------------------ |
| `formatearPrecio(12.5)` | `"$12.50"`                                             |
| `formatearFecha('2026-09-28')` | `"28/09/2026"`                                  |
| `formatearFechaTexto('2026-09-28')` | `"28 de septiembre de 2026"`               |
| `formatearFechaLarga(new Date())` | `"sábado, 3 de octubre de 2026"`             |
| `fechaHoyISO()`         | Fecha **local** `"YYYY-MM-DD"`                          |
| `textoBusqueda('Jamón')` | `"jamon"`: minúsculas y sin tildes, misma longitud (para buscar y resaltar coincidencias) |

**No uses `toISOString()` para la fecha de hoy:** convierte a UTC y, después de las 18:00 en El Salvador, devuelve el día siguiente. Usa `fechaHoyISO()`.

`exportar.js`: archivos de la pantalla Exportar.

| Función | Qué hace |
| ------- | -------- |
| `comprasAXlsx(compras)`, `catalogoAXlsx(tipo, filas)` | Excel `.xlsx` real (promesa de un `Blob`): una fila por artículo con las columnas del Excel del negocio, o una por ítem de la sección; números como números y encabezado en negrita |
| `comprasAJson(compras)` | Compras completas en el formato de `importar-json` |
| `nombreArchivo(desde, hasta, ext)` | `depanas_compras_2026-10-01_2026-10-31.xlsx` |
| `rangoRapido('mes' \| 'mesAnterior' \| 'ano' \| 'todo')` | `{ desde, hasta }` en fecha local |

`mensajes.js`: **todo lo que el sistema le dice al usuario**, con la voz de marca (Brandbook, diapositiva 10 "Voz de Marca": cercano, venezolano, vibrante).

| Grupo | Contenido |
| ----- | --------- |
| `FRASES_MARCA`, `FRASES_ENCABEZADO`, `fraseDelDia(ruta)` | Frases del brandbook y la frase del encabezado de cada página (cambia una vez al día) |
| `ACCESO` | Pantalla de acceso y aviso al cerrar sesión |
| `USUARIOS` | Gestor de usuarios: textos, roles y su descripción, nombres de las funciones, requisitos de contraseña, validaciones (las mismas del backend) y avisos |
| `COMPRA` | Guardar, actualizar, eliminar (con su confirmación) y sus errores |
| `LISTA_COMPRAS` | Tabla de Lista de compras y su menú ⋮ (Exportar, Cargar) |
| `VALIDACION` | Mensajes junto a los campos |
| `ASIGNACION` | Ventana de categoría y producto y su confirmación |
| `NAVEGACION` | Textos comunes de navegación (Regresar) |
| `ESTADOS` | Cargando y pantallas vacías |
| `PANTALLA_CATALOGO` | Pantalla del Catálogo: secciones, ventana de edición (también los proveedores de cada categoría), confirmaciones (con el género de cada tipo: "Nueva categoría", "Nuevo proveedor") |
| `EXPORTAR`, `CARGAR` | Pantallas de Exportar y Cargar datos |
| `CONFIRMAR` | Confirmaciones comunes: guardar cambios, descartar, cerrar sesión, cargar, descargar |

Los mensajes con datos son funciones: `ASIGNACION.categoriasDelProveedor('Selectos')` → `"Primero van las categorías de Selectos. Si eliges otra, también quedará como suya."`.

- El sabor venezolano va en confirmaciones, encabezados y pantallas vacías. Los errores y validaciones van **sin modismos**: qué pasó y qué hacer.
- Un texto nuevo para el usuario se agrega aquí, no en el componente. Los tests lo importan de aquí.
