# DESIGN_DECISIONS.md

## Propósito y fuentes

Este documento define las decisiones de marca para la interfaz web del aplicativo de contabilidad de **DE PANAS**.

- **Fuente única de marca:** *DE PANAS – Brandbook, mayo 2026*. Colores, tipografías, logotipo, gráfica y tono salen solo de ahí.
- **Adaptación web:** el brandbook no cubre interfaces. Lo marcado como **[Adaptación web]** se deriva de la marca aplicando las skills de `.claude/skills/`. `apple-design` guía proporciones, interacción, movimiento y materiales; `brand`, `design-system` y `ui-ux-pro-max` guían tokens, accesibilidad y UX.
- **Precedencia:** **Brandbook > skills de `.claude/skills/` > este documento.**
  - Si una regla de este documento choca con una skill, prevalece la skill.
  - Si una skill choca con el brandbook, prevalece el brandbook. Por ejemplo, `apple-design` recomienda la fuente del sistema, pero la marca exige Josefin Sans y Cardo. Los valores de marca (hex, familias tipográficas, logotipo, tono) nunca se reemplazan por recomendaciones de una skill.

> El frontend ya implementa estas decisiones: tokens en `frontend/src/styles/tokens.css` y componentes base en `frontend/src/components/common/`. Las decisiones técnicas de esa implementación están en [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Esencia de marca

DE PANAS comparte el auténtico sabor y sazón tradicional venezolano con recetas caseras y familiares (tequeños, empanadas andinas, arepas), recién hechos y en formato congelado.

- **Lema:** "La verdadera sazón venezolana". El logotipo usa "Auténtico sabor venezolano".
- **Personalidad:** cercana, auténtica, venezolana, sutilmente nostálgica, amigable y vibrante (caribeña).

**[Adaptación web]** En un sistema contable la marca acompaña y no compite con los datos. La personalidad vive en el branding, las bienvenidas, los estados vacíos y el microcopy. Tablas, cifras y formularios se mantienen sobrios.

---

## Paleta de color

La paleta combina tonos cálidos y vibrantes con verdes para dar contraste, dinamismo y equilibrio.

| Token             | Nombre (brandbook) | Hex       | RGB           |
| ----------------- | ------------------ | --------- | ------------- |
| `--rojo-vinotinto` | Rojo Vinotinto     | `#911C0D` | 145, 28, 13   |
| `--naranja-sazon`  | Naranja Sazón      | `#EF7D05` | 239, 125, 5   |
| `--amarillo-criollo` | Amarillo Criollo | `#F8A914` | 248, 169, 20  |
| `--verde-fresco`   | Verde Fresco       | `#6DAD28` | 109, 173, 40  |
| `--verde-avila`    | Verde Ávila        | `#144428` | 20, 68, 40    |
| `--crema-trigo`    | Crema y Trigo      | `#FEEECC` | 254, 238, 204 |

> **Confirmado contra el brandbook** (revisión visual página por página, no solo el texto extraído): en la página de nombres los cuatro bloques de color y en la página de códigos los seis círculos con hex coinciden uno a uno por tono. Verde Fresco es el verde claro/oliva `#6DAD28` y Verde Ávila es el verde oscuro `#144428`.

La marca no define negro, grises ni blanco. **No usar `#000000`.**

### Contraste entre colores de marca (WCAG 2.1)

AA exige 4.5:1 para texto normal y 3:1 para texto grande (≥ 24px, o ≥ 18.66px en negrita) y para componentes de UI.

| Combinación (texto / fondo)       | Ratio  | Uso permitido               |
| --------------------------------- | ------ | --------------------------- |
| Verde Ávila / Blanco              | 11.13  | Cualquier texto             |
| Verde Ávila / Crema y Trigo       | 9.71   | Cualquier texto             |
| Blanco / Rojo Vinotinto           | 8.84   | Cualquier texto             |
| Crema y Trigo / Rojo Vinotinto    | 7.71   | Cualquier texto             |
| Verde Ávila / Amarillo Criollo    | 5.66   | Cualquier texto             |
| Verde Ávila / Naranja Sazón       | 4.03   | Solo texto grande           |
| Rojo Vinotinto / Naranja Sazón    | 3.20   | Solo texto grande           |
| Blanco / Naranja Sazón            | 2.76   | **Nunca para texto**        |
| Blanco o Crema / Amarillo Criollo | ≤ 1.97 | **Nunca para texto**        |
| Blanco o Crema / Verde Fresco     | ≤ 2.74 | **Nunca para texto**        |

### Roles semánticos [Adaptación web]

Capas de tokens según la skill `design-system`: primitivos (tabla de arriba), semánticos (esta tabla) y luego componentes.

| Token semántico         | Valor                        | Uso                                                              |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `--color-bg`            | Crema y Trigo `#FEEECC`      | Fondo de página                                                  |
| `--color-surface`       | `#FFFFFF`                    | Cards, tablas, modales, inputs                                   |
| `--color-surface-soft`  | `#FFF8EB` (crema 40% sobre blanco) | Encabezados de tabla, zonas suaves                         |
| `--color-text`          | Verde Ávila `#144428`        | Texto principal y cifras                                          |
| `--color-text-muted`    | `#4F735E` (Ávila 75%)        | Texto secundario (5.32:1 sobre blanco, 4.64:1 sobre crema)       |
| `--color-border`        | `#C4C4A3`                    | Divisores decorativos (no es límite de un control)               |
| `--color-border-input`  | `#728F7E`                    | Borde de inputs y controles (3.53:1 sobre blanco)                |
| `--color-primary`       | Verde Ávila `#144428`        | Acción principal (fondo) con texto Crema o Blanco                |
| `--color-brand`         | Naranja Sazón `#EF7D05`      | Superficie de identidad: franja de header, badge, ilustraciones  |
| `--color-accent`        | Amarillo Criollo `#F8A914`   | Acentos, estado activo de navegación (con texto Verde Ávila)     |
| `--color-danger`        | Rojo Vinotinto `#911C0D`     | Acciones destructivas y errores                                  |
| `--color-success`       | Verde Fresco `#6DAD28`       | Indicadores de éxito, solo como fondo/tinte o ícono; texto en Ávila |
| `--color-warning`       | Amarillo Criollo `#F8A914`   | Avisos, como fondo con texto Verde Ávila                          |
| `--color-focus`         | Rojo Vinotinto `#911C0D`     | Anillo de foco de 2px con separación (8.84:1 sobre blanco)       |

Tintes para fondos de estado: éxito `#E2EFD4`, aviso `#FDE5B8`, error `#F4E8E7`. Todos llevan texto Verde Ávila, o Vinotinto en el caso del error.

### Reglas de color

- El naranja y el amarillo del logotipo son la cara de la marca. El naranja va como **superficie de identidad**, nunca como fondo de texto pequeño.
- El verde aporta contraste y equilibrio. Verde Ávila es el color de texto y de acción principal.
- El Rojo Vinotinto queda para lo destructivo, los errores y el foco. Nunca se usa como acción principal, para no confundir "guardar" con "eliminar".
- No usar más de 2 o 3 colores de marca en un mismo componente.
- El color nunca es el único portador de significado: los estados llevan siempre ícono o texto.

---

## Tipografía

| Rol          | Familia          | Pesos del brandbook                                  | Uso según la marca                                                         |
| ------------ | ---------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Principal    | **Josefin Sans** | Negrita, Seminegrita, Regular, Delgada, Ultradelgada | Titulares y elementos destacados, de preferencia **en mayúsculas**          |
| Secundaria   | **Cardo**        | Negrita, Regular, Regular itálica                    | Textos más extensos; aporta calidez, tradición y carácter editorial         |

Josefin Sans es geométrica, limpia y moderna. Cardo es humana, clásica y editorial. La combinación equilibra modernidad con hogar y tradición.

### Aplicación web [Adaptación web]

```css
--font-heading: 'Josefin Sans', system-ui, sans-serif;
--font-body:    'Cardo', Georgia, serif;
```

Ambas familias están en Google Fonts. Cargar solo los pesos usados (Josefin 400/600/700; Cardo 400/400i/700) con `display=swap`.

Tamaños en `rem` (base 1rem = 16px) para respetar el tamaño de texto que elija el usuario. Interlineado y tracking dependen del tamaño, según `apple-design`: interlineado ajustado en títulos grandes y más holgado en el cuerpo; nunca un único `letter-spacing` para todo.

| Elemento                         | Familia      | Peso | Tamaño (desktop / mobile)  | Interlineado | Tracking  | Notas                          |
| -------------------------------- | ------------ | ---- | -------------------------- | ------------ | --------- | ------------------------------ |
| Título de página (H1)            | Josefin Sans | 700  | 2rem / 1.625rem            | 1.1          | `0.02em`  | MAYÚSCULAS                     |
| H2 / título de card              | Josefin Sans | 700  | 1.5rem / 1.25rem           | 1.2          | `0.03em`  | MAYÚSCULAS                     |
| H3                               | Josefin Sans | 600  | 1.25rem / 1.125rem         | 1.3          | `0`       |                                |
| Navegación, botones, labels      | Josefin Sans | 600  | 1rem                       | 1.25         | `0.04em`  | Botones en MAYÚSCULAS          |
| Métricas destacadas (KPIs)       | Josefin Sans | 700  | `clamp(2rem, 4vw, 2.5rem)` | 1.05         | `-0.02em` | La cifra domina sobre su etiqueta |
| Tablas y valores monetarios      | Josefin Sans | 400  | 1rem                       | 1.4          | `0`       | Montos alineados a la derecha  |
| Párrafos, descripciones, ayudas  | Cardo        | 400  | 1–1.125rem                 | 1.6          | `0`       | Máx. 65ch                      |
| Citas y frases de marca          | Cardo        | 400i | 1.125–1.5rem               | 1.4          | `0`       | Bienvenida y estados vacíos    |

- Las mayúsculas, que pide la marca, llevan tracking positivo que se reduce al crecer el tamaño. Las cifras grandes en caja mixta llevan tracking negativo.
- La jerarquía se arma con peso, tamaño e interlineado juntos. Para enfatizar se usa peso antes que tamaño.
- Base de 16px. Nada de texto de interfaz por debajo de 14px.
- Las variantes Delgada y Ultradelgada de Josefin solo se usan en display de 32px o más, nunca en texto de interfaz.
- Las mayúsculas son para titulares, botones y etiquetas cortas, nunca para párrafos.
- Josefin Sans tiene altura de x baja. Verificar la legibilidad de cifras en tablas y subir a 17px si hace falta.

---

## Logotipo

El brandbook define dos expresiones:

1. **Logotipo principal (badge ilustrado):** círculo naranja/amarillo con una arepa al centro, "DE PANAS" en letras blancas con sombra sólida Vinotinto y "Auténtico sabor venezolano" en Vinotinto. Por ser ilustrativo y visualmente cargado, va en aplicaciones sencillas y formatos amplios donde mantenga legibilidad y protagonismo.
2. **Logotipo tipográfico:** el nombre **"DE PANAS"** en mayúsculas, en distintos colores de la paleta y con la tipografía institucional. Va en composiciones elaboradas, con fotografía o con mayor carga visual, para evitar competencia visual. Busca reforzar el nombre como el elemento más distintivo de la identidad.

### Aplicación web [Adaptación web]

| Ubicación                                   | Versión                                       |
| ------------------------------------------- | --------------------------------------------- |
| Login, bienvenida, pantallas de carga amplias | Badge ilustrado (mínimo 120px de ancho)     |
| Sidebar, header, barras compactas           | Tipográfico "DE PANAS" en Josefin Sans 700    |
| Junto a tablas, gráficos o datos            | Solo tipográfico                              |
| Favicon / ícono de app                      | Badge ilustrado 1:1: `frontend/public/favicon.ico` (16/32/48) y `frontend/public/brand/` (`favicon-16/32/48.png`, `apple-touch-icon-180.png`, `icon-192.png`, `icon-512.png`). Conectados en `frontend/index.html` y en `frontend/public/site.webmanifest`. |

**Assets de marca** en `frontend/public/brand/`: `logo-badge.png` (1197×1197, con transparencia) y los íconos de arriba. Referenciarlos con rutas absolutas desde la raíz pública (`/brand/logo-badge.png`).

- Espacio libre alrededor del badge igual a la altura de "DE PANAS" en el logo.
- No deformar, rotar, recolorear fuera de la paleta ni añadir efectos al badge.
- El tipográfico debe cumplir los contrastes de la tabla de arriba. Sobre naranja va en Verde Ávila o Vinotinto, y solo en tamaño grande.

---

## Gráfica, íconos e ilustraciones

El brandbook incluye un set de íconos e ilustraciones de productos (arepas, empanadas, tequeños) de **estilo natural y desenfadado**: trazo a mano alzada en línea, en Rojo Vinotinto.

**[Adaptación web]**

- **Íconos de interfaz:** una sola librería de línea (**Lucide**, ya instalada). Su trazo lineal es coherente con las ilustraciones de marca. Grilla de 24px y trazo uniforme.
- Las **ilustraciones de marca** son para bienvenida, estados vacíos, login y elementos de branding. Nunca dentro de tablas, formularios o junto a cifras.
- No usar emojis como íconos.
- Los íconos complementan el texto; los botones solo con ícono llevan `aria-label`.

---

## Proporciones y espaciado [Adaptación web]

El brandbook no define proporciones. Se aplica `apple-design`: cada medida es una decisión defendible, en `rem` para que el layout escale con el texto.

- **Escala de espaciado** (base de 4px): `--space-1: 0.25rem`, `--space-2: 0.5rem`, `--space-3: 0.75rem`, `--space-4: 1rem`, `--space-6: 1.5rem`, `--space-8: 2rem`, `--space-12: 3rem`. No se permiten valores sueltos fuera de la escala.
- **Agrupación por proximidad:** dentro de un grupo (label e input, filas relacionadas) `--space-2`/`--space-3`; entre grupos `--space-6`; entre secciones `--space-8`/`--space-12`. Cada control va junto a lo que afecta.
- **Controles:** alto mínimo de 44px (2.75rem) y zona táctil de 44×44px aunque el ícono sea menor.
- **Layout:** sidebar de 15rem; header de 4rem; contenido con ancho máximo legible (texto 65ch, tablas al 100% del contenedor); gutter de `--space-6` en desktop y `--space-4` en mobile.

## Formas, bordes y profundidad [Adaptación web]

El brandbook no define radios ni sombras. Se derivan del logotipo, que es un círculo con letras redondeadas y sombra sólida desplazada en Vinotinto:

- **Radios:** inputs 12px, cards 20px, modales 24px, botones y chips con forma de píldora (999px).
- **Sombra de marca:** sólida y desplazada, en Vinotinto, como en el lettering del logo: `box-shadow: 3px 4px 0 var(--rojo-vinotinto)`. Solo en elementos destacados (botón principal, cards de métricas, badge), nunca en filas de tabla ni en inputs.
- **Bordes:** `--color-border` para divisores y `--color-border-input` para controles. Nada de bordes negros.

### Materiales (según `apple-design`)

- **Header como capa translúcida:** fondo Crema y Trigo al 80% con `backdrop-filter: blur(20px) saturate(180%)`, y el contenido se desplaza por debajo. En lugar de un borde de 1px, un borde inferior suave de desvanecido aparece solo cuando hay contenido debajo.
- **El peso del material marca la jerarquía.** La sidebar es una región estructural y va sólida (Verde Ávila). Los elementos interactivos van más ligeros. Nunca se apila una superficie translúcida clara sobre otra.
- **El texto sobre material translúcido** usa Verde Ávila con un peso más y un poco de tracking extra. Nunca `--color-text-muted`.
- **Modales:** scrim de Verde Ávila al 40% que atenúa el fondo; el modal es sólido (blanco). Un panel paralelo que no bloquea va sin scrim.
- **Superficies grandes más "gruesas":** los modales llevan sombra difusa más profunda que las cards (`0 24px 48px rgb(20 68 40 / 0.18)`). La sombra de marca sólida es aparte y solo para elementos destacados.
- **Accesibilidad:** con `prefers-reduced-transparency: reduce` el header es sólido y sin blur. Con `prefers-contrast: more` los fondos son sólidos y se usa un borde `--color-border-input`.

---

## Movimiento e interacción [Adaptación web]

Se toma de `apple-design`. Un elemento se siente vivo cuando responde al instante, el movimiento parte del valor actual en pantalla y puede interrumpirse en cualquier momento.

### Respuesta inmediata
- El feedback va en el `pointerdown` o `:active`, no al soltar. Botón sin sombra: `transform: scale(0.97)` en 100ms ease-out. Botón con sombra de marca: se desplaza hacia la sombra (`translate(3px, 4px)` y la sombra a 0) en 100ms, como si se hundiera.
- Nada de debounces, timers ni esperas artificiales en el camino del input. El `delay()` del mock de `api.js` simula red; no se suma otra espera en la UI.
- Durante la interacción el feedback es continuo: hover visible, el campo de autocompletado filtra mientras se escribe y el drawer sigue al dedo 1:1.

### Springs y valores
- Lo que el usuario puede tocar o arrastrar (drawer mobile, sheets, reordenar) se anima con **springs**, no con transiciones CSS ni `@keyframes`, porque solo así se puede interrumpir. Librería: **Motion** (`motion`), con los presets centralizados en `frontend/src/styles/movimiento.js`.
- **Spring por defecto:** sin rebote. Damping 1.0 y response 0.35 s, que en Motion es `{ type: 'spring', bounce: 0, duration: 0.35 }`.
- **Con inercia** (soltar o lanzar el drawer): damping 0.8 y response 0.3 s (`bounce: 0.2, duration: 0.3`). Solo hay rebote cuando el gesto traía impulso; un menú que solo aparece nunca rebota.
- **Al soltar un gesto:** se pasa la velocidad del dedo al spring y el destino (abrir o cerrar) se decide por la proyección del impulso y el signo de la velocidad, no solo por la posición.
- **Bordes elásticos:** al arrastrar más allá del límite hay resistencia progresiva, nunca un tope seco.
- Las transiciones que no son gestos (hover, cambio de color, aparición de un toast) pueden usar CSS: 150–250ms, solo `transform` y `opacity`.

### Consistencia espacial
- **Se entra y se sale por el mismo camino.** El drawer entra y sale por la izquierda. Los toasts aparecen y se van por el mismo borde. El modal crece y se encoge desde el mismo punto.
- **Anclar al origen:** popovers, el menú de autocompletado y los menús contextuales nacen del elemento que los abrió (`transform-origin` en el disparador).
- Nunca se bloquea el input durante una transición. Un modal que se está cerrando puede reabrirse y la animación parte del valor actual.

### Movimiento reducido
- Con `prefers-reduced-motion: reduce` los slides y springs se cambian por fundidos de opacidad de 200ms, sin rebotes. Los cambios de color u opacidad que ayudan a entender se mantienen.
- Nada de fondos en movimiento, bucles lentos ni saltos bruscos de brillo.

---

## Componentes [Adaptación web]

**Botones**
- Principal: fondo Verde Ávila, texto Crema y Trigo, Josefin Sans 600 en MAYÚSCULAS, forma de píldora.
- Secundario: fondo blanco, borde y texto Verde Ávila.
- Destructivo: fondo Rojo Vinotinto y texto blanco, siempre con confirmación.
- Estados `hover`, `focus-visible` (anillo Vinotinto) y `disabled` visibles. Área táctil mínima de 44×44px.
- Mientras una acción async está en curso, el botón queda deshabilitado y con indicador de carga.
- La confirmación es solo para acciones destructivas e irreversibles. Si una acción se puede deshacer, se prefiere ofrecer "Deshacer" a confirmar.

**Navegación (sidebar)**
- Fondo Verde Ávila con texto Crema y Trigo. Ítem activo como píldora Amarillo Criollo con texto Verde Ávila.
- Logotipo tipográfico arriba. El naranja aparece como franja o acento de identidad.
- Cada pantalla responde a dónde estoy (ítem activo y título), a dónde puedo ir y cómo salgo (volver o cancelar visible). Los ítems se nombran por su contenido ("Compras", "Agregar compra") y no con etiquetas genéricas.

**Cards y métricas**
- Fondo blanco sobre crema, radio de 20px. Las cards de KPI pueden llevar la sombra de marca.
- La cifra (Josefin 700, Verde Ávila) tiene más jerarquía visual que su etiqueta.

**Tablas**
- Sobrias: fondo blanco, encabezado `--color-surface-soft` en Josefin 600, divisores discretos y hover visible.
- Montos alineados a la derecha con el mismo número de decimales.
- En mobile, scroll horizontal dentro de un contenedor, o filas convertidas en cards.

**Formularios**
- Label visible encima de cada campo; el placeholder no sustituye al label.
- Error específico debajo del campo, en Vinotinto con ícono, enlazado con `aria-describedby`. Se valida en línea al salir del campo, no solo al enviar.
- Si el envío falla, mostrar un resumen de errores arriba que reciba el foco y enlace a cada campo.

**Notificaciones (toasts)**
- Éxito con tinte verde y error con tinte vinotinto, siempre con ícono y texto.
- No son el único canal para un error de formulario.

---

## Layout [Adaptación web]

- **Desktop:** Sidebar + Header + contenido principal.
- **Mobile:** drawer o bottom navigation (máximo 5 ítems), una sola columna y sin scroll horizontal de página.
- **Prioridades del dashboard:** métricas financieras → costos → gastos → utilidad/margen → gráficos → actividad reciente.

---

## Tono de voz

| Tono                                   | Estilo                                         |
| -------------------------------------- | ---------------------------------------------- |
| Cercano y conversacional               | Lenguaje simple, humano y cotidiano            |
| Auténtico, venezolano, sutilmente nostálgico | Educativo sobre la cultura venezolana    |
| Amigable, invita a probar cosas nuevas | Visual y verbalmente vibrante, caribeño        |

Mensajes de marca: "Tu antojo venezolano en El Salvador", "Aquí se viene a comer rico", "Hoy toca arepita", "Naguará, qué rico".

### Microcopy en la app [Adaptación web]

| Contexto               | Tono                                       | Ejemplo                                              |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Bienvenida / inicio    | Cercano, con la voz de la marca            | "¡Epa! Hoy toca registrar las compras."              |
| Estados vacíos         | Amigable, invita a la acción               | "Todavía no hay compras. ¡Agreguemos la primera!"   |
| Éxito                  | Breve y cálido                             | "¡Listo! Compra guardada."                           |
| Errores y validaciones | Claro y directo, **sin modismos**          | "Ingresa un precio mayor a 0."                       |
| Datos financieros      | Neutral y preciso                          | Etiquetas literales: "Total gastado", "Costo unitario" |

---

## Reglas estrictas

1. Solo los seis colores del brandbook y sus derivados documentados aquí. Nada de negro puro ni colores fuera de paleta.
2. Nunca texto blanco o crema sobre Naranja Sazón, Amarillo Criollo o Verde Fresco.
3. Josefin Sans para titulares e interfaz; Cardo para textos extensos.
4. Badge ilustrado solo en espacios amplios y sencillos; en el resto, logotipo tipográfico.
5. Contraste WCAG 2.1 AA en todo texto y control.
6. Tablas y cifras sobrias: la marca nunca dificulta la lectura financiera.
7. Toda pantalla nueva debe parecer parte del mismo sistema.
8. Si estética y funcionalidad chocan, gana la funcionalidad.
9. Precedencia: brandbook > skills de `.claude/skills/` > este documento.
10. Todo lo tocable responde al instante, se puede interrumpir y respeta `prefers-reduced-motion`.

---

## Pendientes de marca

Todos resueltos:

- **Verdes:** confirmado que Verde Fresco es `#6DAD28` y Verde Ávila es `#144428` (ver nota en la paleta).
- **Favicon e ícono de app:** se usa el badge ilustrado en 1:1, conectado en `frontend/index.html` y `site.webmanifest`.
- **Assets del logotipo:** `frontend/public/brand/logo-badge.png` (1197×1197, transparente), sacado de las imágenes incrustadas en el brandbook.
