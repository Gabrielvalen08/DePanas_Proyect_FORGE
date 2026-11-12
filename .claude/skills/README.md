# Skills del proyecto

Instrucciones que Claude Code carga para trabajar en De Panas. Viven en el repo para que todo el equipo use las mismas. Cada carpeta tiene un `SKILL.md`; se invocan por su nombre (p. ej. `/brand`, `/full-audit`) o Claude las usa solas cuando la tarea encaja.

## Marca y diseño

| Skill | Para qué |
|---|---|
| `brand` | Voz e identidad de De Panas: colores, logos, fotos, tono de los textos. |
| `design-system` | Tokens en tres capas (`tokens.css`), escalas y especificación de componentes. |
| `ui-ux-pro-max` | Base de datos de estilos, paletas, tipografías y guías de UX (`scripts/search.py`). |
| `apple-design` | Proporciones, movimiento con springs, materiales y feedback al presionar. |
| `frontend-design` | Dirección visual con intención, para que una pantalla no parezca plantilla. |
| `make-interfaces-feel-better` | Detalles de pulido: sombras, bordes, números tabulares, entradas y salidas. |
| `emil-design-engineering` | Formularios, estados de botones, táctil, accesibilidad y animación. |
| `web-animation-design` | Cuándo y cómo animar (duraciones, curvas, `prefers-reduced-motion`). |
| `web-design-guidelines` | Revisa la UI contra las Web Interface Guidelines. |

Precedencia: ver `CLAUDE.md` (sección Diseño).

## Frontend

| Skill | Para qué |
|---|---|
| `vercel-react-best-practices` | Rendimiento de React: renders, carga de datos, tamaño del bundle. |

## Backend y base de datos

| Skill | Para qué |
|---|---|
| `backend-sqlite` | **Propia.** Capas (rutas → acceso a datos → SQLite), migraciones de bases del cliente, permisos y pruebas. |

## Pruebas

| Skill | Para qué |
|---|---|
| `webapp-testing` | Manejar la app con Playwright: capturas, consola, flujos. |

## Seguridad y revisiones

| Skill | Para qué |
|---|---|
| `revision-seguridad` | **Propia.** Modelo de amenazas, defensas actuales, lista de comprobación y pruebas. |
| `full-audit` | Corre las 9 lentes de abajo y escribe un solo reporte en `docs/revisiones/`. |
| `audit-as-design-eng` | Marca, tokens, estados visuales. |
| `audit-as-ux-eng` | Recorridos del usuario, errores, confirmaciones. |
| `audit-as-frontend-eng` | **Adaptada.** React 18 JSX, reglas de la casa. |
| `audit-as-backend-eng` | **Adaptada.** Express + SQLite: validación, transacciones, migraciones, permisos. |
| `audit-as-structural-eng` | **Adaptada.** Capas frontend / api.js / backend / shared / desktop. |
| `audit-as-repo-maintainer` | **Adaptada.** Convenciones del repo, documentación, commits. |
| `audit-as-prod-readiness` | **Adaptada.** Versión .zip, bases del cliente, respaldos. |
| `audit-as-perf-eng` | **Adaptada.** Consultas, listas largas, memoria en un día de uso. |
| `audit-as-a11y-eng` | Teclado, lector de pantalla, contraste. |

Además, Claude Code trae `/security-review` y `/code-review` integrados.

## Origen y licencias

| Skills | Origen | Licencia |
|---|---|---|
| `brand`, `design-system`, `ui-ux-pro-max`, `apple-design` | Ya estaban en el repo | Ver cada carpeta |
| `frontend-design`, `webapp-testing` | Anthropic (skills de ejemplo) | Apache 2.0 (`LICENSE.txt`) |
| `web-design-guidelines` | Vercel Labs | MIT (`LICENSE.txt`) |
| `audit-as-*`, `full-audit`, `emil-design-engineering`, `make-interfaces-feel-better`, `vercel-react-best-practices`, `web-animation-design` | Plugin *audit-suite* 1.1.0 de Orbit (github.com/Recusive/Orbit-plugin) | MIT |
| `backend-sqlite`, `revision-seguridad` | Escritas para este proyecto | Del proyecto |

Las lentes marcadas **Adaptada** se reescribieron en español para este stack (el original era para Tauri + Rust + TypeScript). A `audit-as-design-eng`, `audit-as-ux-eng` y `audit-as-a11y-eng` se les agregó una nota de contexto. Se quitó la lente DX (era para herramientas de desarrolladores).
