# Brand Guidelines — DE PANAS v2.0

> Archivo de datos de la skill `brand` (`.claude/skills/brand/scripts/`): sus scripts buscan los encabezados en inglés de las secciones (Primary Colors, Font Stack, Brand Personality…), por eso se conservan así. No escribas esos encabezados con almohadillas en otra parte del archivo: el script tomaría el primero que encuentre. El contenido es un resumen; **la referencia completa y la que manda es [`DESIGN_DECISIONS.md`](../DESIGN_DECISIONS.md)** (la marca tal como vive en el sitio), y los valores reales están en `frontend/src/styles/tokens.css`. Si cambias algo aquí, cámbialo también allá.
>
> Uso: `node .claude/skills/brand/scripts/inject-brand-context.cjs` (contexto de marca), `node .claude/skills/brand/scripts/extract-colors.cjs --palette` (paleta) y `node .claude/skills/brand/scripts/extract-colors.cjs <imagen>` (compara una imagen con la paleta). **No uses** `sync-brand-to-tokens.cjs`: los tokens viven en `tokens.css`.

## Quick Reference

| Qué | Valor |
|---|---|
| Marca | DE PANAS — restaurante venezolano en El Salvador |
| Lema | «La verdadera sazón venezolana» (badge: «Auténtico sabor venezolano») |
| Protagonistas | Naranja Sazón `#EF7D05` y Crema y Trigo `#FEEECC` |
| Texto | Verde Ávila `#144428`; sobre naranja, Ávila profundo `#0F331E` |
| Tipografía | Josefin Sans (interfaz y titulares en MAYÚSCULAS) y Cardo (textos largos) |
| Íconos | Lucide, de línea |

## 1. Color Palette

### Primary Colors

| Nombre | Hex | Token | Uso |
|---|---|---|---|
| Naranja Sazón | #EF7D05 | `--naranja-sazon` / `--color-primary` | Menú lateral, barra inferior, botón principal, íconos de sección |
| Crema y Trigo | #FEEECC | `--crema-trigo` / `--color-bg` | Fondo de página con el collage de ilustraciones al 10 % |
| Verde Ávila | #144428 | `--verde-avila` / `--color-text` | Texto, cifras, títulos, borde de botones secundarios |

### Secondary Colors

| Nombre | Hex | Token | Uso |
|---|---|---|---|
| Amarillo Criollo | #F8A914 | `--amarillo-criollo` / `--color-accent` | Insignias de marca («Administrador»), avisos |
| Rojo Vinotinto | #911C0D | `--rojo-vinotinto` / `--color-danger` | Eliminar, errores, foco, sombra sólida de marca |
| Verde Fresco | #6DAD28 | `--verde-fresco` / `--color-success` | Éxito, solo como fondo o ícono |

### Neutral Palette

| Nombre | Hex | Token | Uso |
|---|---|---|---|
| Blanco | #FFFFFF | `--color-surface` | Tarjetas, tablas, campos, ventanas |
| Crema claro | #FFF8EB | `--color-surface-soft` | Encabezados de tabla, hover |
| Ávila profundo | #0F331E | `--color-on-primary` | Texto e íconos sobre naranja (5.03:1) |
| Ávila al 75 % | #4F735E | `--color-text-muted` | Texto secundario (nunca sobre el collage) |
| Borde de campo | #728F7E | `--color-border-input` | Borde de campos y controles |
| Borde suave | #C4C4A3 | `--color-border` | Divisores |

Sin negro puro: nunca se usa el negro.

### Semantic Colors

| Estado | Hex | Token | Texto encima |
|---|---|---|---|
| Éxito | #E2EFD4 | `--tinte-exito` | Verde Ávila |
| Aviso | #FDE5B8 | `--tinte-aviso` | Verde Ávila |
| Error | #F4E8E7 | `--tinte-error` | Rojo Vinotinto |
| Fila elegida | naranja al 13 % sobre blanco | `--color-seleccion` | Verde Ávila |

### Accessibility

- WCAG 2.1 AA en todo texto y control.
- Nunca texto blanco o crema sobre naranja, amarillo o verde fresco (exento: el logotipo «DE PANAS»).
- Sobre el collage del fondo, el texto va en `--color-text`.
- El color nunca va solo: los estados llevan ícono o texto.

## 2. Typography

### Font Stack

```css
--font-heading: 'Josefin Sans', system-ui, sans-serif;
--font-body: 'Cardo', Georgia, serif;
```

En el código se llaman `--fuente-titulos` y `--fuente-texto` (`tokens.css`). Se cargan de Google Fonts: Josefin Sans 400/600/700 y Cardo 400, 400 itálica y 700.

### Type Scale

| Elemento | Fuente | Peso | Tamaño (escritorio / teléfono) |
|---|---|---|---|
| H1 (título de pantalla) | Josefin Sans | 700 | 2rem / 1.625rem, MAYÚSCULAS |
| H2 (título de tarjeta) | Josefin Sans | 700 | 1.5rem / 1.25rem, MAYÚSCULAS |
| Botones | Josefin Sans | 600 | 1rem, MAYÚSCULAS |
| Etiquetas de columna | Josefin Sans | 600 | 0.875rem, MAYÚSCULAS |
| Celdas y montos | Josefin Sans | 400–700 | 1rem; montos a la derecha |
| Párrafos y ayudas | Cardo | 400 | 1rem, máximo 65ch |

## 3. Logo Usage

### Variants

| Variante | Dónde |
|---|---|
| Arepa del badge + «DE PANAS» crema con sombra vinotinto | Menú lateral |
| Píldora naranja «DE PANAS» + arepa en círculo | Pantalla de acceso |
| Píldora naranja «DE PANAS» | Encabezado en el teléfono |
| Badge ilustrado completo (`brand/logo-badge.png`) | Favicon, íconos de app, portadas (manual, documentos) |

### Clear Space

Alrededor del badge, al menos la altura de «DE PANAS» en el logo.

### Don'ts

| Avoid | Por qué |
|---|---|
| Deformar, rotar o recolorear el badge o la arepa | Rompe la identidad |
| El badge completo a tamaño de menú | No se lee |
| Logo junto a tablas, cifras o formularios | Compite con los datos |

## 4. Voice & Tone

### Brand Personality

| Rasgo | Cómo se nota |
|---|---|
| **Cercana** | Lenguaje simple y cotidiano: «¡Épale, pana!» |
| **Auténtica** | Guiños venezolanos: «Naguará», «pana» |
| **Amigable** | Invita a la acción, nunca regaña |
| **Vibrante** | Cálida en éxitos y vacíos: «¡Listo, pana! Compra guardada.» |

### Core Attributes

| Atributo | En la app |
|---|---|
| **Claridad** | Errores y validaciones sin modismos: qué pasó y qué hacer |
| **Sobriedad con los datos** | Etiquetas literales: «Subtotal», «IVA (13 %)», «Total» |
| **Calidez** | La voz de marca vive en el acceso, las confirmaciones y los estados vacíos |

### Tone by Context

| Contexto | Ejemplo |
|---|---|
| Acceso | «¡Épale, pana!» |
| Éxito | «¡Listo, pana! Compra guardada.» |
| Estado vacío | «Todavía no hay compras. ¡Anota la primera, que hoy toca arepita!» |
| Error | «No pudimos guardar la compra: [motivo]. Revisa los datos e inténtalo de nuevo.» |
| Validación | «Debe ser mayor a 0» |

Los encabezados de pantalla llevan solo el título, sin frase. Todo texto para el usuario vive en `frontend/src/utils/mensajes.js`.

### Prohibited Terms

| Avoid |
|---|
| «material» en la interfaz (se dice «artículo») |
| culpar al usuario en un error (se dice qué pasó y qué hacer) |
| modismos en errores y validaciones |

## 5. Imagery Guidelines

### Photography Style

Dentro de la app no se usan fotos. En materiales externos (manual, presentaciones): producto real de De Panas, luz natural y cálida, nunca dentro de tablas o formularios.

### Illustrations

Las 17 ilustraciones de la pág. 10 del brandbook (trazo a mano, Rojo Vinotinto) forman el collage del fondo (`brand/patron-elementos-graficos.webp`), al 10 % de opacidad. No van dentro de tablas ni formularios.

### Icons

Solo Lucide (`lucide-react`), de línea; 1rem en botones con texto, 1.125rem solos. Sin emojis. Un botón solo de ícono lleva `aria-label`.

## 6. Design Components

### Buttons

| Variante | Estilo |
|---|---|
| Primario | Naranja con texto Ávila profundo, píldora, MAYÚSCULAS; con sombra vinotinto en la acción principal |
| Secundario | Blanco con borde de 2 px Verde Ávila |
| Ícono | Secundario de 44 × 44 px (Filtrar, Eliminar, páginas) |
| Peligro | Vinotinto con texto blanco, siempre con confirmación |

### Spacing Scale

Base de 4 px en rem: 0.25 · 0.5 · 0.75 · 1 · 1.25 · 1.5 · 2 · 3 (`--space-1` a `--space-12`). Controles de 44 px; filas de tabla de 52 px en escritorio.

### Border Radius

Campos 12 px, tarjetas 20 px, ventanas 24 px, botones e insignias en píldora.

## AI Image Generation

### Base Prompt Template

```
Ilustración para DE PANAS, restaurante venezolano en El Salvador: comida casera (arepas, empanadas, tequeños), estilo cálido y cercano, paleta naranja #EF7D05, crema #FEEECC, verde ávila #144428 y acentos vinotinto #911C0D, sin texto.
```

### Style Keywords

| Categoría | Palabras |
|---|---|
| **Estilo** | ilustración a mano alzada, trazo de línea, cálido, casero |
| **Color** | naranja, crema, verde ávila, vinotinto |
| **Ambiente** | cocina familiar, venezolano, caribeño, cercano |

### Visual Mood Descriptors

- Cálido y hogareño
- Vibrante sin ser recargado
- Natural y desenfadado

### Visual Don'ts

| Avoid (evitar) | Por qué |
|---|---|
| Negro puro o colores fuera de paleta | No son de la marca |
| Texto blanco sobre naranja o amarillo | No cumple contraste |
| Fotos de stock genéricas | No es De Panas |

## Changelog

| Versión | Fecha | Cambio |
|---|---|---|
| 2.0 | 2026-11-11 | Creado a partir de `DESIGN_DECISIONS.md` (sitio actual) para los scripts de la skill `brand` |
