# Plan: listas de compra

Cambio de funcionalidad: las compras dejan de ser filas sueltas y pasan a ser **listas de compra** (un proveedor y una fecha) que contienen productos.

## Decisiones tomadas

| Tema | Decisión |
| ---- | -------- |
| Página principal | `/` es Agregar compra. Se elimina `Inicio`. `/agregar-compra` redirige a `/` |
| Precio | Es el **total de la línea**. Gasto total de la lista = suma de precios |
| Varias compras | Botón **"Nueva compra"** que agrega otro bloque. **Cada bloque tiene su Cancelar/Guardar** y se guarda por separado |
| Al guardar | Toast y el bloque se vacía (si hay varios, el guardado desaparece). Se queda en la página |
| Detalle en Compras | Se abre sobre la pantalla (modal). Permite **ver, editar y eliminar** la lista |
| Filtros | Sin ventana: al pulsar "Filtrar" se despliegan los campos al lado del botón y filtran en vivo |

## Supuestos (avísame si alguno no va)
- **Datos existentes:** las compras guardadas en `localStorage` se convierten en listas, agrupando por proveedor y fecha. Los datos de ejemplo se agrupan igual.
- **Filtro por producto:** se mantiene y muestra las listas que contienen ese producto.
- **Navegación:** quedan 2 ítems, "Agregar compra" (`/`) y "Compras".

## Modelo y capa de datos (`services/api.js`)

Se levanta la regla de "no modificar `api.js`"; se mantiene el patrón de mock con los `fetch` comentados.

```js
// Lista: { id, proveedor, fecha: 'YYYY-MM-DD', productos: [{ producto, cantidad, unidad, precio }] }
fetchListas(filters)          // { proveedor, producto, fechaDesde, fechaHasta } → listas, más recientes primero
guardarLista(lista)           // POST   /api/listas
actualizarLista(id, lista)    // PUT    /api/listas/:id
eliminarLista(id)             // DELETE /api/listas/:id
getProveedores(), getProductos() // síncronas, para el autocompletado
```

La clave nueva es `depanas_listas`; si existe `depanas_compras`, se migra una sola vez.

## Pantallas

### Agregar compra (`/`)
- Sin la tarjeta "Fecha de hoy".
- Cada compra es un componente **`BloqueCompra`**, reutilizable también para editar:
  - Encabezado: **"DETALLE DE COMPRA"**, y al lado los campos **Proveedor** (autocompletado) y **Fecha** (por defecto hoy). En móvil se apilan.
  - Filas: **Producto, Cantidad + Unidad, Precio**, más eliminar fila y "Agregar otra fila".
  - Total de la compra visible, calculado en vivo.
  - Pie con **Cancelar** (vacía el bloque, o lo quita si hay más de uno) y **Guardar compra**.
  - Validación igual que hoy: al salir del campo, más un resumen de errores por bloque. Proveedor y fecha son obligatorios, con al menos un producto válido.
- Debajo del último bloque, el botón **"Nueva compra"** agrega otro bloque. Entra con animación y el foco va a su Proveedor.

### Compras (`/compras`)
- Tabla de listas con **Proveedor, Productos (cantidad), Gasto total, Fecha**. Cada fila es un botón accesible que abre el detalle. En móvil, las filas se muestran como tarjetas.
- **Detalle** (modal):
  - Proveedor, fecha, tabla de productos y total.
  - **Editar** cambia el modal a un `BloqueCompra` con los datos de la lista; "Guardar cambios" llama a `actualizarLista`.
  - **Eliminar** pide confirmación y llama a `eliminarLista`.
- **Filtros en línea:** "Filtrar" funciona como un desplegable que abre o cierra el panel (`aria-expanded`).
  - El panel tiene Proveedor, Producto, Desde y Hasta, más "Limpiar".
  - Filtra en vivo. Se despliega desde el botón con `springSuave`.
  - En escritorio va al lado del botón y en móvil, debajo.
  - Se mantiene el contador de filtros activos.
  - `FilterModal` se elimina.

## Pasos
1. **Datos:** nuevo modelo en `api.js` con migración y tests de `fetchListas` (filtros), `guardarLista`, `actualizarLista`, `eliminarLista` y la migración.
2. **Rutas y navegación:** quitar `Inicio`, `/` → Agregar compra, redirección de `/agregar-compra`, barra inferior de 2 ítems y títulos.
3. **`BloqueCompra`:** extraído de `AgregarCompra`, con su validación, total y resumen de errores. Página con varios bloques y "Nueva compra".
4. **Compras:** tabla de listas, modal de detalle (ver, editar, eliminar) y panel de filtros en línea.
5. **Tests:** actualizar los de páginas y agregar los de `BloqueCompra` (validación, total, guardar y vaciar), del detalle (editar y eliminar) y de los filtros en línea.
6. **Verificación y docs:** lint, tests, build, revisión visual en 1280, 900 y 375 px, y contraste. Actualizar `CLAUDE.md`, los README de `pages/` y `components/`, y `docs/DECISIONS.md`.

## Fuera de alcance
Backend real, reportes o métricas sobre las listas, y deshacer al eliminar.
