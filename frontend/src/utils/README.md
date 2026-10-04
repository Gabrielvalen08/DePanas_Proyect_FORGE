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

**No uses `toISOString()` para la fecha de hoy:** convierte a UTC y, después de las 18:00 en El Salvador, devuelve el día siguiente. Usa `fechaHoyISO()`.
