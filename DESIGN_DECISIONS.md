# DESIGN_DECISIONS.md

## Propósito, fuentes y precedencia

Este documento describe la marca **DE PANAS** tal como vive hoy en la aplicación web de compras y costos. Es la referencia para cualquier pantalla nueva o cambio visual.

- **Fuente principal: el sitio actual.** Lo que aquí se describe es lo que ya está implementado en `frontend/src/styles/tokens.css`, `styles/base.css` y los `*.module.css` de cada componente. Si el código y este documento no coinciden, se corrige el que esté mal y se deja constancia aquí.
- **Origen: *DE PANAS – Brandbook, mayo 2026*.** De ahí salen la paleta, las tipografías, el logotipo, las ilustraciones y el tono. El brandbook no cubre interfaces; lo que el sitio adaptó o decidió distinto está en [Diferencias con el brandbook](#diferencias-con-el-brandbook).
- **Skills de `.claude/skills/`** (`brand`, `design-system`, `ui-ux-pro-max`, `apple-design` y las de diseño listadas en su README): guían lo que este documento no decide (proporciones nuevas, interacción, accesibilidad).
- **Precedencia: sitio actual (este documento) > brandbook > skills.** Una skill nunca reemplaza un valor de marca (hex, familia tipográfica, logotipo, tono). Por ejemplo, `apple-design` recomienda la fuente del sistema, pero aquí van Josefin Sans y Cardo.

Las decisiones técnicas del frontend están en [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Esencia de marca

DE PANAS comparte el sabor y la sazón tradicional venezolana con recetas caseras y familiares (tequeños, empanadas andinas, arepas, cachitos, golfeados), recién hechos y congelados, en El Salvador.

- **Lema:** "La verdadera sazón venezolana". El badge dice "Auténtico sabor venezolano".
- **Personalidad:** cercana, auténtica, venezolana, sutilmente nostálgica, amigable y vibrante.

**En la app** la marca acompaña y no compite con los datos. La personalidad vive en el menú naranja, el collage del fondo, la pantalla de acceso, los estados vacíos y los mensajes. Tablas, cifras y formularios van sobrios.

---

## Paleta de color

### Colores de marca (capa 1, `tokens.css`)

| Token | Nombre | Hex | RGB |
|---|---|---|---|
| `--rojo-vinotinto` | Rojo Vinotinto | `#911C0D` | 145, 28, 13 |
| `--naranja-sazon` | Naranja Sazón | `#EF7D05` | 239, 125, 5 |
| `--amarillo-criollo` | Amarillo Criollo | `#F8A914` | 248, 169, 20 |
| `--verde-fresco` | Verde Fresco | `#6DAD28` | 109, 173, 40 |
| `--verde-avila` | Verde Ávila | `#144428` | 20, 68, 40 |
| `--crema-trigo` | Crema y Trigo | `#FEEECC` | 254, 238, 204 |
| `--blanco` | Blanco (superficies) | `#FFFFFF` | 255, 255, 255 |

Confirmados contra el brandbook, página por página. **Sin negro puro** (`#000000` no se usa en ningún lado).

### Derivados

| Token | Hex | De dónde sale | Uso |
|---|---|---|---|
| `--crema-claro` | `#FFF8EB` | Crema al 40 % sobre blanco | Encabezados de tabla, hover suave |
| `--avila-profundo` | `#0F331E` | Verde Ávila con menos luz | Texto e íconos sobre naranja (5.03:1) |
| `--avila-75` | `#4F735E` | Verde Ávila al 75 % | Texto secundario |
| `--avila-borde` | `#728F7E` | Verde Ávila aclarado | Borde de campos (3.53:1 sobre blanco) |
| `--borde-suave` | `#C4C4A3` | Crema oscurecida | Divisores |
| `--tinte-exito` | `#E2EFD4` | Verde Fresco muy claro | Fondo de éxito |
| `--tinte-aviso` | `#FDE5B8` | Amarillo Criollo muy claro | Fondo de aviso |
| `--tinte-error` | `#F4E8E7` | Vinotinto muy claro | Fondo de error |

Transparencias en uso (siempre de colores de la paleta): sombra del header `rgb(20 68 40 / 0.1)`, hover del menú `rgb(254 238 204 / 0.2–0.4)`, sombra del ítem activo `rgb(145 28 13 / 0.2)`, sombras flotantes y de modal en Verde Ávila al 12–18 %, scrim de modal en Verde Ávila al 40 %. Los estados hover se mezclan con `color-mix()` entre colores de la paleta.

### Roles (capa 2: lo único que usan los componentes)

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | Crema y Trigo | Fondo de página (con el collage encima) |
| `--color-surface` | Blanco | Tarjetas, tablas, modales, campos |
| `--color-surface-soft` | `#FFF8EB` | Encabezados de tabla, hover, chips neutros |
| `--color-text` | Verde Ávila | Texto, cifras, títulos |
| `--color-text-muted` | `#4F735E` | Texto secundario (nunca sobre el collage) |
| `--color-border` | `#C4C4A3` | Divisores |
| `--color-border-input` | `#728F7E` | Borde de campos y controles |
| `--color-primary` / `--color-brand` | Naranja Sazón | Botón principal, menú lateral, barra inferior, íconos de sección |
| `--color-on-primary` | `#0F331E` | Texto e íconos sobre naranja |
| `--color-accent` / `--color-warning` | Amarillo Criollo | Insignia de marca (p. ej. «Administrador»), avisos |
| `--color-on-warning` | `#0F331E` | Texto sobre amarillo |
| `--color-danger` | Rojo Vinotinto | Eliminar, errores, artículo incompleto («!») |
| `--color-on-danger` | Blanco | Texto sobre vinotinto |
| `--color-success` | Verde Fresco | Solo fondo, tinte o ícono; el texto va en Ávila |
| `--color-focus` | Rojo Vinotinto | Anillo de foco de 2 px con 2 px de separación |

Los componentes usan solo estos roles. Los tintes (`--tinte-*`) y el Vinotinto de la sombra de marca son las únicas excepciones permitidas a la capa 1.

### Contraste (WCAG 2.1)

| Texto / fondo | Ratio | Uso |
|---|---|---|
| Verde Ávila / Blanco | 11.13 | Cualquier texto |
| Verde Ávila / Crema y Trigo | 9.71 | Cualquier texto |
| Blanco / Rojo Vinotinto | 8.84 | Cualquier texto |
| Verde Ávila / Amarillo Criollo | 5.66 | Cualquier texto |
| Ávila profundo / Naranja Sazón | 5.03 | Cualquier texto (todo texto sobre naranja) |
| Ávila al 75 % / Blanco | 5.32 | Texto secundario |
| Verde Ávila / Naranja Sazón | 4.03 | Solo texto grande e íconos |
| Blanco / Naranja Sazón | 2.76 | **Nunca para texto** |
| Blanco o crema / Amarillo Criollo | ≤ 1.97 | **Nunca para texto** |
| Blanco o crema / Verde Fresco | ≤ 2.74 | **Nunca para texto** |

### Reglas de color

- **Protagonistas: naranja y crema.** El menú lateral, la barra inferior y el botón principal son Naranja Sazón; el fondo es Crema y Trigo con el collage.
- **El verde Ávila es la tinta:** títulos, texto, cifras, bordes de botones secundarios.
- **Texto sobre naranja, siempre `--color-on-primary`.** Nunca blanco ni crema sobre naranja, amarillo o verde fresco. Exento: el logotipo tipográfico «DE PANAS» en crema con sombra vinotinto.
- **Vinotinto** solo para eliminar, errores, el foco y la sombra sólida de marca.
- **El color nunca va solo:** los estados llevan ícono o texto.

---

## Tipografía

| Rol | Familia | Pesos cargados | Uso |
|---|---|---|---|
| Interfaz y titulares | **Josefin Sans** | 400, 600, 700 | Títulos (en MAYÚSCULAS), botones, etiquetas, menús, tablas, cifras |
| Textos extensos | **Cardo** | 400, 400 itálica, 700 | Párrafos, descripciones, ayudas, estados vacíos |

Se cargan desde Google Fonts en `frontend/index.html` con `display=swap`. Tokens: `--fuente-titulos` (Josefin Sans, `system-ui`) y `--fuente-texto` (Cardo, Georgia). El `body` va en Cardo; `h1–h3`, `button`, `input`, `select`, `label`, `th` y `nav` en Josefin Sans.

| Elemento | Familia | Peso | Tamaño (escritorio / teléfono) | Interlineado | Tracking |
|---|---|---|---|---|---|
| Título de página (H1) | Josefin | 700 | 2rem / 1.625rem | 1.1 | 0.02em, MAYÚSCULAS |
| Título de tarjeta (H2) | Josefin | 700 | 1.5rem / 1.25rem | 1.2 | 0.03em, MAYÚSCULAS |
| H3 | Josefin | 600 | 1.25rem / 1.125rem | 1.3 | 0 |
| Botones | Josefin | 600 | 1rem (0.875rem en `sm`) | 1 | 0.04em, MAYÚSCULAS |
| Etiquetas de columna | Josefin | 600 | 0.875rem | — | 0.04–0.06em, MAYÚSCULAS |
| Menú | Josefin | 600 | 0.95–1rem | — | 0.02em |
| Celdas y montos | Josefin | 400–700 | 1rem | 1.4 | 0; montos a la derecha y en negrita |
| Total de una compra | Josefin | 700 | 1.5rem | — | — |
| Párrafos y ayudas | Cardo | 400 | 1rem | 1.6 | 0; máximo 65ch |

- Base de 16 px y tamaños en `rem`: respetan el tamaño de letra del usuario. Nada de texto de interfaz bajo 14 px (0.875rem).
- Las MAYÚSCULAS son para títulos, botones y etiquetas cortas, nunca para párrafos.
- Josefin asienta los glifos altos: los botones compensan con `padding-top: 0.15em` en el texto para centrarlo a la vista.

---

## Logotipo

El brandbook define el **badge ilustrado** (círculo naranja y amarillo con la arepa, «DE PANAS» en blanco con sombra vinotinto y «Auténtico sabor venezolano») y el **logotipo tipográfico** «DE PANAS».

### Cómo se usa en la app

| Lugar | Versión | Detalle |
|---|---|---|
| Menú lateral (escritorio) | **Arepa del badge** (40 px) + «DE PANAS» | Josefin 700, 1.375rem, Crema y Trigo con sombra sólida Vinotinto `2px 2px 0`; la arepa lleva `drop-shadow(2px 2px 0)` Vinotinto. Debajo, una barra crema de 3rem × 4px |
| Pantalla de acceso | **Píldora «DE PANAS» + arepa en círculo** | Píldora naranja con sombra `2px 3px 0` Vinotinto y texto crema con sombra vinotinto; arepa de 56 px en un círculo de 4.5rem con borde amarillo y fondo crema claro |
| Encabezado en teléfono | **Píldora «DE PANAS»** | Naranja con texto `--color-on-primary`, 0.875rem |
| Favicon e ícono de app | **Badge ilustrado** 1:1 | `favicon.ico`, `brand/favicon-16/32/48.png`, `apple-touch-icon-180.png`, `icon-192.png`, `icon-512.png`; conectados en `index.html` y `site.webmanifest` |
| Junto a tablas, cifras y formularios | Ninguno | La marca la pone el menú |

El badge completo (`brand/logo-badge.png`, 1197 × 1197) no se usa dentro de la app: a tamaño de menú no se lee. Queda para íconos y para piezas amplias (manual de uso, portada de documentos).

Reglas: no deformar, rotar ni recolorear el badge o la arepa; la arepa siempre lleva la sombra Vinotinto para leerse como parte del nombre.

---

## Imágenes, ilustraciones e íconos

### Assets (`frontend/public/brand/`)

| Archivo | Qué es |
|---|---|
| `logo-badge.png` | Badge completo, 1197 × 1197, transparente |
| `arepa.png` | La arepa del badge recortada, 192 × 192, transparente |
| `patron-elementos-graficos.webp` | Collage de las 17 ilustraciones de la pág. 10 del brandbook |
| `favicon-*.png`, `apple-touch-icon-180.png`, `icon-192/512.png` | Íconos del navegador y de la app |

Se referencian desde la raíz pública: `/brand/arepa.png`.

### Fotos

La app **no usa fotografías**: las pantallas son de trabajo y una foto competiría con los datos. Si un material externo (manual, presentación) necesita fotos, que sean de producto real de De Panas, cálidas, con luz natural, y nunca dentro de tablas o formularios.

### Collage de fondo

- Mosaico sin costuras con las ilustraciones de la pág. 10 del brandbook (trazo a mano, Rojo Vinotinto), en `body::before`: capa fija detrás de todo.
- `--patron-opacidad: 0.1`; `--patron-tamano`: 26rem en teléfono, 38rem en escritorio y 46rem desde 1440 px.
- Tarjetas, menú, encabezado al hacer scroll y modales lo tapan con su fondo, así nunca queda detrás de datos.
- Se oculta con `prefers-contrast: more` y al imprimir.
- **Una pantalla con fondo crema no pinta su propio `background`.**
- **Todo texto directo sobre el collage va en `--color-text`**, nunca en `--color-text-muted` (sobre un trazo baja a 3.91:1).

### Íconos

- Solo **Lucide** (`lucide-react`): trazo lineal, coherente con las ilustraciones.
- Tamaños: 1rem en botones con texto, 1.125rem en botones solo de ícono, 1.25–1.5rem en encabezados de tarjeta (en naranja).
- Sin emojis. Un botón solo de ícono lleva `aria-label`.

---

## Proporciones y espaciado

- **Escala** (base 4 px, en rem): `--space-1` 0.25 · `--space-2` 0.5 · `--space-3` 0.75 · `--space-4` 1 · `--space-5` 1.25 · `--space-6` 1.5 · `--space-8` 2 · `--space-12` 3. Nada fuera de la escala.
- **Proximidad:** dentro de un grupo `--space-2`/`--space-3`; entre grupos `--space-6`; entre secciones `--space-8`.
- **Controles:** `--alto-control` 2.75rem (44 px). El tamaño `sm` se ve de 2.25rem pero mantiene 44 px de zona táctil.
- **Layout:** menú lateral `--ancho-sidebar` 15rem; encabezado `--alto-header` 4rem; barra inferior `--alto-barra-inferior` 4rem; márgenes laterales `--space-8` en escritorio y `--space-4` en teléfono.
- **Vista de teléfono por debajo de 1100 px** (`@media (max-width: 1099px)`): barra inferior en vez de menú lateral, tablas como tarjetas, títulos más pequeños. Ningún botón puede quedar cortado entre 1280 y 320 px.

---

## Formas y profundidad

Se derivan del badge: un círculo con letras redondeadas y sombra sólida desplazada.

- **Radios:** campos 12 px (`--radio-input`), tarjetas 20 px (`--radio-tarjeta`), modales 24 px (`--radio-modal`; en teléfono solo arriba, como hoja), botones, chips e insignias en píldora (`--radio-pildora`).
- **Sombra de marca** `--sombra-marca: 3px 4px 0` Vinotinto: solo en la acción más importante de una pantalla (p. ej. «Guardar compra»). Al presionar, el botón se hunde hacia su sombra.
- **Sombras suaves:** `--sombra-flotante` (`0 8px 24px`, Ávila al 12 %) para menús y elementos flotantes; `--sombra-modal` (`0 24px 48px`, Ávila al 18 %) para ventanas.
- **Bordes:** `--color-border` para divisores (1 px) y `--color-border-input` para campos; botón secundario con borde de 2 px en Verde Ávila.
- **Fila o elemento elegido:** franja interior a la izquierda en naranja (`box-shadow: inset 4px 0 0 var(--color-primary)`); en avisos y errores, la misma franja de 3 px en amarillo o vinotinto.
- **Agregar algo nuevo** (otra fila, otro teléfono, soltar un archivo): borde **punteado**.

### Materiales

- **Encabezado:** transparente arriba de la página, para que el collage pase detrás del título; al hacer scroll aparece un fondo crema sólido con una sombra degradada de 16 px (solo se anima la opacidad, 200 ms). Sin `backdrop-filter`.
- **Menú lateral y barra inferior:** sólidos en naranja; son estructura.
- **Modales:** sólidos en blanco sobre un scrim Ávila al 40 %.
- Con `prefers-reduced-transparency` el encabezado es siempre sólido; con `prefers-contrast: more`, fondos sólidos y bordes visibles.

---

## Movimiento e interacción

Se toma de `apple-design`: todo responde al instante, el movimiento parte de donde está y se puede interrumpir.

- **Respuesta al presionar:** `transform: scale(0.97)` en 100 ms; con sombra de marca, `translate(3px, 4px)` y la sombra a 0.
- **Springs** (Motion, presets en `styles/movimiento.js`) para lo que se toca o arrastra: por defecto `{ type: 'spring', bounce: 0, duration: 0.35 }`; con inercia, `bounce: 0.2, duration: 0.3`.
- **Transiciones simples** (hover, color, aparición de un toast): CSS de 150–250 ms, solo `transform` y `opacity`.
- **Se entra y se sale por el mismo camino;** menús y autocompletados nacen del control que los abrió.
- **Lo que aparece en un formulario** (por ejemplo, la siguiente parte cuando la anterior está completa) entra con un fundido corto, sin empujar bruscamente lo de abajo.
- **`prefers-reduced-motion`** siempre respetado (`<MotionConfig reducedMotion="user">` y `base.css`): fundidos de 200 ms, sin rebotes.
- Nada de esperas artificiales en el camino del usuario.

---

## Componentes

Todos viven en `frontend/src/components/common/` y toda pantalla se arma con ellos.

**Botones (`Boton`)**
- **Primario:** fondo Naranja Sazón, texto `--color-on-primary`, Josefin 600 en MAYÚSCULAS, píldora. Hover con el naranja aclarado.
- **Primario con sombra de marca** (`conSombra`): la acción principal de la pantalla.
- **Secundario:** fondo blanco, borde de 2 px y texto Verde Ávila.
- **Fantasma:** sin fondo ni borde, texto Ávila (p. ej. «Cancelar»).
- **Peligro:** fondo Vinotinto, texto blanco; siempre con confirmación.
- **Solo ícono:** 44 × 44 px, sin fondo, con `aria-label`.
- Deshabilitado: opacidad 0.5. Cargando: ícono girando y botón bloqueado.
- Toda acción que guarda, elimina, carga, descarga o cierra sesión se confirma con `ConfirmDialog`.

**Insignias (`Insignia`)**: píldoras pequeñas en Josefin. `neutro` (crema claro con borde suave; p. ej. el proveedor en la lista), `marca` (amarillo con texto Ávila; p. ej. «Administrador»), `exito`, `aviso` y `error` con su tinte.

**Tarjetas (`Tarjeta`)**: fondo blanco, radio de 20 px, borde suave de 1 px. Variantes: `conSombra` (sombra de marca) y `conFranja` (franja naranja de 6 px arriba). Encabezado con ícono naranja, título H2 y, a la derecha, sus acciones (que bajan de línea si no caben).

**Tablas**
- Fondo blanco dentro de una tarjeta; encabezado en `--color-surface-soft`, Josefin 600 en MAYÚSCULAS a 0.875rem; divisores de 1 px.
- Montos a la derecha, en negrita, con dos decimales y `$`.
- Hover visible en filas que se pueden abrir; fila elegida con la franja naranja.
- En teléfono, cada fila se vuelve una tarjeta con etiqueta y valor.

**Formularios (`Campo`, `Selector`, `AutocompleteInput`)**
- Etiqueta visible arriba; el placeholder nunca la reemplaza.
- Campo blanco (crema claro en la pantalla de acceso), borde `--color-border-input`, radio de 12 px, alto de 44 px.
- Errores debajo del campo en Vinotinto con ícono, unidos con `aria-describedby`. Aparecen al intentar guardar y luego se revalidan en vivo.
- Artículo al que le falta información: fila marcada en rojo con «!».
- Nombres parecidos: aviso destacado en amarillo (`AvisoDestacado`) que nunca impide guardar.

**Ventanas (`Modal`, `ConfirmDialog`)**: blancas, radio de 24 px, sombra de modal y scrim. En teléfono, hoja desde abajo. La X y Esc solo cierran; si hay datos sin guardar, primero avisan.

**Navegación**
- **Menú lateral** (escritorio): naranja, texto e íconos en `--color-on-primary`, ítem activo como píldora Crema y Trigo con texto Ávila y sombra vinotinto suave. Arriba, el logotipo; abajo, «Gestor de usuarios» y «Cerrar sesión» (este con borde).
- **Barra inferior** (teléfono): naranja, con Agregar, Lista, Catálogo y **Más** (hoja con el resto y Cerrar sesión). El ítem activo, píldora crema.
- **Encabezado de página:** título H1 en MAYÚSCULAS a la izquierda y la fecha de hoy con ícono de calendario a la derecha. **Sin frase debajo del título.** Las pantallas que se abren desde otra llevan «Regresar».

**Notificaciones (toasts)**: éxito con tinte verde y error con tinte vinotinto, siempre con ícono y texto; no son el único aviso de un error de formulario.

**Estados vacíos (`EstadoVacio`)**: ícono naranja, título Josefin y una línea en Cardo que invita a la acción.

---

## Layout

- **Escritorio (≥ 1100 px):** menú lateral fijo + encabezado + contenido a todo el ancho disponible.
- **Teléfono (< 1100 px):** encabezado con la píldora «DE PANAS», una sola columna, barra inferior fija y acciones que bajan de línea; sin scroll horizontal de página.

---

## Tono de voz

| Tono | Estilo |
|---|---|
| Cercano y conversacional | Lenguaje simple, humano y cotidiano |
| Auténtico, venezolano, sutilmente nostálgico | Guiños de la cultura venezolana («¡Épale, pana!», «Naguará») |
| Amigable y vibrante | Invita a la acción, nunca regaña |

**Todos los textos que el sistema le dice al usuario viven en `frontend/src/utils/mensajes.js`**; los tests los importan de ahí.

| Contexto | Tono | Ejemplo |
|---|---|---|
| Acceso | Con la voz de la marca | «¡Épale, pana!» |
| Encabezados | Solo el título de la pantalla | «LISTA DE COMPRAS» |
| Estados vacíos | Amigable, invita a la acción | «Todavía no hay compras. ¡Anota la primera, que hoy toca arepita!» |
| Éxito | Breve y cálido | «¡Listo, pana! Compra guardada.» |
| Errores | Claro, **sin modismos**: qué pasó y qué hacer | «No pudimos guardar la compra: [motivo]. Revisa los datos e inténtalo de nuevo.» |
| Validaciones | Corto, junto al campo, **sin modismos** | «Debe ser mayor a 0» |
| Datos | Neutral y literal | «Subtotal», «IVA (13 %)», «Total» |
| Pie de la pantalla de acceso | Frase de marca | «De Panas SV · Aquí se viene a comer rico» |

---

## Diferencias con el brandbook

| Tema | Brandbook | Sitio actual | Por qué |
|---|---|---|---|
| Logo en el menú | Badge en formatos amplios, tipográfico en el resto | Arepa del badge + tipográfico en crema con sombra vinotinto | El badge completo no se lee a 40 px; pedido del cliente |
| Logo en el acceso | Badge ilustrado | Píldora «DE PANAS» + arepa en círculo | Más compacto y coherente con el menú |
| Texto sobre naranja | Verde Ávila o Vinotinto | Ávila profundo `#0F331E` | Ávila sobre naranja da 4.03:1 (solo texto grande); el profundo da 5.03:1 |
| Blanco | No forma parte de la paleta | Superficie de tarjetas, tablas y campos | Legibilidad de datos |
| Mensajes de marca bajo los títulos | El brandbook propone frases como «Hoy toca arepita» | Se quitaron de los encabezados | Recargaban la pantalla de trabajo; la voz queda en acceso, vacíos y avisos |
| Grosores Delgada y Ultradelgada de Josefin | Parte de la familia | No se cargan | No hay textos display que los necesiten |
| Fotografía | Parte del sistema de marca | No se usa en la app | Compite con los datos |
| Ilustraciones | Íconos y productos a mano alzada | Solo en el collage del fondo; íconos de interfaz con Lucide | Coherencia y accesibilidad de los controles |

---

## Reglas estrictas

1. Solo los colores de la paleta y sus derivados documentados aquí; nada de negro puro.
2. Texto sobre naranja: siempre `--color-on-primary`. Nunca blanco o crema sobre naranja, amarillo o verde fresco (salvo el logotipo).
3. Josefin Sans para interfaz y titulares; Cardo para textos extensos.
4. Componentes con roles `--color-*`, nunca hex sueltos; sin `style={{}}`.
5. Contraste WCAG 2.1 AA en todo texto y control.
6. Tablas y cifras sobrias: la marca nunca dificulta leer los números.
7. Una pantalla con fondo crema no pinta su fondo; el texto sobre el collage va en `--color-text`.
8. Toda pantalla nueva se arma con `components/common/` y debe parecer parte del mismo sistema.
9. Todo lo tocable responde al instante, se puede interrumpir y respeta `prefers-reduced-motion`.
10. Si estética y funcionalidad chocan, gana la funcionalidad.
