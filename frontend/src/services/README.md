# services/

`api.js` es la **única capa de datos**. Las páginas y componentes nunca usan `fetch` ni `localStorage` directamente.

## Dos modos que nunca se mezclan

`detectarModo()` llama una vez por carga a `GET /api/health` (la arranca `main.jsx`; en modo servidor resuelve después de traer el catálogo). Antes de saber el modo, `getProveedores()`, `getMateriales()`, etc. devuelven listas vacías: nunca se cuelan los datos de ejemplo del modo local:

- **servidor:** todo va al backend (`/api/compras`, `/api/catalogo`, `/api/db/…`) y sus errores llegan a la UI con el mensaje del servidor. Nada se copia a `localStorage`.
- **local:** sin backend, todo vive en `localStorage`: `depanas_listas` (compras, con `MOCK_LISTAS` de ejemplo) y `depanas_catalogo` (lo que el usuario agregó al catálogo).

No agregues caídas silenciosas a `localStorage` cuando el backend falla.

## Funciones

| Función | Qué hace |
| ------- | -------- |
| `fetchListas(filtros)` | Compras, con filtros `proveedor`, `material`, `fechaDesde`, `fechaHasta` |
| `guardarLista`, `actualizarLista(id, …)`, `eliminarLista(id)` | Escrituras de una compra completa |
| `exportarCompras({ desde, hasta, formato })` | Descarga las compras del rango como `csv` o `json`; si no hay compras, lanza un error en vez de bajar un archivo vacío |
| `exportarDB`, `importarDB(archivo)` | `.db` (reemplaza la base, solo con servidor) o `.json` (pasa por `importarCompras`). Sin pantalla |
| `leerComprasJSON(archivo)`, `analizarCompras(compras)`, `importarCompras(compras, decisiones)` | Cargar datos: valida y recorta, marca cada compra como nueva, duplicada o modificada, y guarda el lote (ver `shared/`) |
| `fetchCatalogo()` | Catálogo completo recién leído, con `uso` (compras por proveedor/material, materiales por categoría/producto) |
| `agregarAlCatalogo(tipo, datos)`, `editarEnCatalogo(tipo, nombre, datos)`, `eliminarDelCatalogo(tipo, nombre)` | Catálogo. `tipo`: `proveedor`, `categoria`, `material`, `producto`. Editar renombra también en las compras; eliminar no toca las compras |
| `getProveedores()`, `getMateriales()`, `getCategorias()`, `getProductos()` | **Síncronas.** Opciones para los desplegables, desde el catálogo (que ya incluye lo de cada compra guardada), sin repetir y en orden alfabético |
| `getCategoriasDeProveedor(proveedor)` | **Síncrona.** Categorías que surte el proveedor (las que lo tienen en `proveedoresPorCategoria`) |
| `getMaterialesPorProveedor(proveedor)` | **Síncrona.** Artículos para Agregar compra: solo los de las categorías del proveedor (si no surte ninguna, todos), con «Materia Prima» primero |
| `getAsignacion(material)` | **Síncrona.** `{ existe, nombre, categoria, producto }` del material (`''` en lo que falte) |
| `necesitaAsignacion(material)` | `true` si al material le falta la categoría o el producto |
| `asignarMaterial(material, { categoria, producto, proveedor? })` | Guarda la asignación y crea lo que no exista; con `proveedor`, la categoría queda ligada a él. Devuelve `{ material, materialNuevo, categoriaNueva, productoNuevo }` (+ `proveedor`, `proveedorVinculado`) |
| `totalLista(lista)` | Suma de los montos |

Las funciones síncronas leen, en modo servidor, una caché de `GET /api/catalogo` que se carga al detectar el modo y se refresca tras cada escritura. `asignarMaterial` la actualiza en el acto con la respuesta del servidor.

## Catálogo

El catálogo es la **única fuente de las opciones**: cada compra guardada registra su proveedor, materiales, categorías y productos. En modo local se guarda completo en `depanas_catalogo` (`version: 2`) desde la primera escritura, así lo eliminado no reaparece.

`CATALOGO` repite el catálogo del backend (`backend/db/catalogo.js`) para el modo local: proveedores, categorías, productos y materiales con su categoría y producto, tomados de `Datos De Panas.xlsx`. **Si cambias uno, cambia el otro.**

## Tests

`api.test.js` y `catalogo.test.js` cubren los dos modos: el servidor con `fetch` simulado (`simularServidor`) y el modo local sobre `localStorage`. Un cambio en los datos toca los dos modos y el backend, con tests en ambos lados.
