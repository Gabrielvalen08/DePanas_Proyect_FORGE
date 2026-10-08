# pages/

Una página por ruta (definidas en `App.jsx`). Cada página renderiza `<Header>` y un `<main id="contenido" tabIndex={-1}>`, que es el destino del enlace "Saltar al contenido" y recibe el foco al cambiar de ruta.

| Ruta       | Página            | Notas                                                         |
| ---------- | ----------------- | ------------------------------------------------------------- |
| `/`        | `AgregarCompra`   | Página principal. Uno o varios `BloqueCompra` (una compra = un proveedor y una fecha); cada uno se guarda por separado. "Nueva compra" agrega otro bloque. Al guardar, el bloque se vacía (o se quita si hay varios) |
| `/compras` | `PantallaMaestra` | Tabla de compras (proveedor, materiales, gasto total, fecha). Toda la fila abre `DetalleLista`. Filtros en línea con `FiltrosEnLinea`, en vivo |

| `/configuracion`, `/configuracion/:seccion` | `PantallaConfiguracion` | Cuatro opciones (proveedores, categorías, materiales, productos); cada una abre su lista para agregar, renombrar o eliminar, con buscador y cuánto se usa cada opción. Edita con `EditorCatalogo` y elimina con `ConfirmModal` |
| `/exportar` | `PantallaExportar` | Rango de fechas (o rápido: este mes, mes pasado, este año, todo), formato CSV o JSON y resumen en vivo de compras y total antes de descargar |
| `/cargar` | `PantallaCargar` | "Estamos trabajando en ello" |
| `/usuarios` | `PantallaUsuarios` | Gestor de usuarios (solo el administrador). Tabla con usuario, nombre, rol y pantallas; crea y edita con `EditorUsuario` (usuario, nombre, contraseña con confirmación y las pantallas a las que entra) y elimina con `ConfirmModal`. Un usuario o una contraseña repetidos se marcan en su campo para cambiarlos |

`/agregar-compra` redirige a `/` (ruta antigua). Los botones Exportar datos y Cargar datos de Agregar compra son enlaces a `/exportar` y `/cargar`.

Cada ruta pide su permiso (`protegida` en `App.jsx`, reglas en `utils/permisos.js`): sin él, redirige a la primera pantalla que el usuario sí puede ver. Los enlaces a otras pantallas (Exportar, Cargar, Agregar compra) solo se muestran si el usuario puede entrar.

`PantallaContrasena` no es una ruta: `App.jsx` la muestra en lugar de todo lo demás mientras `useAuth().autenticado` sea `false`. Pide usuario y contraseña, y su fondo es transparente para dejar ver el collage.

Cada página pasa a `<Header>` su `frase` del día: `fraseDelDia('/')` o `fraseDelDia('/compras')`.

## Convenciones
- Los datos solo se piden a `services/api.js`. Nunca `fetch` ni `localStorage` desde una página.
- El layout común de `<main>` (ancho máximo, márgenes, separación) viene de `App.module.css`.
- Los tests de página renderizan dentro de `<MemoryRouter>` y `<ToastProvider>`. `AgregarCompra.test.jsx` simula `api.js` con `vi.mock`; `PantallaMaestra.test.jsx` usa `api.js` real en modo local, sobre `localStorage` (se limpia antes de cada test). Los textos esperados se importan de `utils/mensajes.js`.
