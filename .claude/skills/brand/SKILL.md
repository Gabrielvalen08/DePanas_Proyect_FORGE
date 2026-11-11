---
name: brand
description: Marca DE PANAS (restaurante venezolano en El Salvador) aplicada a su app de compras y costos y a todo material del proyecto (manual de uso, documentación, presentaciones). Úsala antes de diseñar o revisar una pantalla, escribir un texto para el usuario, elegir colores, logotipo, íconos o imágenes, o revisar que algo "se vea De Panas". Resume paleta, tipografía, logotipo, assets, voz y reglas, y dice dónde vive cada cosa en el repo.
argument-hint: "[revisar|aplicar] [pantalla o archivo]"
metadata:
  author: claudekit (plantilla), adaptada para De Panas
  version: "2.0.0"
---

# Marca DE PANAS

**La fuente de verdad es `DESIGN_DECISIONS.md` (raíz del repo)**, que describe la marca como vive hoy en el sitio. Esta skill es su resumen operativo. Precedencia: **sitio actual (DESIGN_DECISIONS.md) > Brandbook mayo 2026 > otras skills**.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Decisiones de marca completas | `DESIGN_DECISIONS.md` |
| Tokens (colores, espacios, radios, fuentes, sombras) | `frontend/src/styles/tokens.css` |
| Tipografía base, collage, foco, vista de teléfono | `frontend/src/styles/base.css` |
| Componentes de marca | `frontend/src/components/common/` |
| Textos con la voz de marca | `frontend/src/utils/mensajes.js` |
| Logos, arepa, collage, íconos de app | `frontend/public/brand/` |
| Animaciones | `frontend/src/styles/movimiento.js` |
| Resumen para los scripts de esta skill | `docs/brand-guidelines.md` |

## Identidad en 30 segundos

- **Esencia:** sazón venezolana casera y familiar (arepas, empanadas, tequeños, cachitos, golfeados), cercana, auténtica, vibrante. Lema: «La verdadera sazón venezolana».
- **Protagonistas:** **Naranja Sazón `#EF7D05`** (menú, barra inferior, botón principal) y **Crema y Trigo `#FEEECC`** (fondo con el collage de ilustraciones al 10 %).
- **Tinta:** **Verde Ávila `#144428`** para texto, cifras y títulos. Sobre naranja, **Ávila profundo `#0F331E`** (`--color-on-primary`).
- **Acentos:** Amarillo Criollo `#F8A914` (insignias de marca, avisos), Rojo Vinotinto `#911C0D` (eliminar, errores, foco, sombra sólida de marca), Verde Fresco `#6DAD28` (éxito, solo como fondo o ícono).
- **Superficies:** blanco para tarjetas, tablas y campos. Nunca negro puro.
- **Tipografía:** **Josefin Sans** (400/600/700) para interfaz y titulares en MAYÚSCULAS; **Cardo** (400, 400 itálica, 700) para párrafos y ayudas.
- **Formas:** píldoras en botones e insignias, campos de 12 px, tarjetas de 20 px, modales de 24 px. Sombra sólida desplazada Vinotinto (`3px 4px 0`) solo en la acción principal.
- **Logotipo:** en el menú, la arepa del badge + «DE PANAS» en crema con sombra vinotinto; en el acceso, píldora naranja «DE PANAS» + arepa en círculo; en teléfono, la píldora. El badge completo solo en íconos de app y piezas amplias.
- **Íconos:** solo Lucide, de línea. Sin emojis. Sin fotos dentro de la app.
- **Encabezados:** solo el título de la pantalla en MAYÚSCULAS y la fecha; sin frase debajo.

## Voz

- Cercana, venezolana, amigable: «¡Épale, pana!», «¡Listo, pana! Compra guardada.», «Naguará».
- **Errores y validaciones sin modismos:** qué pasó y qué hacer. Nunca culpan al usuario.
- Datos con etiquetas literales: «Subtotal», «IVA (13 %)», «Total».
- En la interfaz se dice **artículo**, no material.
- Todo texto nuevo va en `mensajes.js`, nunca escrito en el JSX.

## Reglas que no se rompen

1. Solo colores de la paleta y sus derivados documentados; componentes con roles `--color-*`, nunca hex sueltos.
2. Nunca texto blanco o crema sobre naranja, amarillo o verde fresco (salvo el logotipo tipográfico).
3. Contraste WCAG AA en todo; sobre el collage, texto en `--color-text`, nunca `--color-text-muted`.
4. Tablas y cifras sobrias, montos a la derecha.
5. Una pantalla con fondo crema no pinta su propio fondo.
6. `prefers-reduced-motion` siempre respetado.

## Cómo revisar algo contra la marca

1. Lee `DESIGN_DECISIONS.md` en la sección que corresponda (color, tipografía, logotipo, componentes, voz).
2. Compara el CSS: busca hex o `rgb()` sueltos fuera de `tokens.css` y colores de capa 1 usados directo en componentes.
3. Compara los textos con `mensajes.js` y la tabla de voz.
4. Revisa la pantalla en escritorio (≥ 1100 px) y teléfono (< 1100 px), con capturas si es posible.
5. Reporta: qué no cumple, dónde (archivo:línea) y la corrección con el token o el componente correcto.

Para material fuera de la app (manual de uso en HTML, documentación, presentaciones): misma paleta, Josefin para títulos y Cardo para el cuerpo, fondo crema, acentos naranja y el badge completo en la portada.

## Referencias de método

Las guías de `references/` son la plantilla general de la skill (voz, identidad visual, logotipo, color, tipografía, consistencia, aprobación). Sirven como método; los valores de De Panas son los de arriba.

| Tema | Archivo |
|---|---|
| Consistencia | `references/consistency-checklist.md` |
| Logotipo | `references/logo-usage-rules.md` |
| Color | `references/color-palette-management.md` |
| Tipografía | `references/typography-specifications.md` |
| Voz | `references/voice-framework.md` |
| Aprobación | `references/approval-checklist.md` |

## Scripts

Leen `docs/brand-guidelines.md`, el resumen de la marca en el formato que esperan (encabezados en inglés). Se corren desde la raíz del repo:

```bash
node .claude/skills/brand/scripts/inject-brand-context.cjs          # contexto de marca para un prompt (--json también)
node .claude/skills/brand/scripts/extract-colors.cjs --palette      # la paleta
node .claude/skills/brand/scripts/extract-colors.cjs <imagen>       # colores de una imagen comparados con la paleta
node .claude/skills/brand/scripts/validate-asset.cjs <archivo>      # nombre, tamaño y formato de un asset
```

Si cambia la marca, se actualizan `DESIGN_DECISIONS.md` (manda) y `docs/brand-guidelines.md` juntos. **No uses `scripts/sync-brand-to-tokens.cjs`:** escribe `assets/design-tokens.*`, y aquí los tokens viven en `frontend/src/styles/tokens.css`.
