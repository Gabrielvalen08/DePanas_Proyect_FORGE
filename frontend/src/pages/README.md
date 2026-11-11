# pages/

Una página por ruta (definidas en `App.jsx`). Cada página renderiza `<Header>` y un `<main id="contenido" tabIndex={-1}>`, que es el destino del enlace "Saltar al contenido" y recibe el foco al cambiar de ruta.

| Ruta       | Página            | Notas                                                         |
| ---------- | ----------------- | ------------------------------------------------------------- |
| `/`        | `AgregarCompra`   | Página principal. Uno o varios `BloqueCompra` (una compra = un proveedor y una fecha); cada uno se guarda por separado. "Nueva compra" agrega otro bloque; aparece cuando alguna compra ya tiene una fila completa. Al guardar, el bloque se vacía (o se quita si hay varios) |
| `/compras` | `PantallaMaestra` | Tabla de compras (fecha, proveedor, artículos, costos), de la más reciente a la más vieja. Toda la fila abre `DetalleLista`. Casillas como en el correo (una por compra; «Elegir todas» en el encabezado elige la página y un aviso ofrece elegir todas las de la lista; la fila elegida cambia de color). Con más de 50 compras va por páginas de 50 («1–50 de 380» con flechas, arriba). En el encabezado: páginas, ícono Eliminar (solo con algo elegido y con permiso), Filtrar (ícono), Agregar compra (con texto) y el ⋮ (`MenuAcciones`: Exportar y Cargar datos); los filtros (`FiltrosEnLinea`) se despliegan sobre la tabla y filtran en vivo |
| `/catalogo`, `/catalogo/:seccion` | `PantallaCatalogo` | Cuatro opciones (proveedores, categorías, materiales, productos); cada una abre su lista para agregar, renombrar o eliminar, con buscador y cuánto se usa cada opción. Las categorías y los productos muestran sus materiales y los eligen en su ventana. Edita con `EditorCatalogo` y elimina con `ConfirmDialog` |
| `/exportar` | `PantallaExportar` | Rango de fechas (o rápido: este mes, mes pasado, este año, todo), formato Excel (.xlsx) o JSON y resumen en vivo de compras y total antes de descargar |
| `/cargar` | `PantallaCargar` | Elige compras de un JSON de Exportar: las nuevas se cargan, las duplicadas se omiten y las modificadas se comparan (`CompararCompra`) antes de guardar |
| `/usuarios` | `PantallaUsuarios` | Gestor de usuarios (solo el administrador). Tabla con usuario, rol, nombre, pantallas y cuántas funciones tiene bloqueadas; crea y edita con `EditorUsuario` (nombre, usuario para ingresar, contraseña con confirmación y requisitos en vivo, rol que trae sus permisos, pantallas y funciones de cada una) y elimina con `ConfirmDialog`. Debajo, la tarjeta de **requisitos de contraseña**, que se editan con `EditorRequisitos`. Un usuario o una contraseña repetidos, o una contraseña que no cumple, se marcan en su campo |

`/agregar-compra` redirige a `/` (ruta antigua).

Cada ruta pide su permiso (`protegida` en `App.jsx`, reglas en `utils/permisos.js`): sin él, redirige a la primera pantalla que el usuario sí puede ver. El menú y los enlaces a otras pantallas solo muestran lo que el usuario puede abrir.

`PantallaContrasena` no es una ruta: `App.jsx` la muestra en lugar de todo lo demás mientras `useAuth().autenticado` sea `false`. Pide usuario y contraseña, y su fondo es transparente para dejar ver el collage.

`PantallaApagado` tampoco es una ruta: en la versión .zip (`desktop/`), tras «Apagar De Panas SV» (`apagarSistema` de `services/api.js`, solo si `puedeApagar()`), `App.jsx` la muestra en lugar de todo lo demás, porque el servidor ya no responde.

Cada página pasa a `<Header>` solo su título (y `alRegresar` si se abre desde otra pantalla); los encabezados no llevan frase.

## Convenciones
- Los datos solo se piden a `services/api.js`. Nunca `fetch` ni `localStorage` desde una página.
- El layout común de `<main>` (ancho máximo, márgenes, separación) viene de `App.module.css`.
- Los tests de página renderizan dentro de `<MemoryRouter>` y `<ToastProvider>`. `AgregarCompra.test.jsx` simula `api.js` con `vi.mock`; `PantallaMaestra.test.jsx` usa `api.js` real en modo local, sobre `localStorage` (se limpia antes de cada test). Los textos esperados se importan de `utils/mensajes.js`.
