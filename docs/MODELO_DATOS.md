# Modelo de datos y persistencia

Cómo guarda sus datos la app de compras de De Panas: el motor de base de datos y por qué se eligió, las entidades, las tablas, la capa de acceso a datos (DAO), las validaciones y los respaldos.

## 1. Motor de base de datos: SQLite

La app usa **SQLite** a través de **`node:sqlite`**, el módulo que viene dentro de Node.js (versión 22.13 o más reciente). No hay servidor de base de datos aparte: toda la información vive en **un solo archivo**, `depanas.db`.

| Dónde corre | Archivo |
|---|---|
| Desarrollo | `backend/db/depanas.db` (ignorado por git) |
| Versión .zip del cliente | `%APPDATA%\De Panas SV\depanas.db` |
| Pruebas | Una base temporal por prueba |

### Por qué SQLite

| Necesidad del restaurante | Cómo la cubre SQLite |
|---|---|
| Una sola computadora, sin técnico que administre un servidor | No hay nada que instalar ni mantener: la base es un archivo |
| Respaldar y llevar los datos a otra computadora | Se copia o exporta un solo archivo (`VACUUM INTO`) |
| Que la versión .zip abra sin permisos de administrador ni instaladores | `node:sqlite` viene dentro del Node.js oficial: sin dependencias nativas que compilar en Windows |
| Integridad: una compra no puede quedar a medias | Transacciones ACID (`BEGIN`/`COMMIT`/`ROLLBACK`) |
| Volumen: ~1 compra diaria con 5–30 artículos (~10 000 filas al año) | Muy por debajo de lo que SQLite maneja sin esfuerzo |

### Cómo se configura (`backend/db.js`)

- **Modo WAL** (`journal_mode = WAL`): lecturas y escrituras no se bloquean entre sí.
- **`busy_timeout` de 5 s**: si otro programa tiene la base ocupada, espera en vez de fallar.
- **`foreign_keys = ON`**: borrar un proveedor o una categoría limpia sus relaciones.
- **`consolidar()`**: después de cada escritura que salió bien, el contenido del WAL pasa a `depanas.db`. Así una copia a mano del archivo siempre está completa.

### Sin servidor: modo local

Si el backend no está encendido, el frontend trabaja en **modo local** y guarda todo en el `localStorage` del navegador (`depanas_listas`, `depanas_catalogo`, `depanas_usuarios`…). Las reglas de negocio son las mismas en los dos modos porque viven en `shared/`, y los dos modos nunca se mezclan. Ver `frontend/src/services/api.js`.

## 2. Entidades

```
                    surte (muchos a muchos)
   PROVEEDOR ─────────────────────────────── CATEGORÍA
       │ 1                                       │ 1
       │                                         │
       │ N                                       │ N
    COMPRA ── 1 : N ── ARTÍCULO DE LA COMPRA ── N : 1 ── ARTÍCULO (material)
   (fecha, IVA,          (cantidad, unidad,                 │ N
    archivo)              monto)                            │
                                                            │ va en (muchos a muchos)
                                                            │
                                                        PRODUCTO (Arepas, Cachitos…)

   USUARIO (rol, pantallas, funciones)          AJUSTES (requisitos de contraseña, migraciones)
```

| Entidad | Qué es | Ejemplo |
|---|---|---|
| **Compra** | Lo que se le compró a un proveedor en una fecha | Selectos, 18/08/2026, con IVA |
| **Artículo de la compra** | Una línea de la compra; `monto` es el total de la línea | 2 lb de Jamón Picnic por $8.04 |
| **Artículo** (`material` en el código) | Insumo del catálogo, con **una** categoría y **cero o más** productos | Ajo Chino → Materia Prima · Arepas/Empanadas |
| **Proveedor** | A quién se le compra, con su ficha (ubicación, teléfonos, contactos) | Selectos, MMAG, Pepsi |
| **Categoría** | Tipo de insumo; sabe qué proveedores la surten | Materia Prima, Desechables, Bebidas |
| **Producto** | Lo que vende De Panas y en lo que se usa el artículo | Cachitos, Tequeños, Arepas |
| **Usuario** | Quién entra, con su rol, sus pantallas y funciones | Cesar_01 (administrador), Marta_02 (operadora) |

En la interfaz se dice **artículo**; en el código, la API y la base, `material`. Así no se rompieron los respaldos ni el trabajo del equipo.

## 3. Tablas (`backend/db/schema.sql`)

### `ingresos`: las compras

Una fila por artículo comprado. Las filas de una misma compra comparten `compra_id`. Los datos de la compra (`compra_categoria`, `compra_iva`) se repiten en cada una de sus filas.

| Columna | Tipo | Qué guarda |
|---|---|---|
| `id` | INTEGER PK | Identificador de la fila |
| `compra_id` | TEXT | UUID de la compra (agrupa sus filas) |
| `origen_id` | TEXT | Identidad original al pasar compras entre equipos (respaldos JSON) |
| `fecha` | TEXT | `AAAA-MM-DD` |
| `proveedor` | TEXT | Nombre del proveedor |
| `material` | TEXT | Artículo |
| `cantidad` | REAL | Mayor a 0 |
| `unidad` | TEXT | lb, kg, unidad, caja… |
| `monto` | REAL | Total de la línea, mayor a 0 |
| `categoria`, `producto` | TEXT | Categoría y productos del artículo («Arepas, Empanadas») |
| `compra_categoria` | TEXT | Categoría de la compra |
| `compra_iva` | REAL | IVA de la compra en dinero (13 % del subtotal o 0) |

Índices: `compra_id`, `fecha` y `proveedor`.

### `catalogo`: proveedores, categorías, artículos y productos

| Columna | Qué guarda |
|---|---|
| `id` | Identificador |
| `tipo` | `proveedor`, `categoria`, `material` o `producto` |
| `nombre` | Único por tipo, sin distinguir mayúsculas |
| `categoria`, `producto` | Solo artículos: su categoría y sus productos |
| `ficha` | Solo proveedores: JSON con ubicación, teléfonos y contactos |

### `proveedor_categoria`: quién surte qué

Relación muchos a muchos por `id` (`proveedor_id`, `categoria_id`) con `ON DELETE CASCADE`. Renombrar no la rompe y borrar la limpia. En Agregar compra, elegir un proveedor sugiere solo los artículos de sus categorías.

### `usuarios`

| Columna | Qué guarda |
|---|---|
| `usuario` | Único, sin distinguir mayúsculas |
| `nombre` | Nombre de la persona |
| `contrasena` | Hash PBKDF2-SHA256 `pbkdf2$600000$<sal>$<hash>`, nunca el texto |
| `rol` | `admin` (uno solo), `operador` o `empleado` |
| `permisos` | JSON con las pantallas (`["*"]` para el administrador) |
| `funciones` | JSON con las acciones permitidas (editar o eliminar compras, agregar al catálogo…) |

### `ajustes`

Clave → JSON. Guarda los requisitos de contraseña y las marcas de migraciones que corren una sola vez (contraseña de Marta).

## 4. Capa de acceso a datos (patrón DAO)

Ninguna ruta escribe SQL. Cada entidad tiene su **DAO** en `backend/dao/`, y las rutas solo traducen HTTP ↔ DAO:

```
Petición HTTP ─► routes/*.js ─► dao/*.js ─► SQLite
   (lee req)       (llama)       (valida, transacción, SQL con parámetros)
                     ▲                 │
                     └── responder.js ◄┘  devuelve datos o lanza ErrorDatos
```

| DAO | Qué hace |
|---|---|
| `dao/compras.js` | Listar con filtros, obtener, crear, editar, eliminar, eliminar varias, respaldos JSON |
| `dao/ingresos.js` | Acceso fila por fila (`/api/ingresos`) |
| `dao/catalogo.js` | Leer el catálogo (con uso, precios sugeridos, IVA por proveedor y fichas), asignar categoría y productos, agregar, renombrar (también en las compras), eliminar e importar respaldos |
| `dao/usuarios.js` | Listar, crear, editar y eliminar usuarios, autenticar (y recalcular hashes viejos), requisitos de contraseña |

`db.js` abre la conexión, aplica el esquema y las migraciones, y tiene las funciones de bajo nivel que comparten los DAO (`registrarCompra`, `buscarEnCatalogo`, `enTransaccion`, `copiaConsistente`).

### Manejo de excepciones

- Un DAO lanza **`ErrorDatos`** (`dao/errores.js`) con su código: **400** dato no válido, **403** no permitido, **404** no existe, **409** ya existe o choca. Si el error es de un campo, lleva `campo` para marcarlo en el formulario.
- `routes/responder.js` convierte el `ErrorDatos` en la respuesta HTTP.
- Cualquier otro error (SQLite, disco) es **inesperado**: se registra en la consola del servidor y el usuario recibe un mensaje genérico, sin rutas ni SQL.
- Toda operación que escribe varias filas va en **`enTransaccion`**: si algo falla, se deshace todo (una compra nunca queda a medias, una importación es todo o nada).

### Validaciones

| Qué | Dónde | Regla |
|---|---|---|
| Compra | `dao/compras.js` (`validarCompra`) | Proveedor, fecha `AAAA-MM-DD`, al menos un artículo, cantidad y monto > 0, IVA ≥ 0 |
| Respaldo de compras | `shared/compras-json.js`, `shared/carga-compras.js` | Estructura y tipos; nueva, duplicada o modificada |
| Catálogo | `dao/catalogo.js`, `shared/productos.js`, `shared/proveedores.js`, `shared/catalogo-json.js` | Nombre obligatorio y único; un producto sin comas; ficha del proveedor válida |
| Usuario | `dao/usuarios.js`, `shared/usuarios.js` | Formato del usuario, nombre, rol, pantallas y funciones válidas, contraseña según los requisitos |
| Eliminar varias | `shared/lote.js` (`validarIds`) | Lista no vacía de ids válidos |

Las reglas de `shared/` se usan **igual** en el backend y en el modo local del frontend. SQL siempre con **sentencias preparadas** (`?`), nunca con texto armado con datos del usuario.

## 5. Migraciones

Una base vieja del cliente debe abrir con el código nuevo sin perder nada. `db.js` revisa al abrir:

- **Columnas nuevas** (`unidad`, `compra_id`, `origen_id`, `compra_categoria`, `compra_iva`, `ficha`…): se agregan si faltan. Las bases de desarrollo que llegaron a tener `compra_archivo` (el Archivo de compras, que se quitó) la conservan sin uso: las inserciones nombran sus columnas, así que no estorba.
- **Datos que se completan una vez** (catálogo desde las compras, relación proveedor-categoría): `PRAGMA user_version`.
- **Cambios de usuarios que corren una vez** (contraseña nueva de Marta si seguía en la anterior): una marca en `ajustes`.
- **Tabla de usuarios con el CHECK anterior**: se rehace copiando los usuarios.

Cada migración tiene su prueba en `backend/test/`.

## 6. Respaldos

| Qué | Cómo |
|---|---|
| Base completa `.db` | Exportar usa `VACUUM INTO`, una copia consistente aunque haya cambios en el WAL. Importar valida que el archivo sea una base de De Panas y guarda `depanas.respaldo.db` antes de reemplazar |
| Compras en JSON o Excel | Exportar por rango de fechas; Cargar compara cada compra (nueva, duplicada o modificada) y es todo o nada |
| Catálogo por sección | Exportar y cargar proveedores, categorías, artículos o productos; cargar nunca borra |

---

**Ver también:** [Seguridad](SEGURIDAD.md) (cómo se protegen estos datos) · [Arquitectura](sitio/arquitectura.html) (capas y flujo de datos) · [Índice de la documentación](README.md)
