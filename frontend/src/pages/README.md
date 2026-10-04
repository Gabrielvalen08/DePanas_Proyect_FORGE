# pages/

Una página por ruta (definidas en `App.jsx`). Cada página renderiza `<Header>` y un `<main id="contenido" tabIndex={-1}>`, que es el destino del enlace "Saltar al contenido" y recibe el foco al cambiar de ruta.

| Ruta              | Página            | Notas                                                         |
| ----------------- | ----------------- | ------------------------------------------------------------- |
| `/`               | `Inicio`          | Bienvenida con el badge oficial y dos acciones rápidas (enlaces) |
| `/compras`        | `PantallaMaestra` | Tabla, filtros y eliminación con confirmación. En móvil, filas como tarjetas |
| `/agregar-compra` | `AgregarCompra`   | Registro en lote. Validación al salir del campo y resumen de errores al guardar. Bajo 1100px, filas como tarjetas |

## Convenciones
- Los datos solo se piden a `services/api.js`. Nunca `fetch` ni `localStorage` desde una página.
- El layout común de `<main>` (ancho máximo, márgenes, separación) viene de `App.module.css`.
- Los tests de página renderizan dentro de `<MemoryRouter>` y `<ToastProvider>`. `AgregarCompra.test.jsx` simula `api.js` con `vi.mock`; `PantallaMaestra.test.jsx` usa el mock real sobre `localStorage`.
