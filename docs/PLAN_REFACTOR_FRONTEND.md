# Plan de refactor del frontend — De Panas SV

> **Para quien implementa:** sigue las fases **en orden**. No empieces una fase sin que la anterior cumpla todos sus criterios de aceptación. Cada fase termina en un commit. Si algo del plan choca con lo que ves en el código, detente y pregunta; no improvises.

## 0. Contexto

### Qué se hace
Reconstruir visualmente las vistas y componentes **que ya existen** en `frontend/src/` con la nueva marca, sin cambiar lo que hace la app:

| Tipo        | Archivos                                                                 |
| ----------- | ------------------------------------------------------------------------ |
| Páginas     | `pages/Inicio.jsx`, `pages/PantallaMaestra.jsx`, `pages/AgregarCompra.jsx` |
| Componentes | `Sidebar`, `Header`, `FilterModal`, `ConfirmModal`, `AutocompleteInput`   |
| Contexto    | `context/ToastContext.jsx`                                               |
| Estilos     | `index.css` (911 líneas) se elimina y se reemplaza por `src/styles/` + CSS Modules |

### Documentos que mandan (léelos antes de empezar)
1. **Brandbook DE PANAS (mayo 2026)**: fuente de colores, tipografías, logotipo y tono.
2. **Skills en `.claude/skills/`**: `apple-design` (proporciones, movimiento, materiales), `ui-ux-pro-max` (UX y accesibilidad), `design-system` (tokens de 3 capas), `brand`.
3. **`DESIGN_DECISIONS.md`**: la adaptación web concreta. La mayoría de los valores de este plan salen de ahí.
4. **`CLAUDE.md`**: arquitectura y convenciones.

**Precedencia ante un conflicto:** Brandbook > skills > `DESIGN_DECISIONS.md` > este plan.

### Decisiones tomadas para este plan
| Tema                 | Decisión                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| Navegación móvil     | **Barra inferior** fija (3 ítems). No hay drawer deslizable en esta fase. |
| Organización del CSS | **CSS Modules** (`Componente.module.css`) + globales en `src/styles/`     |
| Animación            | Librería **`motion`** (import desde `motion/react`)                       |
| Calidad              | **Vitest + Testing Library**, **ESLint con `jsx-a11y`** y checklists manuales |
| Repo                 | Fase 0: `.gitignore` y sacar `node_modules/` y `dist/` del índice          |
| Nombres              | Los componentes existentes conservan su nombre de archivo (`Header`, `Sidebar`, `FilterModal`…). Los **nuevos** van en español (`Boton`, `Campo`, `Selector`, `Tarjeta`, `Insignia`, `Modal`, `BarraInferior`) |

### Reglas que no se rompen en ninguna fase
- **No modificar `src/services/api.js`**: ni lógica, ni firmas, ni comentarios. Se verifica con `git diff --exit-code refactor-base -- frontend/src/services/api.js` (el tag se crea en la Fase 0).
- **No crear pantallas ni rutas nuevas.** Las rutas siguen siendo `/`, `/compras`, `/agregar-compra` y `*` → `/`.
- **Sin `#000000`/`#000`/`black`** en el CSS, **sin emojis** en la UI, **sin `style={{}}`** (única excepción en la Fase 7).
- Todo el código, los nombres y los textos de la UI van **en español**.
- Íconos solo de `lucide-react`.
- Nunca texto blanco o crema sobre Naranja Sazón, Amarillo Criollo o Verde Fresco.

### Problemas actuales que este plan corrige
| Problema                                                                 | Dónde                      | Fase |
| ------------------------------------------------------------------------ | -------------------------- | ---- |
| Sin navegación en móvil (la sidebar solo hace `display: none`)           | `index.css` línea ~885     | 4    |
| Los modales no atrapan el foco, no cierran con Escape ni devuelven el foco | `FilterModal`, `ConfirmModal` | 3, 6 |
| `FilterModal` no se resincroniza: al usar "Limpiar filtros" de la toolbar, el modal vuelve a abrir con los filtros viejos | `FilterModal.jsx` (`useState({...filters})`) | 6 |
| El autocompletado no tiene semántica ARIA de combobox y cierra con un `setTimeout(150)` | `AutocompleteInput.jsx`    | 6    |
| La validación es solo al guardar, los errores no están enlazados al campo y el aviso es solo un toast | `AgregarCompra.jsx`        | 6    |
| Los toasts usan `Date.now()` como id (puede repetirse) y no tienen `aria-live` | `ToastContext.jsx`         | 5    |
| Hay 51 bloques `style={{}}`                                              | páginas y componentes      | 3–6  |
| `getTodayISO()` usa `toISOString()` (UTC): después de las 18:00 en El Salvador la "fecha de hoy" sale como mañana y así se guarda en las compras | `AgregarCompra.jsx`        | 4, 6 |

---

## Estructura final esperada

```text
frontend/
├── index.html                       # fuentes Josefin Sans + Cardo (Fase 2)
├── eslint.config.js                 # nuevo (Fase 1)
├── vite.config.js                   # + bloque test (Fase 1)
└── src/
    ├── main.jsx                     # importa styles/global.css + MotionConfig
    ├── App.jsx
    ├── styles/
    │   ├── README.md
    │   ├── tokens.css               # 3 capas: primitivos, semánticos, componentes
    │   ├── base.css                 # reset, tipografía base, foco, utilidades a11y
    │   ├── global.css               # @import de tokens + base
    │   └── movimiento.js            # presets de springs y transiciones
    ├── hooks/
    │   ├── README.md
    │   ├── useFocoAtrapado.js
    │   └── useScrollDetectado.js
    ├── utils/
    │   ├── README.md
    │   └── formato.js               # formatearPrecio, formatearFecha, formatearFechaLarga
    ├── components/
    │   ├── README.md
    │   ├── common/
    │   │   ├── README.md
    │   │   ├── Boton.jsx + Boton.module.css
    │   │   ├── Campo.jsx + Campo.module.css
    │   │   ├── Selector.jsx + Selector.module.css
    │   │   ├── Tarjeta.jsx + Tarjeta.module.css
    │   │   ├── Insignia.jsx + Insignia.module.css
    │   │   ├── Modal.jsx + Modal.module.css
    │   │   ├── EstadoVacio.jsx + EstadoVacio.module.css
    │   │   └── index.js             # re-exporta todos
    │   ├── Sidebar.jsx + Sidebar.module.css
    │   ├── BarraInferior.jsx + BarraInferior.module.css
    │   ├── Header.jsx + Header.module.css
    │   ├── FilterModal.jsx + FilterModal.module.css
    │   ├── ConfirmModal.jsx
    │   └── AutocompleteInput.jsx + AutocompleteInput.module.css
    ├── context/
    │   ├── README.md
    │   ├── ToastContext.jsx + Toast.module.css
    ├── pages/
    │   ├── README.md
    │   ├── Inicio.jsx + Inicio.module.css
    │   ├── PantallaMaestra.jsx + PantallaMaestra.module.css
    │   └── AgregarCompra.jsx + AgregarCompra.module.css
    ├── services/api.js              # SIN CAMBIOS
    └── test/
        └── setup.js
docs/
├── PLAN_REFACTOR_FRONTEND.md        # este archivo
└── DECISIONS.md                     # Fase 8
```

---

## Fase 0 — Preparar el repositorio

**Objetivo:** que los diffs del refactor sean legibles y tener una base de comparación.

**Pasos**
1. Confirma que el árbol de trabajo está limpio (`git status`). Si hay cambios pendientes que no son tuyos, **detente y pregunta**.
2. Crea la rama y marca el punto de partida (sirve para verificar al final que `api.js` no cambió):
   ```bash
   git checkout -b refactor/frontend-marca
   ```
   ```bash
   git tag refactor-base
   ```
3. Crea `.gitignore` en la raíz del repo:
   ```gitignore
   node_modules/
   dist/
   __pycache__/
   *.log
   .DS_Store
   ```
4. Saca del índice lo que no debe versionarse (sin borrarlo del disco):
   ```bash
   git rm -r --cached frontend/node_modules frontend/dist
   ```
5. Desde `frontend/`, ejecuta `npm install` y luego `npm run build`. Las dos deben terminar sin errores.
6. Ejecuta `npm run dev` y toma capturas de las 3 pantallas en 1280px y 375px de ancho. Guárdalas en `docs/capturas/antes/` para comparar al final.

**Criterios de aceptación**
- `git status` ya no lista archivos de `node_modules/` ni de `dist/`.
- `npm run build` pasa.

**Commit:** `chore: ignorar node_modules y dist`

---

## Fase 1 — Herramientas

**Objetivo:** instalar animación, tests y linter antes de tocar código visual.

**Pasos**
1. Desde `frontend/`, instala las dependencias:
   ```bash
   npm install motion
   ```
   ```bash
   npm install -D vitest@^2 jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
   ```
   ```bash
   npm install -D eslint@^9 @eslint/js globals eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
   ```
2. Agrega los scripts a `package.json`:
   ```json
   "test": "vitest",
   "test:run": "vitest run",
   "lint": "eslint ."
   ```
3. En `vite.config.js`, agrega el bloque `test` sin tocar `server.proxy`:
   ```js
   test: {
     environment: 'jsdom',
     globals: true,
     setupFiles: './src/test/setup.js',
     css: { modules: { classNameStrategy: 'non-scoped' } },
   },
   ```
4. Crea `src/test/setup.js`. Motion consulta `matchMedia`, que no existe en jsdom; sin este mock los tests revientan.
   ```js
   import '@testing-library/jest-dom/vitest'

   window.matchMedia = window.matchMedia || ((query) => ({
     matches: false,
     media: query,
     onchange: null,
     addEventListener: () => {},
     removeEventListener: () => {},
     addListener: () => {},
     removeListener: () => {},
     dispatchEvent: () => false,
   }))

   beforeEach(() => localStorage.clear())
   ```
5. Crea `eslint.config.js` (flat config):
   ```js
   import js from '@eslint/js'
   import globals from 'globals'
   import react from 'eslint-plugin-react'
   import reactHooks from 'eslint-plugin-react-hooks'
   import jsxA11y from 'eslint-plugin-jsx-a11y'

   export default [
     { ignores: ['dist', 'node_modules'] },
     js.configs.recommended,
     {
       files: ['**/*.{js,jsx}'],
       languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
         globals: { ...globals.browser, ...globals.node, ...globals.vitest },
         parserOptions: { ecmaFeatures: { jsx: true } },
       },
       settings: { react: { version: '18.3' } },
       plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
       rules: {
         ...react.configs.recommended.rules,
         ...react.configs['jsx-runtime'].rules,
         ...reactHooks.configs.recommended.rules,
         ...jsxA11y.configs.strict.rules,
         'react/prop-types': 'off',
         'react/forbid-dom-props': ['error', { forbid: ['style'] }],
       },
     },
   ]
   ```
   La regla `react/forbid-dom-props` hace que ESLint rechace cualquier `style={{}}` nuevo.
6. Ejecuta `npm run lint`. **Se espera que falle** con el código actual (los `style` y los problemas de a11y). Anota cuántos errores hay; esos errores son la lista de trabajo de las fases 3 a 6.

**Criterios de aceptación**
- `npm run test:run` arranca (no hay tests aún; "no test files found" es aceptable).
- `npm run build` sigue pasando.

**Commit:** `chore: agregar motion, vitest y eslint`

---

## Fase 2 — Fundaciones: tipografía, tokens y movimiento

**Objetivo:** crear el sistema de diseño **sin romper** las pantallas actuales. `index.css` sigue cargado hasta la Fase 7.

### 2.1 Fuentes (`frontend/index.html`)
Reemplaza el `<link>` de Nunito Sans por:
```html
<link href="https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Josefin+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
```
No toques los `<link rel="icon">`, el manifest ni el `theme-color` que ya están.

### 2.2 `src/styles/tokens.css`
Tres capas según la skill `design-system`. Copia los valores tal cual; salen de `DESIGN_DECISIONS.md`.

```css
/* =========================================================
   CAPA 1 — PRIMITIVOS (Brandbook DE PANAS, mayo 2026)
   No usar directamente en componentes: usar la capa 2.
   ========================================================= */
:root {
  --rojo-vinotinto:   #911C0D;
  --naranja-sazon:    #EF7D05;
  --amarillo-criollo: #F8A914;
  --verde-fresco:     #6DAD28;
  --verde-avila:      #144428;
  --crema-trigo:      #FEEECC;
  --blanco:           #FFFFFF;

  /* Derivados documentados en DESIGN_DECISIONS.md */
  --crema-claro:      #FFF8EB;
  --avila-75:         #4F735E;
  --avila-borde:      #728F7E;
  --borde-suave:      #C4C4A3;
  --tinte-exito:      #E2EFD4;
  --tinte-aviso:      #FDE5B8;
  --tinte-error:      #F4E8E7;

  /* Espaciado (base 4px, en rem) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  /* Radios */
  --radio-input: 12px;
  --radio-tarjeta: 20px;
  --radio-modal: 24px;
  --radio-pildora: 999px;

  /* Tipografía */
  --fuente-titulos: 'Josefin Sans', system-ui, sans-serif;
  --fuente-texto: 'Cardo', Georgia, serif;

  /* Medidas de layout */
  --ancho-sidebar: 15rem;
  --alto-header: 4rem;
  --alto-barra-inferior: 4rem;
  --alto-control: 2.75rem; /* 44px: área táctil mínima */
}

/* =========================================================
   CAPA 2 — SEMÁNTICOS (qué significa cada color)
   ========================================================= */
:root {
  --color-bg:            var(--crema-trigo);
  --color-surface:       var(--blanco);
  --color-surface-soft:  var(--crema-claro);
  --color-text:          var(--verde-avila);
  --color-text-muted:    var(--avila-75);
  --color-border:        var(--borde-suave);
  --color-border-input:  var(--avila-borde);
  --color-primary:       var(--verde-avila);
  --color-on-primary:    var(--crema-trigo);
  --color-brand:         var(--naranja-sazon);
  --color-accent:        var(--amarillo-criollo);
  --color-danger:        var(--rojo-vinotinto);
  --color-on-danger:     var(--blanco);
  --color-success:       var(--verde-fresco);
  --color-warning:       var(--amarillo-criollo);
  --color-focus:         var(--rojo-vinotinto);

  --sombra-marca:  3px 4px 0 var(--rojo-vinotinto);
  --sombra-modal:  0 24px 48px rgb(20 68 40 / 0.18);
  --sombra-flotante: 0 8px 24px rgb(20 68 40 / 0.12);
  --scrim:         rgb(20 68 40 / 0.4);
  --material-header: rgb(254 238 204 / 0.8);
}

/* =========================================================
   CAPA 3 — COMPONENTES
   Cada *.module.css define sus tokens locales (p. ej. --boton-fondo)
   a partir de la capa 2. Aquí solo van los compartidos.
   ========================================================= */
:root {
  --campo-alto: var(--alto-control);
  --campo-borde: var(--color-border-input);
  --campo-radio: var(--radio-input);
}
```

### 2.3 `src/styles/base.css`
Debe contener, en este orden:
1. **Reset:** `box-sizing: border-box` y márgenes en 0.
2. **`html`:** `font-size: 100%`, para respetar el tamaño de texto que elija el usuario.
3. **`body`:** `background: var(--color-bg)`, `color: var(--color-text)`, `font-family: var(--fuente-texto)`, `font-size: 1rem`, `line-height: 1.6`.
4. **`h1, h2, h3, button, input, select, label, th`:** `font-family: var(--fuente-titulos)`.
5. **Escala tipográfica** de `DESIGN_DECISIONS.md` → Tipografía → Aplicación web: tamaño, peso, interlineado y tracking por elemento. Los titulares H1 y H2 van con `text-transform: uppercase`.
6. **Foco visible global:**
   ```css
   :focus-visible {
     outline: 2px solid var(--color-focus);
     outline-offset: 2px;
   }
   ```
7. **Utilidad para lectores de pantalla:** `.solo-lector` (el patrón visually-hidden).
8. **Movimiento reducido:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       transition-duration: 200ms !important;
       transition-property: opacity, color, background-color, border-color !important;
       animation: none !important;
     }
   }
   ```

`global.css` solo contiene `@import './tokens.css';` y `@import './base.css';`.

### 2.4 `src/styles/movimiento.js`
Valores de `apple-design`, centralizados. **Ningún componente escribe valores de spring a mano.**
```js
// Spring por defecto: sin rebote (damping 1.0, response ~0.35 s)
export const springSuave = { type: 'spring', bounce: 0, duration: 0.35 }

// Solo cuando el gesto trae inercia (damping 0.8, response 0.3 s)
export const springConImpulso = { type: 'spring', bounce: 0.2, duration: 0.3 }

// Fundido simple (lo que queda con movimiento reducido)
export const fundido = { duration: 0.2, ease: 'easeOut' }

// Variantes reutilizables: entra y sale por el mismo camino
export const variantesModal = {
  oculto:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
}
export const variantesScrim = {
  oculto:  { opacity: 0 },
  visible: { opacity: 1 },
}
export const variantesDesplegable = {
  oculto:  { opacity: 0, scaleY: 0.96, y: -4 },
  visible: { opacity: 1, scaleY: 1, y: 0 },
}
```

### 2.5 `src/main.jsx`
1. Importa `./styles/global.css` **después** de `./index.css`, para que lo nuevo gane mientras conviven.
2. Envuelve `<App />` con `MotionConfig`. `reducedMotion="user"` hace que Motion desactive transformaciones cuando el sistema lo pide y deje solo opacidad.
   ```jsx
   import { MotionConfig } from 'motion/react'
   // ...
   <MotionConfig reducedMotion="user">
     <App />
   </MotionConfig>
   ```

**Criterios de aceptación**
- La app arranca y el texto ya se ve en Josefin Sans/Cardo. Que las pantallas se vean "mezcladas" es normal en esta fase.
- `grep -rnE "#000\b|#000000|black" src/styles` no devuelve nada.

**Commit:** `feat(estilos): tokens de marca, base tipográfica y presets de movimiento`

---

## Fase 3 — Componentes comunes (`src/components/common/`)

**Objetivo:** las piezas que reemplazan los 51 `style={{}}`. Cada componente lleva su `.module.css` y **al menos un test** en `Componente.test.jsx`.

### Convenciones para todos
- Props en español. Las props HTML nativas se pasan con `...resto`.
- Las clases se combinan con un array y `.filter(Boolean).join(' ')`, sin librerías nuevas.
- Solo `transform` y `opacity` se animan.
- Cada componente reenvía `ref` cuando envuelve un control nativo (`forwardRef`), porque el resumen de errores necesita poder enfocar los campos.

### 3.1 `Boton`
```jsx
<Boton variante="primario" tamano="md" icono={<Save />} cargando={guardando} onClick={...}>
  Guardar compra
</Boton>
```
| Prop       | Valores                                                       | Default      |
| ---------- | ------------------------------------------------------------- | ------------ |
| `variante` | `primario` · `secundario` · `fantasma` · `peligro` · `icono`   | `secundario` |
| `tamano`   | `sm` · `md`                                                   | `md`         |
| `icono`    | elemento de Lucide (`size` lo pone el botón: 16)              | —            |
| `cargando` | boolean: deshabilita y muestra `Loader2` girando con `aria-busy` | `false`   |
| `sombra`   | boolean: sombra de marca Vinotinto                            | `false`      |

Estilos por variante:
- **primario:** fondo `--color-primary`, texto `--color-on-primary`, MAYÚSCULAS, `letter-spacing: 0.04em`, forma de píldora.
- **secundario:** fondo blanco, borde de 2px y texto `--color-primary`.
- **fantasma:** fondo transparente y texto `--color-primary`; en hover, fondo `--color-surface-soft`.
- **peligro:** fondo `--color-danger` y texto `--color-on-danger`.
- **icono:** cuadrado de 44×44 y forma de píldora. **Exige `aria-label`**; si falta, lanza `console.error` en desarrollo.

Comportamiento común:
- **Alto mínimo** `var(--alto-control)` en todas las variantes. En `sm`, el área táctil sigue siendo de 44px (usa padding o `::after`).
- **Feedback al presionar**, en CSS y no en Motion, porque debe ser instantáneo:
  ```css
  .boton { transition: transform 100ms ease-out, box-shadow 100ms ease-out; }
  .boton:active:not(:disabled) { transform: scale(0.97); }
  .conSombra { box-shadow: var(--sombra-marca); }
  .conSombra:active:not(:disabled) { transform: translate(3px, 4px); box-shadow: 0 0 0 transparent; }
  ```
- **Deshabilitado:** `opacity: 0.5`, `cursor: not-allowed`, sin transform.

### 3.2 `Campo` (input con label, ayuda y error)
```jsx
<Campo id="precio-1" etiqueta="Precio" tipo="number" prefijo="$" error={error} ayuda="..." etiquetaOculta {...props} />
```
- La `<label htmlFor>` siempre existe. Con `etiquetaOculta`, lleva la clase `solo-lector`. Esto se usa dentro de las tablas, donde el encabezado de columna ya es visible.
- Si hay `error`:
  - `aria-invalid="true"`.
  - `aria-describedby="{id}-error"`.
  - Debajo del campo, `<p id="{id}-error">` con el ícono `AlertCircle` (14px) y el texto en `--color-danger`.
  - Borde `--color-danger`.
- La `ayuda` va con `id="{id}-ayuda"` y se suma a `aria-describedby`.
- `prefijo` (por ejemplo `$`) va posicionado dentro del input con CSS, nunca inline.
- Alto `--campo-alto`, radio `--campo-radio` y borde `--campo-borde`; en foco, el borde pasa a `--color-primary` y se agrega el outline global.

### 3.3 `Selector`
Mismo contrato que `Campo` (`id`, `etiqueta`, `etiquetaOculta`, `error`), pero renderiza un `<select>` nativo, sin librerías. La flecha es `ChevronDown` de Lucide, posicionada con CSS y con `pointer-events: none`. Recibe `opciones: string[] | {valor, texto}[]`.

### 3.4 `Tarjeta`
```jsx
<Tarjeta titulo="Registro de compras" icono={<ShoppingCart />} accion={<span>5 registros</span>} sombra>
  ...contenido
</Tarjeta>
```
- Fondo `--color-surface`, radio `--radio-tarjeta` y borde de 1px `--color-border`.
- El encabezado es opcional: `titulo` (h2 en Josefin 700 y MAYÚSCULAS), `icono` y `accion` a la derecha.
- `sombra` agrega `--sombra-marca`; úsala solo en tarjetas destacadas.
- `interactiva` (boolean): la tarjeta se renderiza como `<button>` o como `Link`, según se pase `onClick` o `a`, con feedback de presión. **Nunca** se pone `onClick` en un `div` como hace hoy `Inicio.jsx`.

### 3.5 `Insignia`
```jsx
<Insignia tono="neutro|marca|exito|aviso|error">Compras</Insignia>
```
Forma de píldora, Josefin 600 de 0.875rem. Colores (todos AA):
| Tono     | Fondo                  | Texto            |
| -------- | ---------------------- | ---------------- |
| `neutro` | `--color-surface-soft` | `--color-text`   |
| `marca`  | `--color-accent`       | `--color-text`   |
| `exito`  | `--tinte-exito`        | `--color-text`   |
| `aviso`  | `--tinte-aviso`        | `--color-text`   |
| `error`  | `--tinte-error`        | `--color-danger` |

### 3.6 `Modal` + hook `useFocoAtrapado`
Base de `FilterModal` y `ConfirmModal`. Usa `AnimatePresence` para poder animar la salida.

```jsx
<Modal abierto={abierto} alCerrar={cerrar} titulo="Filtrar compras" icono={<SlidersHorizontal />}
       pie={<>...botones</>} rol="dialog|alertdialog" anchoMax="md|sm">
  ...contenido
</Modal>
```

Requisitos obligatorios:
- **Portal:** se renderiza con `createPortal(..., document.body)`.
- **Semántica:** `role` (`dialog` por defecto, `alertdialog` para confirmaciones), `aria-modal="true"` y `aria-labelledby` apuntando al título.
- **Foco:** al abrir, el foco va al primer elemento enfocable, o al que se indique con la prop `focoInicial` (un ref). Tab y Shift+Tab ciclan dentro del modal y al cerrar el foco vuelve al botón que lo abrió.
- **Cierre:** Escape cierra. Un clic en el scrim también cierra, salvo con `rol="alertdialog"`.
- **Scroll:** mientras está abierto, el `body` queda con `overflow: hidden`.
- **Animación:**
  - Scrim con `variantesScrim`; modal con `variantesModal` y `springSuave`. Entra y sale por el mismo camino.
  - Se puede **interrumpir**: si se reabre mientras se cierra, Motion parte del valor actual.
  - Nunca se bloquea el input durante la animación.
- **Estilos:** scrim `var(--scrim)`; modal blanco y sólido, radio `--radio-modal`, sombra `--sombra-modal`. Ancho máximo de 28rem (`sm`) o 36rem (`md`), con 100% − `--space-8` en móvil.

`src/hooks/useFocoAtrapado.js` (referencia; impleméntalo y pruébalo):
```js
import { useEffect, useRef } from 'react'

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocoAtrapado(activo, alCerrar, focoInicialRef) {
  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!activo) return
    const anterior = document.activeElement
    const contenedor = contenedorRef.current
    const enfocables = () => [...contenedor.querySelectorAll(ENFOCABLES)]
    ;(focoInicialRef?.current ?? enfocables()[0])?.focus()

    function alTeclear(e) {
      if (e.key === 'Escape') { e.stopPropagation(); alCerrar(); return }
      if (e.key !== 'Tab') return
      const lista = enfocables()
      if (lista.length === 0) return
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }

    contenedor.addEventListener('keydown', alTeclear)
    return () => {
      contenedor.removeEventListener('keydown', alTeclear)
      anterior?.focus?.()
    }
  }, [activo, alCerrar, focoInicialRef])

  return contenedorRef
}
```

### 3.7 `EstadoVacio`
```jsx
<EstadoVacio icono={<ShoppingCart />} titulo="Todavía no hay compras." texto="¡Agreguemos la primera!" accion={<Boton .../>} />
```
- Ícono de Lucide de 40px en `--color-brand`; el naranja como ícono grande decorativo está permitido.
- Título en Josefin 700 y texto en Cardo; todo centrado.
- Se usa también para el estado "cargando", con `Loader2` girando y `role="status"`.

### 3.8 `index.js`
Re-exporta todo: `export { default as Boton } from './Boton'`, etc.

**Tests mínimos de esta fase**
| Componente | Qué se prueba                                                                 |
| ---------- | ----------------------------------------------------------------------------- |
| `Boton`    | Con `cargando`, está deshabilitado y tiene `aria-busy`. `variante="icono"` sin `aria-label` dispara `console.error`. |
| `Campo`    | Con `error`, el input tiene `aria-invalid` y su `aria-describedby` apunta a un nodo que contiene el texto del error. |
| `Modal`    | Escape llama a `alCerrar`. Al cerrar, el foco vuelve al botón que lo abrió. Tab desde el último elemento vuelve al primero. |
| `Insignia` | Renderiza el texto con la clase del tono.                                     |

**Criterios de aceptación**
- `npm run test:run` pasa.
- `npm run lint -- src/components/common src/hooks` sin errores.

**Commit:** `feat(componentes): biblioteca común (Boton, Campo, Selector, Tarjeta, Insignia, Modal, EstadoVacio)`

---

## Fase 4 — Layout global y navegación

### 4.1 `App.jsx`
Estructura:
```jsx
<ToastProvider>
  <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
  <div className={estilos.layout}>
    <Sidebar />            {/* visible ≥ 768px */}
    <div className={estilos.areaPrincipal}>
      <Routes>…sin cambios…</Routes>
    </div>
    <BarraInferior />      {/* visible < 768px */}
  </div>
</ToastProvider>
```
- El enlace "Saltar al contenido" queda oculto hasta recibir foco. Cada página pone `id="contenido"` y `tabIndex={-1}` en su `<main>`.
- **Grilla:** `grid-template-columns: var(--ancho-sidebar) 1fr` en desktop y una sola columna en móvil.
- En móvil, `areaPrincipal` lleva `padding-bottom: calc(var(--alto-barra-inferior) + env(safe-area-inset-bottom))`.
- **Cambio de ruta:** mueve el foco al `<main>` de la nueva página y actualiza `document.title` a `"{Título} | De Panas SV"`. Usa un `useEffect` sobre `useLocation()`.

### 4.2 `Sidebar.jsx`
- Fondo sólido `--color-primary` (Verde Ávila) y texto `--color-on-primary`. Es material "pesado" y estructural.
- **Logo:** `"DE PANAS"` en Josefin Sans 700, MAYÚSCULAS, 1.5rem y color `--crema-trigo`. Debajo, una franja de 4px en `--color-brand` como acento de identidad. Se elimina el emoji `🍽️` y el texto "Gestión SV".
- **Navegación:**
  - Lista `<nav aria-label="Menú principal"><ul><li><NavLink>`, con alto de 44px y forma de píldora.
  - El ítem activo es una píldora `--color-accent` con texto `--color-text`, más `aria-current="page"` (NavLink ya lo pone).
  - El hover usa fondo `rgb(254 238 204 / 0.12)`.
- **Íconos:** `LayoutDashboard`, `ShoppingCart` y `PlusCircle`, de 20px. Elimina los imports sin uso (`Package`, `BarChart2`, `Settings`, `UtensilsCrossed`).
- Extrae `navItems` a `src/components/navegacion.js` para que `Sidebar` y `BarraInferior` usen la misma lista.
- Visible solo en ≥ 768px; posición `sticky` y `height: 100dvh`.

### 4.3 `BarraInferior.jsx` (nuevo)
- Visible solo en < 768px. `position: fixed`, abajo, alto `--alto-barra-inferior` + `env(safe-area-inset-bottom)`.
- Fondo sólido `--color-primary`; los 3 ítems de `navegacion.js` se reparten en partes iguales.
- Cada ítem lleva ícono de 22px y etiqueta corta debajo ("Inicio", "Compras", "Agregar") en Josefin 600 de 0.75rem. Es la única excepción al mínimo de 14px y se justifica porque siempre va acompañada de ícono. El área táctil es de ≥ 44×44.
- **Ítem activo:** una píldora `--color-accent` detrás del ícono, texto `--color-text`, `aria-current="page"`. La píldora se mueve entre ítems con `layoutId="nav-activa"` de Motion y `springSuave`. Ese movimiento parte del valor actual y se puede interrumpir.

### 4.4 `Header.jsx` (material translúcido)
- Misma API: `title` y `badge`. Para no romper las páginas, conserva los nombres de las props.
- `position: sticky; top: 0`, alto `--alto-header`.
- **Material:**
  ```css
  .header {
    background: var(--material-header);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }
  .header[data-scroll='true']::after { opacity: 1; }   /* borde de desvanecido inferior */
  .header::after {
    content: ''; position: absolute; inset: auto 0 -12px 0; height: 12px;
    background: linear-gradient(rgb(20 68 40 / 0.08), transparent);
    opacity: 0; transition: opacity 200ms ease-out; pointer-events: none;
  }
  @media (prefers-reduced-transparency: reduce) {
    .header { background: var(--crema-trigo); backdrop-filter: none; -webkit-backdrop-filter: none; }
  }
  @media (prefers-contrast: more) {
    .header { background: var(--crema-trigo); backdrop-filter: none; border-bottom: 1px solid var(--color-border-input); }
  }
  ```
- `data-scroll` se activa con el hook `useScrollDetectado`: un `IntersectionObserver` sobre un elemento centinela de 1px al inicio del contenido, **no** un listener de `scroll` (por rendimiento).
- **Contenido:**
  - `<h1>` en MAYÚSCULAS con `title` y, al lado, `<Insignia tono="marca">{badge}</Insignia>`.
  - A la derecha, la fecha con `Calendar`, formateada con `formatearFechaLarga` de `utils/formato.js`, en `--color-text-muted` y con peso 600. Sobre un material translúcido el texto lleva un peso más.
  - En < 480px la fecha se oculta y en < 768px, además del título, aparece "DE PANAS" pequeño a la izquierda, porque ahí no hay sidebar.

### 4.5 `utils/formato.js`
Mueve aquí las funciones que hoy están duplicadas en las páginas:
```js
export function formatearPrecio(valor)        // → "$12.50"
export function formatearFecha(isoFecha)      // "2026-09-28" → "28/09/2026"
export function formatearFechaLarga(fecha)    // Date → "sábado, 3 de octubre de 2026"
export function formatearFechaTexto(isoFecha) // "2026-09-28" → "28 de septiembre de 2026"
export function fechaHoyISO(fecha = new Date()) // fecha LOCAL en "YYYY-MM-DD"
```
`fechaHoyISO` reemplaza a `getTodayISO()` de `AgregarCompra.jsx`. **No uses `toISOString()`**, que convierte a UTC; arma la cadena con `getFullYear()`, `getMonth() + 1` y `getDate()`, con ceros a la izquierda. Test obligatorio: `fechaHoyISO(new Date(2026, 9, 3, 23, 30)) === '2026-10-03'`.
**Atención:** `Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' })` puede devolver `US$12.50` según el navegador. El requisito es `$12.50`. Prueba la salida; si no coincide, usa `minimumFractionDigits: 2` con `style: 'decimal'` y antepón `$`. El test `formatearPrecio(12.5) === '$12.50'` es obligatorio.

**Criterios de aceptación**
- En 1280px se ve la sidebar y no la barra; en 375px, al revés. Se puede navegar en ambos tamaños.
- Al hacer scroll, aparece el borde desvanecido bajo el header y el contenido se ve borroso detrás.
- El enlace "Saltar al contenido" aparece con Tab y funciona.

**Commit:** `feat(layout): sidebar, barra inferior móvil y header translúcido`

---

## Fase 5 — Notificaciones (`ToastContext.jsx`)

**La API pública no cambia:** `const { addToast } = useToast()` y `addToast(mensaje, tipo = 'success')`, con `tipo` igual a `'success'` o `'error'`. Las páginas no deben tener que cambiar sus llamadas.

**Cambios**
- **Id:** contador con `useRef`, en lugar de `Date.now()`.
- **Regiones vivas:** dos regiones permanentes en el DOM, una para cada tipo de mensaje:
  - Éxito: `<div role="status" aria-live="polite">`.
  - Error: `<div role="alert" aria-live="assertive">`.
- **Aspecto:**
  - Éxito: fondo `--tinte-exito`, ícono `CheckCircle2` en `--color-text` y texto `--color-text`.
  - Error: fondo `--tinte-error`, ícono `XCircle` en `--color-danger` y texto `--color-danger`.
  - Fuera los emojis ✅ y ❌.
  - Radio `--radio-tarjeta`, sombra `--sombra-flotante` y Josefin 600.
- **Cierre:** botón ✕ (`Boton variante="icono"` con `aria-label="Cerrar notificación"`). Cierre automático a los 3.5 s; el temporizador se pausa con hover o con foco dentro del toast.
- **Posición y movimiento** (consistencia espacial):
  - Desktop: abajo a la derecha. Entra con `x: 24 → 0` y `opacity: 0 → 1`, y sale por el mismo camino (`x: 24`).
  - Móvil: arriba y centrado, porque abajo está la barra. Entra y sale con `y: -16`.
  - Usa `AnimatePresence` y `springSuave`; los toasts que quedan se reacomodan con `layout`.
- Envuelve `addToast` en `useCallback` (ya lo está) y el `value` del provider en `useMemo`.

**Test:** `addToast('Hola')` muestra "Hola" dentro de `role="status"`; `addToast('Falló', 'error')` lo muestra dentro de `role="alert"`; con timers falsos (`vi.useFakeTimers()`), desaparece a los 3.5 s.

**Commit:** `feat(toasts): notificaciones de marca accesibles`

---

## Fase 6 — Páginas

### 6.1 Inicio (`/`)
- **Header:** `title="Inicio"`, `badge="De Panas SV"`.
- **Bienvenida:**
  - `Tarjeta` con fondo `--color-surface` y franja superior de 6px en `--color-brand`. Se acaba el degradado marrón.
  - Columna de texto:
    - `<h2>`: "¡Epa! Bienvenido a De Panas".
    - Párrafo en Cardo: "Hoy toca registrar las compras. Consulta, agrega y lleva el control de lo que entra a la cocina."
    - Debajo, en Cardo itálica y `--color-text-muted`: "La verdadera sazón venezolana".
  - Columna del badge: `<img src="/brand/logo-badge.png" alt="Logotipo De Panas: Auténtico sabor venezolano" width="160" height="160">`, con `aspect-ratio: 1` y un margen libre de `--space-6` alrededor. Es el espacio de aislamiento. **Nunca** se deforma, recolorea ni se le pone sombra.
  - En móvil el badge va arriba, a 120px (el mínimo según `DESIGN_DECISIONS.md`), y el texto abajo.
  - Se eliminan los emojis `🍽️` y `🧑‍🍳`.
- **Acciones rápidas:** dos `Tarjeta interactiva` como enlaces de React Router, en una grilla `repeat(auto-fit, minmax(16rem, 1fr))` con gap `--space-4`:
  - "Ver compras" / "Consulta y filtra el registro": ícono `ShoppingCart` en un círculo `--color-surface-soft`.
  - "Agregar compra" / "Registra lo que compraste hoy": ícono `Plus` en un círculo `--color-primary` con ícono `--color-on-primary`, y `sombra`.
  - Al presionar, hundimiento hacia la sombra; en hover, `translateY(-2px)` en 150ms.

### 6.2 Pantalla Maestra (`/compras`)
- **Header:** `title="Compras"`, `badge="Pantalla maestra"`. Según `DESIGN_DECISIONS.md`, los nombres son específicos.
- **Toolbar:** se conserva toda la funcionalidad.
  - Botón "Filtrar" (`SlidersHorizontal`): `variante="secundario"` sin filtros y `variante="primario"` con filtros activos. Con filtros activos lleva una `Insignia tono="marca"` con el número y su texto accesible: `aria-label="Filtrar, 2 filtros activos"`.
  - "Limpiar filtros": `variante="fantasma"`, visible solo con filtros activos.
  - "Agregar compra": `variante="primario"`, `sombra`, ícono `Plus`; queda alineado a la derecha.
- **Tabla** dentro de `Tarjeta titulo="Registro de compras" icono={<ShoppingCart/>}`, con el contador en `accion`:
  - `<table>` con `<caption className="solo-lector">Compras registradas</caption>`.
  - Encabezados con `scope="col"`: Proveedor, Producto, Cantidad, Precio, Fecha y una última columna sin texto visible (`<span className="solo-lector">Acciones</span>`).
  - El `thead` va en `--color-surface-soft` con Josefin 600; las filas tienen divisor de 1px `--color-border` y hover con fondo `--color-surface-soft`.
  - El proveedor va en `Insignia tono="neutro"`, el producto en peso 600 y la cantidad como texto ("3 lb").
  - **Precio:** alineado a la derecha, con `font-variant-numeric: tabular-nums` y `formatearPrecio`. El encabezado "Precio" también va a la derecha.
  - La fecha usa `formatearFecha`.
  - Eliminar es un `Boton variante="icono"` con `Trash2` y `aria-label="Eliminar compra de {producto}"`; en hover, color `--color-danger`.
  - **Móvil (< 768px):** la tabla se convierte en lista de tarjetas. Cada fila es un `<li>` con producto, proveedor, cantidad, precio y fecha. Cambia el CSS (`display: block` y etiquetas con `data-etiqueta` + `::before`), **no** el JSX.
- **Estados:**
  - Cargando: `EstadoVacio` con `Loader2` y "Cargando compras…".
  - Vacío sin filtros: `EstadoVacio` "Todavía no hay compras." / "¡Agreguemos la primera!" con un botón primario "Agregar compra".
  - Vacío con filtros: "Sin resultados" / "Prueba con otros filtros" con un botón fantasma "Limpiar filtros".
- **Lógica:** `loadCompras`, `handleDelete` y `EMPTY_FILTERS` siguen exactamente igual.

### 6.3 `FilterModal`
- Construido sobre `Modal`, con `titulo="Filtrar compras"`, `icono={<SlidersHorizontal/>}` y `anchoMax="md"`.
- Campos: dos `Campo` para Proveedor y Producto, y dos `Campo tipo="date"` para Desde y Hasta. En desktop van en grilla de 2 columnas y en móvil, en 1.
- **Corrección del bug:** sincroniza el estado local cada vez que se abre:
  ```js
  useEffect(() => { if (isOpen) setLocal({ ...filters }) }, [isOpen, filters])
  ```
- **Validación:** si `fechaDesde > fechaHasta`, muestra el error en `Campo` "Hasta": "La fecha final debe ser igual o posterior a la inicial". Mientras haya error, "Aplicar filtros" queda deshabilitado.
- **Pie:** "Limpiar" (`fantasma`) y "Aplicar filtros" (`primario`).
- **Anclaje visual:** el modal escala desde el centro con `variantesModal`, sin `transform-origin` especial, porque es un diálogo centrado y no un popover.
- La API pública (`isOpen`, `onClose`, `filters`, `onApply`) no cambia.

### 6.4 `ConfirmModal`
- Construido sobre `Modal` con `rol="alertdialog"` y `anchoMax="sm"`. El clic en el scrim **no** cierra.
- Con `danger`, el ícono es `AlertTriangle` en `--color-danger` y el botón de confirmar es `variante="peligro"`.
- El mensaje va en Cardo con `--color-text`.
- **Foco seguro:** al abrir, el foco va a **"Cancelar"**, nunca al botón destructivo. Se usa la prop `focoInicial`.
- La API pública no cambia: `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `danger`.

### 6.5 Agregar Compra (`/agregar-compra`)
- **Header:** `title="Agregar compra"`.
- **Encabezado de página:**
  - Arriba a la izquierda, `Boton variante="fantasma"` con `ArrowLeft` y "Volver a compras".
  - A la derecha, una `Tarjeta` pequeña con la fecha de hoy:
    - Ícono `CalendarDays`.
    - La fecha con `formatearFechaTexto(hoy)` en Josefin 700, donde `hoy = fechaHoyISO()`. Elimina `getTodayISO()` y `formatDateDisplay()` del archivo; `emptyFila()` también usa `fechaHoyISO()`.
    - La nota en Cardo: "Esta fecha se aplica a todo lo que agregues ahora; puedes cambiarla por fila."
- **Tabla editable** dentro de `Tarjeta titulo="Detalle de compras"`, con el contador de filas en `accion`:
  - Columnas: Proveedor (`AutocompleteInput`), Producto (`AutocompleteInput`), Cantidad (`Campo tipo="number"` + `Selector` de unidades), Precio (`Campo prefijo="$"`), Fecha (`Campo tipo="date"`) y eliminar fila.
  - Cada campo usa `etiquetaOculta` con una etiqueta completa, por ejemplo `etiqueta={\`Proveedor, fila ${n}\`}`.
  - `UNIDADES` sigue siendo la misma lista.
  - Eliminar fila: `Boton variante="icono"` con `aria-label="Eliminar fila {n}"`, deshabilitado si solo hay una fila.
  - Al agregar una fila, ésta entra con `opacity` y `y: -8 → 0` usando `springSuave`, y el foco va a su campo Proveedor. Al eliminarla, sale por el mismo camino (`AnimatePresence` sobre los `<tr>`, con `motion.tr`).
  - "Agregar otra fila": `Boton variante="secundario"` con `Plus`, a lo ancho y con borde punteado.
  - **Móvil:** cada fila se convierte en una tarjeta con los campos apilados; aquí las etiquetas se ven, sin `etiquetaOculta` en ese tamaño. Implementa una clase CSS que anule `solo-lector` dentro de la vista móvil.
- **Validación en línea** (reemplaza la lógica actual de `handleGuardar` y `errors`):
  - **Estado:** `errores` (igual que hoy, con claves `"{filaId}-{campo}"`) más `tocados`, un `Set` con las mismas claves.
  - **`onBlur` de un campo:** márcalo como tocado y ejecuta `validateFila` sobre su fila; guarda **solo** el error de ese campo. La función `validateFila` se conserva tal cual.
  - **`onChange`:** si el campo ya tenía error, revalídalo en vivo para que el error desaparezca apenas se corrige. Si no lo tenía, no muestres errores mientras el usuario escribe.
  - **Al guardar con errores:**
    1. Marca todo como tocado.
    2. Muestra **arriba de la tabla** un resumen: `<div role="alert" tabIndex={-1} ref={resumenRef}>` con el título "Revisa estos campos" y una lista de enlaces. Cada enlace dice "Fila 2: Precio inválido" y apunta a `#precio-{id}`; al hacer clic enfoca el campo.
    3. Mueve el foco al resumen.
    4. **No** muestres el toast de error de validación; el resumen lo reemplaza.
  - El resumen desaparece cuando ya no quedan errores.
  - Los mensajes son claros y sin modismos:
    | Campo     | Mensaje                       |
    | --------- | ----------------------------- |
    | Proveedor | "Escribe el proveedor"        |
    | Producto  | "Escribe el producto"         |
    | Cantidad  | "Ingresa una cantidad mayor a 0" |
    | Precio    | "Ingresa un precio mayor a 0" |

    `validateFila` devuelve hoy "Requerido" o "Inválido". Cámbialos por estos textos, que es el único cambio de lógica permitido en este archivo.
- **Pie de acciones:** "Cancelar" (`fantasma`) y "Guardar compra" (`primario`, `sombra`, ícono `Save`, `cargando={saving}`). En móvil quedan fijos encima de la barra inferior, a lo ancho.
- **Al guardar con éxito:** la llamada a `guardarCompras(payload)`, el toast de éxito y `navigate('/compras')` siguen igual.

### 6.6 `AutocompleteInput`
Patrón ARIA *combobox* con lista (WAI-ARIA APG). La API pública (`value`, `onChange`, `placeholder`, `id`, `getSuggestions`) se mantiene; se agregan `etiqueta`, `etiquetaOculta`, `error` y `onBlur`, y se deja de usar `className`.

- **Composición:** usa `Campo` internamente.
- **Atributos del input:**
  - `role="combobox"`.
  - `aria-expanded={abierto}`.
  - `aria-controls="{id}-lista"`.
  - `aria-autocomplete="list"`.
  - `aria-activedescendant` con el id de la opción resaltada.
- **Lista:** `<ul role="listbox" id="{id}-lista">`, con cada opción como `<li role="option" id="{id}-op-{i}" aria-selected>`.
- **Teclado:**
  - `ArrowDown` abre la lista si estaba cerrada y si no avanza; `ArrowUp` retrocede.
  - `Enter` selecciona.
  - `Escape` cierra y no borra el valor.
  - `Tab` cierra sin seleccionar.
- **Cierre sin `setTimeout`:** las opciones usan `onPointerDown` con `e.preventDefault()`, así el input no pierde el foco, y `onBlur` cierra la lista directamente.
- **Filtrado continuo:** en cada tecla se llama a `getSuggestions(texto)`, que es síncrona, y se muestran como máximo 8 resultados. La parte que coincide con lo escrito va en `<mark>` (peso 700, sin fondo amarillo; el color de texto sigue siendo `--color-text`).
- **Animación anclada al campo:**
  - La lista va justo debajo del input, con `transform-origin: top center`.
  - Usa `variantesDesplegable` con `springSuave` y `AnimatePresence`.
  - Fondo blanco, radio `--radio-input`, sombra `--sombra-flotante` y `max-height: 16rem` con scroll.
- **Anuncio para lectores de pantalla:** una región `aria-live="polite"` con la clase `solo-lector` dice "3 sugerencias disponibles".

**Tests de esta fase**
| Archivo                   | Qué se prueba                                                                 |
| ------------------------- | ----------------------------------------------------------------------------- |
| `AgregarCompra.test.jsx`  | Al salir de Precio vacío aparece "Ingresa un precio mayor a 0", enlazado con `aria-describedby`. Al guardar con una fila vacía aparece el resumen `role="alert"` con foco y **no** se llama a `guardarCompras` (mock de `../services/api`). Con datos válidos se llama una vez con el payload correcto. |
| `AutocompleteInput.test.jsx` | Escribir "Sú" muestra "Súper Selectos"; `ArrowDown` + `Enter` lo selecciona; `Escape` cierra. |
| `PantallaMaestra.test.jsx` | Eliminar abre la confirmación con el foco en "Cancelar"; confirmar llama a `eliminarCompra(id)`. "Limpiar filtros" y luego "Filtrar" muestra el modal con campos vacíos (regresión del bug). |
| `formato.test.js`         | `formatearPrecio(12.5) === '$12.50'`, `formatearFecha('2026-09-28') === '28/09/2026'`, `fechaHoyISO(new Date(2026, 9, 3, 23, 30)) === '2026-10-03'`. |

Para los tests de páginas, renderiza dentro de `<MemoryRouter>` y `<ToastProvider>`.

**Commits:** uno por página.
- `feat(inicio): …`
- `feat(compras): …`
- `feat(agregar-compra): …`

---

## Fase 7 — Limpieza del CSS heredado

**Pasos**
1. Elimina `src/index.css` y su import en `main.jsx`.
2. Recorre las 3 pantallas en 1280px y 375px y corrige lo que se haya roto. Todo estilo faltante va al `.module.css` que corresponda, **nunca** de vuelta a un CSS global.
3. **Única excepción permitida de `style`:** pasar valores dinámicos de Motion, porque `motion.div` usa `style` internamente para animar. En JSX escrito a mano no hay ninguna.
4. Ejecuta estas verificaciones. **Todas deben devolver vacío:**
   ```bash
   grep -rn "style={{" src --include=*.jsx
   ```
   ```bash
   grep -rniE "#000\b|#000000|\bblack\b|Nunito|#651A0C|--brown|--gold|--cream\b" src index.html
   ```
   ```bash
   grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src
   ```
   ```bash
   git diff --exit-code refactor-base -- src/services/api.js
   ```
   (Desde la raíz del repo, la ruta es `frontend/src/services/api.js`.)
5. Revisa el contraste de cada combinación texto/fondo nueva contra la tabla de `DESIGN_DECISIONS.md`. Si usaste alguna combinación que no está en la tabla, calcúlala (WebAIM Contrast Checker) y anótala en `docs/DECISIONS.md`.

**Commit:** `refactor(estilos): eliminar index.css heredado`

---

## Fase 8 — Documentación

1. **README.md en cada directorio** de `src/styles/`, `src/hooks/`, `src/utils/`, `src/components/`, `src/components/common/`, `src/context/` y `src/pages/`. Máximo una pantalla cada uno, con:
   - Qué vive ahí y qué **no** debe ir ahí.
   - Convenciones del directorio (por ejemplo, en `common/`: props en español, `forwardRef` y un test por componente).
   - Un ejemplo de uso mínimo.
   - `styles/README.md` explica las 3 capas de tokens y la regla "los componentes solo usan la capa 2 o sus tokens locales".
2. **`docs/DECISIONS.md`:** un resumen de no más de 2 páginas. **No copies** `DESIGN_DECISIONS.md`; enlázalo como fuente de marca y documenta lo técnico:
   - Precedencia: Brandbook > skills > `DESIGN_DECISIONS.md`.
   - Tabla de tokens semánticos y su valor.
   - Por qué CSS Modules, por qué `motion` y los valores de `movimiento.js`.
   - Por qué barra inferior y no drawer (se deja para una fase futura).
   - Accesibilidad: patrón de modal, combobox, validación y regiones vivas.
   - Combinaciones de contraste adicionales que hayas calculado.
3. **`CLAUDE.md`:** actualiza Comandos (`test`, `test:run`, `lint`) y Arquitectura (`styles/`, `components/common/`, `hooks/`, `utils/`). Quita la nota de "migración pendiente de `index.css`".

**Commit:** `docs: READMEs por directorio y DECISIONS.md`

---

## Fase 9 — Verificación final

Todo debe pasar antes de abrir el PR:

**Automático** (desde `frontend/`)
- [ ] `npm run lint`: 0 errores.
- [ ] `npm run test:run`: todos los tests pasan.
- [ ] `npm run build`: sin errores ni warnings nuevos.
- [ ] Las 4 verificaciones `grep`/`git diff` de la Fase 7 devuelven vacío.

**Manual: funcionalidad** (comparar con `docs/capturas/antes/`)
- [ ] Inicio: las dos acciones rápidas navegan a su ruta.
- [ ] Compras:
  - [ ] Filtrar por proveedor, producto y rango de fechas.
  - [ ] Ver el contador de filtros y limpiar los filtros.
  - [ ] Eliminar con confirmación.
  - [ ] Ver el estado vacío y el de sin resultados.
- [ ] Agregar compra:
  - [ ] Agregar y eliminar filas (nunca menos de 1).
  - [ ] El autocompletado sugiere lo existente.
  - [ ] Guardar crea las compras y vuelve a `/compras` con un toast.
- [ ] Recargar la página conserva los datos (localStorage).

**Manual: accesibilidad**
- [ ] Todo se puede hacer **solo con teclado**: navegar, filtrar, eliminar, agregar filas, autocompletar y guardar.
- [ ] El foco siempre es visible (anillo Vinotinto).
- [ ] Los modales atrapan el foco, cierran con Escape y devuelven el foco.
- [ ] Con un lector de pantalla (NVDA en Windows):
  - [ ] Se anuncian los errores del campo, el resumen, los toasts y el número de sugerencias.
  - [ ] Los botones de solo ícono tienen nombre.
- [ ] Con zoom del navegador al 200%, nada se corta ni aparece scroll horizontal de página.
- [ ] Las áreas táctiles miden ≥ 44×44 en 375px (DevTools → inspeccionar).

**Manual: preferencias del sistema** (DevTools → Rendering → *Emulate CSS media feature*)
- [ ] `prefers-reduced-motion: reduce`: no hay desplazamientos ni escalas, solo fundidos.
- [ ] `prefers-reduced-transparency: reduce`: el header es sólido.
- [ ] `prefers-contrast: more`: el header es sólido y tiene borde.

**Manual: interacción**
- [ ] Al presionar un botón responde en el acto (escala o hundimiento), sin esperar a soltar.
- [ ] Abrir y cerrar un modal rápido varias veces no produce saltos (es interrumpible).
- [ ] La píldora activa de la barra inferior se desliza entre ítems.
- [ ] Los toasts entran y salen por el mismo lado.

Toma capturas finales en `docs/capturas/despues/` y abre el PR hacia `nuevo-frontend` con el checklist marcado.

---

## Riesgos y cómo evitarlos

| Riesgo                                                     | Prevención                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Romper la capa de datos sin darse cuenta                    | El `git diff --exit-code` de `api.js` corre en las fases 7 y 9           |
| `backdrop-filter` no funciona en algún navegador            | El fondo al 80% de opacidad ya es legible sin blur; prueba en Chrome y Firefox |
| Josefin Sans con altura de x baja vuelve difícil leer cifras | Si en la tabla cuesta leer, sube a 1.0625rem (17px), como dice `DESIGN_DECISIONS.md` |
| `AnimatePresence` + `motion.tr` dentro de `<tbody>` da warnings de DOM | Usa `motion.tr` directamente, nunca un `div` envolviendo filas      |
| Tests frágiles por las animaciones                          | `MotionConfig reducedMotion="always"` en los tests de páginas y uso de `findBy*` para lo que aparece después |
| Las clases de CSS Modules no se encuentran en tests         | Usa queries por rol o texto (`getByRole`), nunca por clase              |

## Fuera de alcance (no hacer)
- Pantallas, rutas o módulos nuevos (recetas, inventario, costos, nómina).
- Drawer móvil con gestos de arrastre.
- Backend real, conexión a base de datos o cambios en `api.js`.
- Autenticación o roles.
- Modo oscuro (la marca no lo define).
- "Deshacer" al eliminar: `api.js` no tiene cómo restaurar, así que se mantiene la confirmación.
