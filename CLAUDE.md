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

`DESIGN_DECISIONS.md` (raíz) define la marca para la web a partir del *Brandbook DE PANAS (mayo 2026)* y **toda pantalla nueva debe seguirlo**. Precedencia: **brandbook > skills de `.claude/skills/` > `DESIGN_DECISIONS.md`**. `apple-design` guía proporciones, interacción, animaciones y materiales; `ui-ux-pro-max`, `brand` y `design-system` guían tokens, accesibilidad y UX. Lo esencial:

- Paleta: Rojo Vinotinto `#911C0D`, Naranja Sazón `#EF7D05`, Amarillo Criollo `#F8A914`, Verde Fresco `#6DAD28`, Verde Ávila `#144428`, Crema y Trigo `#FEEECC`. Sin negro puro. Nunca texto blanco o crema sobre naranja, amarillo o verde fresco.
- Tipografía: Josefin Sans para titulares e interfaz (titulares en mayúsculas) y Cardo para textos extensos.
- Las tablas van sobrias, con los montos alineados a la derecha. Contraste WCAG AA en todo.
- Movimiento: feedback al presionar, springs interrumpibles para lo arrastrable y `prefers-reduced-motion` siempre respetado.
- Assets de marca en `frontend/public/brand/` (logo y los íconos de favicon/PWA, conectados en `index.html` y `public/site.webmanifest`).

**Migración pendiente:** `src/index.css` todavía usa el sistema anterior (Nunito Sans, `--brown #651A0C`, bordes y sombras negras). No lo tomes como referencia de marca. Los estilos globales están ahí y las páginas usan bastantes `style={{...}}` en línea.

Las skills ejecutan scripts desde la raíz del repo, p. ej. `python .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --domain ux`.

## Convenciones

- El código, los nombres (componentes, funciones, variables) y los textos de la UI están en **español**.
- No hay `.gitignore`: `frontend/node_modules/` y `frontend/dist/` están versionados por error y ensucian el `git status`. No los incluyas en commits salvo que te lo pidan.
