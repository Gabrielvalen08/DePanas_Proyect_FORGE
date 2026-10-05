# Plan: Base de datos SQLite + Cambios en Frontend

> Proyecto: **De Panas SV** · Fecha de planificación: 2026-10-04

---

## Resumen de lo que se quiere lograr

1. **Una tabla SQLite** (`ingresos`) con las columnas exactas del Excel: `Fecha`, `Material`, `Cantidad`, `Monto`, `Proveedor`, `Categoría`, `Producto`.
2. **Catálogo de materiales** preexistente para que `Categoría` y `Producto` se autocompleten automáticamente al escribir el `Material`.
3. **Portabilidad total**: la base de datos puede exportarse como archivo `.sqlite`, enviarse al otro dispositivo e importarse (cargar archivo) para sincronizar datos.
4. **Renombrar `Producto` → `Material`** en todo el código y la UI actual.
5. **Nuevo campo `Categoría`** en el encabezado de "Agregar compra", con autocompletado por proveedor + material.
6. **Nuevo campo `Producto`** al final de cada fila de materiales, con autocompletado por material. No es obligatorio para guardar.
7. **Precio > 0.00** como valor mínimo visible en el campo de precio del formulario.

---

## FASE 1 — Base de datos SQLite (Backend Node.js + Express)

### 1.1 Crear la carpeta `backend/` en la raíz del proyecto

```
DePanas/
  backend/
    db/
      schema.sql          <- define la tabla y el catálogo
      seed_materiales.sql <- datos iniciales del Excel
      depanas.db          <- archivo SQLite generado (gitignored)
    routes/
      compras.js          <- endpoints REST
      materiales.js       <- endpoint de catálogo para autocompletado
      db_export.js        <- endpoints de exportar/importar
    index.js              <- servidor Express
    package.json
```

---

### 1.2 Esquema de la base de datos (`schema.sql`)

#### Tabla de catálogo de materiales

```sql
CREATE TABLE IF NOT EXISTS materiales_catalogo (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT UNIQUE NOT NULL COLLATE NOCASE,
    categoria TEXT NOT NULL,
    producto  TEXT DEFAULT ''
);
```

#### Tabla principal de ingresos (UNA SOLA TABLA, como el Excel)

```sql
CREATE TABLE IF NOT EXISTS ingresos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha      TEXT NOT NULL,           -- 'YYYY-MM-DD'
    material   TEXT NOT NULL,           -- antes llamado "producto" en el código
    cantidad   REAL NOT NULL DEFAULT 1,
    monto      REAL NOT NULL,           -- precio total pagado por esa línea
    proveedor  TEXT NOT NULL,
    categoria  TEXT NOT NULL,           -- autocompleta desde materiales_catalogo
    producto   TEXT DEFAULT ''          -- producto final al que se destina (opcional)
);
```

> **Nota:** La tabla `ingresos` replica exactamente las columnas del Excel. No hay claves foráneas complicadas: es una tabla plana, fácil de exportar/importar.

---

### 1.3 Datos iniciales del catálogo (`seed_materiales.sql`)

Los 30 materiales identificados en el Excel, con su Categoría y Producto predefinidos:

```sql
INSERT OR IGNORE INTO materiales_catalogo (nombre, categoria, producto) VALUES
('Agua', 'Bebidas', 'Hidratantes'),
('Ajo Chino', 'Materia Prima', ''),
('Alambrina ExtraFuerte', 'Materia Prima', 'Todos'),
('Anis', 'Materia Prima', 'Golfeados'),
('Azucar', 'Materia Prima', 'Todos'),
('Bandeja Bisagrada', 'Desechables', ''),
('Bandeja Kraft', 'Desechables', ''),
('Bolsa al Vacio 8*12', 'Desechables', 'Tequeños'),
('Cebolla', 'Materia Prima', 'Arepas/Empanadas'),
('Cilantro', 'Materia Prima', 'Salsa'),
('Fosforos', 'Material Común', 'Todos'),
('Frijol Negro', 'Materia Prima', 'Arepas/Empanadas'),
('Gabacha #3 Blanca', 'Desechables', 'Todos'),
('Gatorade', 'Bebidas', 'Hidratantes'),
('Huevos', 'Materia Prima', 'Panadería'),
('Jamon Picnic', 'Materia Prima', 'Cachitos'),
('Jamón de Pavo', 'Materia Prima', 'Cachitos'),
('Lipton', 'Bebidas', 'Gaseosas'),
('Manteca', 'Materia Prima', 'Panadería'),
('Mr Músculo Antigrasa', 'Limpieza', ''),
('Pechugas de Pollo', 'Materia Prima', 'Arepas/Empanadas'),
('Pepsi', 'Bebidas', 'Gaseosas'),
('Perejil', 'Materia Prima', 'Salsa'),
('Pierna Mechada La Rioja', 'Materia Prima', ''),
('Plátanos', 'Materia Prima', 'Arepas/Empanadas'),
('Portion Cup Cuadrada', 'Desechables', ''),
('Sazón Completa', 'Materia Prima', 'Arepas/Empanadas'),
('Tapa Portion Cup Cuadrado', 'Desechables', ''),
('Tapadera Cristal', 'Desechables', ''),
('Tocino La Rioja', 'Materia Prima', 'Cachitos');
```

---

### 1.4 Endpoints del backend (`backend/routes/`)

#### `compras.js`

| Método | Ruta | Qué hace |
|--------|------|----------|
| `GET` | `/api/ingresos` | Devuelve todas las filas (filtros: `proveedor`, `material`, `fechaDesde`, `fechaHasta`) |
| `POST` | `/api/ingresos` | Inserta una o varias filas de ingresos |
| `PUT` | `/api/ingresos/:id` | Actualiza una fila |
| `DELETE` | `/api/ingresos/:id` | Elimina una fila |

#### `materiales.js`

| Método | Ruta | Qué hace |
|--------|------|----------|
| `GET` | `/api/materiales` | Lista del catálogo (nombre, categoria, producto) |
| `POST` | `/api/materiales` | Agrega un material nuevo al catálogo |

#### `db_export.js` (Portabilidad entre dispositivos)

| Método | Ruta | Qué hace |
|--------|------|----------|
| `GET` | `/api/db/exportar` | Descarga el archivo `depanas.db` como adjunto |
| `POST` | `/api/db/importar` | Recibe un archivo `.db` y reemplaza la base de datos local |
| `GET` | `/api/db/exportar-json` | Exporta todos los ingresos como JSON |
| `POST` | `/api/db/importar-json` | Importa ingresos desde JSON, fusionando con los existentes |

> **Flujo de sincronización entre dos dispositivos:**
> 1. En dispositivo A: `GET /api/db/exportar` → descarga `depanas.db`.
> 2. Transferir el archivo (USB, correo, Drive, etc.) al dispositivo B.
> 3. En dispositivo B: usar el botón "Cargar base de datos" en la UI → `POST /api/db/importar`.
> 4. El servidor B reemplaza su `depanas.db` con el recibido y reinicia la conexión SQLite.

---

## FASE 2 — Cambios en el Frontend

### 2.1 Renombrar `producto` → `material` en TODO el código

Archivos afectados y qué cambiar en cada uno:

| Archivo | Cambio en código (interno) | Cambio en UI (texto visible) |
|---------|---------------------------|------------------------------|
| `api.js` | `productos[]` → `materiales[]`; `p.producto` → `p.material`; `getProductos()` → `getMateriales()` | — |
| `BloqueCompra.jsx` | `CAMPOS_FILA`: `{ clave: 'producto' }` → `{ clave: 'material' }`; estado `fila.producto` → `fila.material` | `"Producto"` → `"Material"` en encabezado de columna, labels y placeholders |
| `BloqueCompra.module.css` | `.colProducto` → `.colMaterial` | — |
| `DetalleLista.jsx` | `p.producto` → `p.material` | `<th>Producto</th>` → `<th>Material</th>` |
| `FiltrosEnLinea.jsx` | `filtros.producto` → `filtros.material`; actualizar `FILTROS_VACIOS` | `etiqueta="Producto"` → `etiqueta="Material"` |
| `PantallaMaestra.jsx` | Filtro `producto` → `material`; `aria-label` de filas | Columna `"Productos"` → `"Materiales"` |
| `AgregarCompra.jsx` | Toast: `${n} producto(s)` → `${n} material(es)` | — |
| `api.js` mock | `{ producto: 'Pollo entero' }` → `{ material: 'Pollo entero' }` en `MOCK_LISTAS` | — |

---

### 2.2 Nuevo campo `Categoría` en el encabezado de "Agregar compra"

**Ubicación en la UI:** al lado del campo `Proveedor` (mismo nivel horizontal).

**Comportamiento:**
- Es un `AutocompleteInput` de texto con sugerencias de las categorías conocidas.
- **Se autocompleta automáticamente** cuando el usuario elige un `Material` en cualquier fila: el sistema busca en el catálogo y rellena `Categoría` con el valor correspondiente (si el campo estaba vacío o igual al anterior).
- **Es obligatorio**: si está vacío al intentar guardar, bloquea la operación igual que `Proveedor`.
- El usuario puede sobreescribir la categoría sugerida.

**Cambios en `BloqueCompra.jsx`:**
- Agregar `const [categoria, setCategoria] = useState(inicial?.categoria ?? '')`.
- Agregar `<AutocompleteInput id=… etiqueta="Categoría" …>` en el `encabezadoCampos`.
- En `cambiarFila()`: cuando cambia `material`, llamar `buscarEnCatalogo(valor)` y, si retorna categoría, ejecutar `setCategoria(cat)`.
- En `guardar()`: incluir `categoria` en el objeto `lista`.
- En `validarEncabezado()`: agregar `if (campo === 'categoria' && !valor.trim()) return 'Elige la categoría'`.
- En `api.js` → `normalizar()`: agregar `categoria: datos.categoria.trim()`.

---

### 2.3 Nuevo campo `Producto` (destino) al final de cada fila

**Ubicación en la UI:** cuarta columna de la tabla de materiales, después de `Precio`, antes del botón de eliminar.

**Comportamiento:**
- Input de texto con autocompletado de los destinos conocidos del catálogo.
- **Se autocompleta** automáticamente cuando el usuario elige el `Material`.
- **NO es obligatorio**: el formulario puede guardarse con este campo vacío.
- El usuario puede modificar la sugerencia o dejarlo en blanco.

**Cambios en `BloqueCompra.jsx`:**
- `filaVacia()`: agregar `productoDestino: ''`.
- `filasDesde()`: mapear `p.productoDestino ?? ''`.
- En `cambiarFila()`: cuando cambia `material`, autocompletar `productoDestino` desde el catálogo si estaba vacío.
- En `guardar()`: incluir `productoDestino` en cada item del array `materiales`.
- Nueva columna `<th>Producto</th>` en `<thead>`.
- Nueva `<td>` con `<AutocompleteInput>` para `productoDestino` en cada fila.
- `BloqueCompra.module.css`: agregar `.colProductoDestino` con ancho apropiado.
- `api.js` → `normalizar()`: incluir `productoDestino: p.productoDestino?.trim() ?? ''`.

---

### 2.4 Precio con mínimo visible `> 0.00`

Cambio menor en el `<Campo>` de precio en `BloqueCompra.jsx`:

```jsx
// Agregar min="0.01" al campo de precio
min="0.01"
placeholder="0.00"
```

La validación de `precio > 0` ya existe en `validarFila()`; esto refuerza la restricción también a nivel del input HTML.

---

### 2.5 Actualizar `api.js` para usar el catálogo de materiales

Agregar dos funciones nuevas:

```js
// Catálogo: [{ nombre, categoria, producto }]
// Mock: lee de localStorage bajo 'depanas_catalogo', inicializado con los 30 materiales.
// Backend real: fetch a GET /api/materiales
export function getCatalogoMateriales() { … }

// Dado un nombre de material, retorna { categoria, producto } o null si no existe
export function buscarEnCatalogo(nombreMaterial) { … }
```

---

## FASE 3 — Portabilidad de la base de datos (UI en el Frontend)

Agregar en el `Header` o en una nueva página `/configuracion` dos botones:

| Botón | Acción |
|-------|--------|
| **Exportar base de datos** | Llama a `GET /api/db/exportar` → el browser descarga `depanas.db` |
| **Cargar base de datos** | Abre un `<input type="file" accept=".db">` → sube el archivo a `POST /api/db/importar` |

**Flujo entre dispositivos (sin internet):**
1. Dispositivo A: click en "Exportar base de datos" → guarda `depanas.db`.
2. Enviar el archivo al Dispositivo B (USB, WhatsApp, correo, etc.).
3. Dispositivo B: click en "Cargar base de datos" → selecciona el archivo → se importa.
4. La app en B muestra inmediatamente los datos actualizados.

---

## Orden de implementación sugerido

```
[ ] 1. Crear backend/: package.json, index.js con Express + better-sqlite3
[ ] 2. Crear schema.sql + seed_materiales.sql y ejecutar el seed al arrancar
[ ] 3. Endpoints de /api/ingresos y /api/materiales
[ ] 4. Endpoints de /api/db/exportar e /api/db/importar
[ ] 5. Renombrar producto → material en TODO el frontend (Fase 2.1)
[ ] 6. Agregar getCatalogoMateriales() y buscarEnCatalogo() a api.js (mock primero)
[ ] 7. Agregar campo Categoría al encabezado de BloqueCompra (Fase 2.2)
[ ] 8. Agregar campo Producto (destino) a cada fila de BloqueCompra (Fase 2.3)
[ ] 9. Ajuste de Precio min="0.01" (Fase 2.4)
[ ] 10. Botones Exportar/Cargar base de datos en el frontend (Fase 3)
[ ] 11. Apuntar api.js al backend real: descomentar fetch, eliminar mock de localStorage
```

---

## Archivos que se crean o modifican

### Nuevos (backend)
- `backend/index.js`
- `backend/package.json`
- `backend/db/schema.sql`
- `backend/db/seed_materiales.sql`
- `backend/routes/compras.js`
- `backend/routes/materiales.js`
- `backend/routes/db_export.js`

### Modificados (frontend)
- `frontend/src/services/api.js`
- `frontend/src/components/BloqueCompra.jsx`
- `frontend/src/components/BloqueCompra.module.css`
- `frontend/src/components/DetalleLista.jsx`
- `frontend/src/components/FiltrosEnLinea.jsx`
- `frontend/src/pages/PantallaMaestra.jsx`
- `frontend/src/pages/AgregarCompra.jsx`

---

## Aclaraciones clave

- **`Categoría` es obligatoria** para guardar la compra. Si el material no está en el catálogo, el usuario la escribe manualmente.
- **`Producto` (destino) es opcional**. Se autocompleta pero puede quedar vacío.
- **`Material`** reemplaza completamente al antiguo `Producto` tanto en la UI como en el modelo de datos interno (`fila.material`, `lista.materiales[]`).
- **La tabla `ingresos` en SQLite es plana**: una fila por material comprado, igual que el Excel. Sin relaciones complicadas.
- **El archivo `depanas.db` va en `.gitignore`** para no subir datos reales al repositorio.
