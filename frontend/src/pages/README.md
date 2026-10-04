# pages/

Una página por ruta (definidas en `App.jsx`). Cada página renderiza `<Header>` y un `<main id="contenido" tabIndex={-1}>`, que es el destino del enlace "Saltar al contenido" y recibe el foco al cambiar de ruta.

| Ruta       | Página            | Notas                                                         |
| ---------- | ----------------- | ------------------------------------------------------------- |
| `/`        | `AgregarCompra`   | Página principal. Uno o varios `BloqueCompra` (una compra = un proveedor y una fecha); cada uno se guarda por separado. "Nueva compra" agrega otro bloque. Al guardar, el bloque se vacía (o se quita si hay varios) |
| `/compras` | `PantallaMaestra` | Tabla de listas (proveedor, productos, gasto total, fecha). Toda la fila abre `DetalleLista`. Filtros en línea con `FiltrosEnLinea`, en vivo |

`/agregar-compra` redirige a `/` (ruta antigua).

## Convenciones
- Los datos solo se piden a `services/api.js`. Nunca `fetch` ni `localStorage` desde una página.
- El layout común de `<main>` (ancho máximo, márgenes, separación) viene de `App.module.css`.
- Los tests de página renderizan dentro de `<MemoryRouter>` y `<ToastProvider>`. `AgregarCompra.test.jsx` simula `api.js` con `vi.mock`; `PantallaMaestra.test.jsx` usa el mock real sobre `localStorage` (se limpia antes de cada test).
