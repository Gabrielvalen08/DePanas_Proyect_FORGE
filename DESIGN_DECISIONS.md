# DESIGN_DECISIONS.md

## Propósito y fuentes

Este documento define las decisiones de marca para la interfaz web del aplicativo de contabilidad de **DE PANAS**.

- **Fuente única de marca:** *DE PANAS – Brandbook, mayo 2026*. Colores, tipografías, logotipo, gráfica y tono salen solo de ahí.
- **Adaptación web:** el brandbook no cubre interfaces. Lo marcado como **[Adaptación web]** se deriva de la marca aplicando las skills de `.claude/skills/` (`brand`, `design-system`, `ui-ux-pro-max`).
- **Precedencia:** si una regla de este documento choca con una skill de `.claude/skills/`, **prevalece la skill**. Los valores de marca (hex, familias tipográficas, logotipo) no se reemplazan por recomendaciones genéricas de estilo o paleta de las skills.

> Estas son decisiones nuevas. El frontend actual (`frontend/src/index.css`) todavía usa la paleta y tipografía anteriores (Nunito Sans, marrón `#651A0C`, bordes negros) y se migrará aparte.

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

> El brandbook lista nombres y códigos en páginas separadas. La correspondencia entre Verde Fresco y Verde Ávila se dedujo por el tono (claro y oscuro) y debe confirmarse con quien diseñó la marca.

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

| Elemento                         | Familia      | Peso | Tamaño (desktop / mobile) | Notas                          |
| -------------------------------- | ------------ | ---- | ------------------------- | ------------------------------ |
| Título de página (H1)            | Josefin Sans | 700  | 32px / 26px               | MAYÚSCULAS, `letter-spacing: 0.05em` |
| H2 / título de card              | Josefin Sans | 700  | 24px / 20px               | MAYÚSCULAS                     |
| H3                               | Josefin Sans | 600  | 20px / 18px               |                                |
| Navegación, botones, labels      | Josefin Sans | 600  | 16px                      | Botones en MAYÚSCULAS          |
| Métricas destacadas (KPIs)       | Josefin Sans | 700  | 32–40px                   | La cifra domina sobre su etiqueta |
| Tablas y valores monetarios      | Josefin Sans | 400  | 16px                      | Montos alineados a la derecha  |
| Párrafos, descripciones, ayudas  | Cardo        | 400  | 16–18px                   | `line-height: 1.6`, máx. 65ch   |
| Citas y frases de marca          | Cardo        | 400i | 18–24px                   | Bienvenida y estados vacíos    |

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
| Favicon / ícono de app                      | **Pendiente:** el brandbook no define isotipo  |

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

## Formas, bordes y sombras [Adaptación web]

El brandbook no define radios ni sombras. Se derivan del logotipo, que es un círculo con letras redondeadas y sombra sólida desplazada en Vinotinto:

- **Radios:** inputs 12px, cards 20px, modales 24px, botones y chips con forma de píldora (999px).
- **Sombra de marca:** sólida y desplazada, en Vinotinto, como en el lettering del logo: `box-shadow: 3px 4px 0 var(--rojo-vinotinto)`. Solo en elementos destacados (botón principal, cards de métricas, badge), nunca en filas de tabla ni en inputs.
- **Bordes:** `--color-border` para divisores y `--color-border-input` para controles. Nada de bordes negros.

---

## Componentes [Adaptación web]

**Botones**
- Principal: fondo Verde Ávila, texto Crema y Trigo, Josefin Sans 600 en MAYÚSCULAS, forma de píldora.
- Secundario: fondo blanco, borde y texto Verde Ávila.
- Destructivo: fondo Rojo Vinotinto y texto blanco, siempre con confirmación.
- Estados `hover`, `focus-visible` (anillo Vinotinto) y `disabled` visibles. Área táctil mínima de 44×44px.
- Mientras una acción async está en curso, el botón queda deshabilitado y con indicador de carga.

**Navegación (sidebar)**
- Fondo Verde Ávila con texto Crema y Trigo. Ítem activo como píldora Amarillo Criollo con texto Verde Ávila.
- Logotipo tipográfico arriba. El naranja aparece como franja o acento de identidad.

**Cards y métricas**
- Fondo blanco sobre crema, radio de 20px. Las cards de KPI pueden llevar la sombra de marca.
- La cifra (Josefin 700, Verde Ávila) tiene más jerarquía visual que su etiqueta.

**Tablas**
- Sobrias: fondo blanco, encabezado `--color-surface-soft` en Josefin 600, divisores discretos y hover visible.
- Montos alineados a la derecha con el mismo número de decimales.
- En mobile, scroll horizontal dentro de un contenedor, o filas convertidas en cards.

**Formularios**
- Label visible encima de cada campo; el placeholder no sustituye al label.
- Error específico debajo del campo, en Vinotinto con ícono, enlazado con `aria-describedby`.
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
9. Ante un conflicto con una skill de `.claude/skills/`, prevalece la skill.

---

## Pendientes de marca

- Confirmar qué verde es Fresco y cuál Ávila.
- Isotipo o versión reducida del logo para favicon e ícono de app.
- Archivos fuente del logotipo (SVG/PNG con transparencia) y del set de ilustraciones para incorporarlos a `frontend/public/`.
