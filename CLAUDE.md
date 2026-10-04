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
- `npm run lint`: ESLint 9 con `jsx-a11y` (strict) y `react-hooks` v7. Prohíbe `style={{}}`
- `npm run test`: Vitest en modo watch; `npm run test:run` una sola vez
- Un solo archivo de test: `npx vitest run src/pages/AgregarCompra.test.jsx`

`react-hooks` v7 rechaza `setState` síncrono dentro de `useEffect`: actualiza estado desde callbacks o promesas (ver la carga en `PantallaMaestra.jsx`).

## Arquitectura

React 18 + Vite 5 + react-router-dom 6, en JavaScript (JSX) sin TypeScript. Íconos: solo `lucide-react`.

- `src/main.jsx` monta `<BrowserRouter>` y `<MotionConfig reducedMotion="user">`, y carga `styles/global.css`. `src/App.jsx` define el layout (`Sidebar` en escritorio, `BarraInferior` en móvil) y las rutas: `/` → `Inicio`, `/compras` → `PantallaMaestra` (lista, filtros y borrado de compras), `/agregar-compra` → `AgregarCompra` (formulario de varias filas guardadas en lote). Cualquier otra ruta redirige a `/`. Las rutas, íconos y títulos viven en `components/navegacion.js`.
- **Estilos:** tokens de 3 capas en `src/styles/tokens.css` y un `Componente.module.css` por componente. Los componentes usan solo tokens semánticos (`--color-*`), nunca hex sueltos. Presets de animación (Motion) en `styles/movimiento.js`.
- **UI base:** `src/components/common/` (`Boton`, `Campo`, `Selector`, `Tarjeta`, `Insignia`, `Modal` + `CuerpoModal`/`PieModal`, `EstadoVacio`). Toda pantalla se arma con estas piezas. Hooks en `src/hooks/` y formateo en `src/utils/formato.js`: usa `fechaHoyISO()`, nunca `toISOString()`, que da UTC.
- Cada directorio de `src/` tiene un `README.md` con sus convenciones. Las decisiones técnicas del refactor están en `docs/DECISIONS.md`.
- **`src/services/api.js` es la única capa de datos.** Por ahora es un **mock** sobre `localStorage` (clave `depanas_compras`, sembrado con `MOCK_COMPRAS`) con un `delay()` artificial. Cada función async (`fetchCompras(filters)`, `guardarCompras(filas)`, `eliminarCompra(id)`) trae comentada la llamada `fetch` al backend real. Para conectar el backend, se descomenta ese bloque y se borra el del mock, sin cambiar la firma. Las páginas nunca deben usar `fetch` ni `localStorage` directamente.
- `getProveedores()` / `getProductos()` son **síncronas** y alimentan `AutocompleteInput`. Salen de las compras existentes, así que necesitarán un endpoint cuando haya backend.
- Las notificaciones usan `useToast().addToast(message, 'success' | 'error')` de `src/context/ToastContext.jsx`.
- Modelo de compra: `{ id, proveedor, producto, cantidad, unidad, precio, fecha }`. `fecha` es una cadena ISO `YYYY-MM-DD` (se ordena y filtra por comparación de strings) y `precio`/`cantidad` son números.

## Diseño (obligatorio)

`DESIGN_DECISIONS.md` (raíz) define la marca para la web a partir del *Brandbook DE PANAS (mayo 2026)* y **toda pantalla nueva debe seguirlo**. Precedencia: **brandbook > skills de `.claude/skills/` > `DESIGN_DECISIONS.md`**. `apple-design` guía proporciones, interacción, animaciones y materiales; `ui-ux-pro-max`, `brand` y `design-system` guían tokens, accesibilidad y UX. Lo esencial:

- Paleta: Rojo Vinotinto `#911C0D`, Naranja Sazón `#EF7D05`, Amarillo Criollo `#F8A914`, Verde Fresco `#6DAD28`, Verde Ávila `#144428`, Crema y Trigo `#FEEECC`. Sin negro puro. Naranja y crema son los protagonistas (sidebar, barra inferior y botón primario en naranja). Texto sobre naranja: siempre `--color-on-primary` (Ávila profundo `#0F331E`, 5.03:1); nunca texto blanco o crema sobre naranja, amarillo o verde fresco (el logotipo tipográfico está exento).
- Tipografía: Josefin Sans para titulares e interfaz (titulares en mayúsculas) y Cardo para textos extensos.
- Las tablas van sobrias, con los montos alineados a la derecha. Contraste WCAG AA en todo.
- Movimiento: feedback al presionar, springs interrumpibles para lo arrastrable y `prefers-reduced-motion` siempre respetado.
- Assets de marca en `frontend/public/brand/` (logo y los íconos de favicon/PWA, conectados en `index.html` y `public/site.webmanifest`).

Las skills ejecutan scripts desde la raíz del repo, p. ej. `python .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --domain ux`.

## Convenciones

- El código, los nombres (componentes, funciones, variables) y los textos de la UI están en **español**.
- `src/services/api.js` no se modifica mientras sea mock (ESLint tiene una excepción para su `BASE_URL`).
