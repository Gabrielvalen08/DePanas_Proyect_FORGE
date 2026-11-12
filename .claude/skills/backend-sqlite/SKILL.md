---
name: backend-sqlite
description: Guía para escribir y cambiar el backend de De Panas (Node ≥ 22.13 + Express 4 + node:sqlite en WAL, ES modules, sin ORM). Úsala antes de agregar o cambiar una ruta de la API, una tabla o columna, una migración, una validación de shared/, un permiso de permisos.js o una prueba de backend/test. Explica el patrón de capas (rutas → acceso a datos → SQLite), cómo migrar bases del cliente sin perder datos y qué pruebas lleva cada cambio.
---

# Backend y base de datos (De Panas)

## Por qué SQLite con `node:sqlite`

- La app corre en **una computadora del restaurante** (versión .zip, sitio local en `:4510`) y en desarrollo; no hay servidor de base de datos que instalar ni mantener.
- La base es **un solo archivo** (`depanas.db`), fácil de respaldar, exportar (`VACUUM INTO`) y llevar a otra computadora.
- `node:sqlite` viene **dentro de Node** (≥ 22.13): sin dependencias nativas que compilar en Windows, por eso el .zip lleva el Node oficial sin modificar.
- Modo **WAL** con `busy_timeout` de 5 s; `consolidar()` pasa el WAL al `.db` tras cada escritura, así una copia a mano siempre está completa.

## Capas (patrón DAO)

```
routes/<recurso>.js   HTTP: lee req, llama al DAO con responder() (routes/responder.js); sin SQL
dao/<entidad>.js      DAO: valida (con shared/), SQL con sentencias preparadas, transacciones, lanza ErrorDatos
db.js                 conexión, esquema, migraciones y funciones de bajo nivel (enTransaccion, registrarCompra…)
shared/*.js           reglas de negocio puras (validar compra, IVA, productos, usuarios, archivo), sin SQL ni HTTP
```

- Cada archivo de rutas exporta una **fábrica** `crearRutasX(getDb)`; cada DAO, una fábrica `xDAO(db)` (p. ej. `comprasDAO(getDb())` en cada petición, porque la conexión cambia al importar un `.db`). Así las pruebas usan una base temporal.
- Detalle del modelo y del motor: `docs/MODELO_DATOS.md`.
- El SQL va siempre con **parámetros** (`db.prepare('… WHERE id = ?').get(id)`); nunca se arma texto con datos del usuario. La única excepción es `VACUUM INTO`, que escapa la ruta.
- Una operación que escribe más de una fila va dentro de **`enTransaccion(db, () => …)`**: si algo lanza, se deshace todo.
- Los errores esperados se lanzan como **`ErrorDatos`** (`dao/errores.js`: `noValido`, `prohibido`, `noEncontrado`, `conflicto`) con un mensaje en español y, si es de un campo, `campo`. `responder()` los convierte en 400/403/404/409; cualquier otro error es un 500 genérico (se registra en el servidor, el usuario no ve detalles). Un 500 es un bug.

## Receta: ruta nueva

1. Regla de negocio en `shared/` si el modo local de `frontend/src/services/api.js` también la necesita.
2. Método en el DAO de su entidad (`dao/<entidad>.js`) con el SQL, la validación y la transacción; la ruta en `routes/<recurso>.js` solo lo llama con `responder()`. Móntala en `app.js` si es un recurso nuevo.
3. **Permiso** en `permisos.js` (`permisoRequerido(metodo, ruta)`). Lo que no está ahí es solo del administrador.
4. El mismo cambio en el **modo local** de `api.js` y su prueba en `frontend/src/services/api.test.js`.
5. Pruebas en `backend/test/`: feliz, 400 de validación, 401 sin sesión, 403 sin permiso.

## Receta: columna o tabla nueva

1. Agrégala a `db/schema.sql` (para bases nuevas).
2. En `migrar(db)` (db.js) agrégala a bases existentes comprobando antes con `PRAGMA table_info` (como `compra_iva`), o con `PRAGMA user_version` si es una transformación de datos que debe correr una sola vez.
3. Nunca borres ni reescribas datos del cliente en una migración sin respaldo.
4. Prueba en `test/sqlite.test.js`: crea una base con el esquema anterior, ábrela con `abrirDB` y comprueba que quedó bien y que abrirla dos veces no repite nada.
5. Si el dato viaja en los respaldos JSON, actualiza `shared/compras-json.js` o `catalogo-json.js` sin romper los respaldos viejos (campo opcional).

## Pruebas

- `npm test` (runner nativo `node --test`). Cada prueba usa una base temporal.
- Importa `test/ayudantes.js` **antes** que `app.js`: baja las iteraciones del hash y da `entrar(base, usuario?, clave?)` y `cabeceras(url)`.
- Nunca toques `backend/db/depanas.db` desde una prueba.

## Trampas

- `COLLATE NOCASE` solo ignora mayúsculas ASCII: `AZÚCAR` y `azúcar` se comparan en JavaScript (`buscarEnCatalogo`).
- Fechas: texto ISO `YYYY-MM-DD`; nunca `toISOString()` para "hoy".
- `monto` es el total de la línea, no el precio unitario.
- `compra_iva` se repite en cada fila de la compra: súmalo una vez por `compra_id`.
- La interfaz dice "artículo"; el código, la API y la base, `material`.
