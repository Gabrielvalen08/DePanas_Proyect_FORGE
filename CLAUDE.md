# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

App web de contabilidad para el restaurante **De Panas SV**: registro de compras e insumos y, más adelante, costos, gastos y márgenes. Es un proyecto académico de POO. Los requisitos y el descubrimiento están en los PDF de la raíz (`Documento de requerimientos - De Panas.pdf`, `Documento de descubrimiento - De Panas.pdf`).

Hoy solo existe el **frontend** (`frontend/`). El backend previsto es Node.js + Express en `http://localhost:3000`, pero todavía no está en el repo.

## Comandos

Todos se ejecutan desde `frontend/`:

- `npm install`: instala las dependencias
- `npm run dev`: servidor de desarrollo Vite en http://localhost:5173 (redirige `/api` a `localhost:3000`)
- `npm run build`: build de producción en `frontend/dist/`
- `npm run preview`: sirve el build

No hay linter ni tests configurados.

## Arquitectura

React 18 + Vite 5 + react-router-dom 6, en JavaScript (JSX) sin TypeScript. Íconos: solo `lucide-react`.

- `src/main.jsx` monta `<BrowserRouter>`. `src/App.jsx` define el layout fijo (`Sidebar` + `.main-area`) y las rutas: `/` → `Inicio`, `/compras` → `PantallaMaestra` (lista, filtros y borrado de compras), `/agregar-compra` → `AgregarCompra` (formulario de varias filas guardadas en lote). Cualquier otra ruta redirige a `/`.
- **`src/services/api.js` es la única capa de datos.** Por ahora es un **mock** sobre `localStorage` (clave `depanas_compras`, sembrado con `MOCK_COMPRAS`) con un `delay()` artificial. Cada función async (`fetchCompras(filters)`, `guardarCompras(filas)`, `eliminarCompra(id)`) trae comentada la llamada `fetch` al backend real. Para conectar el backend, se descomenta ese bloque y se borra el del mock, sin cambiar la firma. Las páginas nunca deben usar `fetch` ni `localStorage` directamente.
- `getProveedores()` / `getProductos()` son **síncronas** y alimentan `AutocompleteInput`. Salen de las compras existentes, así que necesitarán un endpoint cuando haya backend.
- Las notificaciones usan `useToast().addToast(message, 'success' | 'error')` de `src/context/ToastContext.jsx`.
- Modelo de compra: `{ id, proveedor, producto, cantidad, unidad, precio, fecha }`. `fecha` es una cadena ISO `YYYY-MM-DD` (se ordena y filtra por comparación de strings) y `precio`/`cantidad` son números.

## Diseño (obligatorio)

`DESIGN_DECISIONS.md` (raíz) define el sistema visual y **toda pantalla nueva debe seguirlo**. Lo esencial:

- Usar los tokens CSS de `src/index.css` (`--primary` naranja, `--brown`, `--gold` solo como acento, `--cream`, radios `--radius-*`, `--shadow-solid`). No escribir colores literales.
- Tipografía Nunito Sans. Botones principales en forma de pill con borde negro de 2px y sombra sólida `3px 4px 0 #000`.
- Las tablas van sobrias (fondo claro, encabezado crema, bordes discretos), con los montos alineados. La legibilidad financiera está por encima de la estética.
- Layout de escritorio: Sidebar + Header + contenido. En mobile se usa drawer o bottom nav, con una sola columna.
- Si estética y funcionalidad chocan, gana la funcionalidad.

Los estilos globales y de componentes están en `src/index.css`. Las páginas además usan bastantes `style={{...}}` en línea.

## Convenciones

- El código, los nombres (componentes, funciones, variables) y los textos de la UI están en **español**.
- No hay `.gitignore`: `frontend/node_modules/` y `frontend/dist/` están versionados por error y ensucian el `git status`. No los incluyas en commits salvo que te lo pidan.
