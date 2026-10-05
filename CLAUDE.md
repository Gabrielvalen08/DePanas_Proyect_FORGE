# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

App web de contabilidad para el restaurante **De Panas SV**: registro de compras e insumos y, más adelante, costos, gastos y márgenes. Es un proyecto académico de POO. Los requisitos y el descubrimiento están en los PDF de la raíz (`Documento de requerimientos - De Panas.pdf`, `Documento de descubrimiento - De Panas.pdf`).

Hay un **frontend** (`frontend/`) y un **backend** (`backend/`): Node.js + Express con SQLite (`node:sqlite`, Node ≥ 22.13) en `http://localhost:3000`. El frontend funciona también sin backend (modo local, ver abajo).

## Comandos

### Backend (desde `backend/`)

- `npm install`, `npm start` (o `npm run dev` con recarga). La base vive en `backend/db/depanas.db` (ignorada por git).
- `npm test`: tests con el runner nativo (`node --test`); cada test usa una base temporal.

### Frontend (desde `frontend/`)

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

- `src/main.jsx` monta `<BrowserRouter>` y `<MotionConfig reducedMotion="user">`, y carga `styles/global.css`. `src/App.jsx` define el layout (`Sidebar` en escritorio, `BarraInferior` en móvil) y las rutas: `/` → `AgregarCompra` (página principal: una o varias compras, cada una en un `BloqueCompra` con su propio guardar), `/compras` → `PantallaMaestra` (tabla de listas, filtros en línea con `FiltrosEnLinea` y detalle en `DetalleLista` para ver, editar y eliminar). `/agregar-compra` y cualquier otra ruta redirigen a `/`. Las rutas, íconos y títulos viven en `components/navegacion.js`.
- **Estilos:** tokens de 3 capas en `src/styles/tokens.css` y un `Componente.module.css` por componente. Los componentes usan solo tokens semánticos (`--color-*`), nunca hex sueltos. Presets de animación (Motion) en `styles/movimiento.js`.
- **UI base:** `src/components/common/` (`Boton`, `Campo`, `Selector`, `Tarjeta`, `Insignia`, `Modal` + `CuerpoModal`/`PieModal`, `EstadoVacio`). Toda pantalla se arma con estas piezas. Hooks en `src/hooks/` y formateo en `src/utils/formato.js`: usa `fechaHoyISO()`, nunca `toISOString()`, que da UTC.
- Cada directorio de `src/` tiene un `README.md` con sus convenciones. Las decisiones técnicas del refactor están en `docs/DECISIONS.md`.
- **`src/services/api.js` es la única capa de datos** (`fetchListas(filters)`, `guardarLista`, `actualizarLista(id, …)`, `eliminarLista(id)`, `exportarDB`, `importarDB`). Tiene **dos modos que nunca se mezclan**, decididos una vez por carga con `detectarModo()` (`GET /api/health`):
  - **servidor:** todo va a `/api/compras` y los errores del backend se propagan a la UI. Nada se copia a `localStorage`.
  - **local:** sin backend, todo vive en `localStorage` (`depanas_listas`, con `MOCK_LISTAS` de ejemplo).
  No agregues caídas silenciosas a `localStorage` cuando el backend falla. Las páginas nunca usan `fetch` ni `localStorage` directamente.
- `getProveedores()` / `getMateriales()` son **síncronas** y alimentan `AutocompleteInput` (en modo servidor leen una caché que se refresca tras cada escritura). `totalLista(lista)` suma los montos.
- Las notificaciones usan `useToast().addToast(message, 'success' | 'error')` de `src/context/ToastContext.jsx`.
- **Modelo: compra (lista)** `{ id, proveedor, fecha, categoria, materiales: [{ material, cantidad, unidad, monto, producto }] }`. `fecha` es ISO `YYYY-MM-DD`. `monto` es el **total de la línea** (no unitario); el gasto de la compra es la suma. `producto` es el destino del material (aún sin UI). El filtro `material` devuelve las compras que contienen ese material. En modo servidor el `id` es un UUID (`compra_id`); en local, un número.
- **Backend:** tabla única `ingresos` (una fila por material) con `compra_id` para agrupar cada compra y `unidad`. `db.js` migra bases del esquema anterior al abrirlas. `/api/compras` (routes/listas.js) trabaja con compras completas y valida montos y cantidades > 0; `/api/ingresos` da acceso fila por fila. Exportar usa `VACUUM INTO` (con WAL, copiar el `.db` a pelo exportaba una base vacía); importar un `.db` valida el archivo y guarda `depanas.respaldo.db`; importar JSON fusiona sin duplicar.

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
- Un cambio en los datos toca los dos modos de `src/services/api.js` y el backend, con tests en `frontend/src/services/api.test.js` (modo servidor con `fetch` simulado y modo local) y en `backend/test/`.
