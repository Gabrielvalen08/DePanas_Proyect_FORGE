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
| `comprasACsv(compras)` | CSV con BOM, una fila por material, columnas del Excel del negocio |
| `comprasAJson(compras)` | Compras completas en el formato de `importar-json` |
| `nombreArchivo(desde, hasta, ext)` | `depanas_compras_2026-10-01_2026-10-31.csv` |
| `rangoRapido('mes' \| 'mesAnterior' \| 'ano' \| 'todo')` | `{ desde, hasta }` en fecha local |

`mensajes.js`: **todo lo que el sistema le dice al usuario**, con la voz de marca (Brandbook, diapositiva 10 "Voz de Marca": cercano, venezolano, vibrante).

| Grupo | Contenido |
| ----- | --------- |
| `FRASES_MARCA`, `FRASES_ENCABEZADO`, `fraseDelDia(ruta)` | Frases del brandbook y la frase del encabezado de cada página (cambia una vez al día) |
| `ACCESO` | Pantalla de contraseña y aviso al bloquear |
| `COMPRA` | Guardar, actualizar, eliminar (con su confirmación) y sus errores |
| `VALIDACION` | Mensajes junto a los campos y el resumen de errores |
| `ASIGNACION` | Ventana de categoría y producto y su confirmación |
| `ESTADOS` | Cargando y pantallas vacías |
| `DATOS` | Dónde se guardan las compras (servidor o este navegador) |
| `CONFIGURACION` | Pantalla de Configuración: secciones, ventana de edición, confirmaciones (con el género de cada tipo: "Nueva categoría", "Nuevo proveedor") |
| `EXPORTAR`, `CARGAR` | Pantallas de Exportar y Cargar datos |

Los mensajes con datos son funciones: `COMPRA.guardada('Selectos', 3)` → `"¡Listo, pana! La compra en Selectos quedó guardada (3 materiales)."`.

- El sabor venezolano va en confirmaciones, encabezados y pantallas vacías. Los errores y validaciones van **sin modismos**: qué pasó y qué hacer.
- Un texto nuevo para el usuario se agrega aquí, no en el componente. Los tests lo importan de aquí.
