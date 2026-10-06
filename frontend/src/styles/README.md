# styles/

Sistema de diseño global. Los estilos de cada componente **no** van aquí: van en su `Componente.module.css`.

| Archivo         | Contenido                                                                 |
| --------------- | ------------------------------------------------------------------------- |
| `tokens.css`    | Variables CSS en 3 capas (ver abajo)                                       |
| `base.css`      | Reset, escala tipográfica, foco visible, `.solo-lector`, `.saltar-contenido`, movimiento reducido y el **collage de fondo** (`body::before`) |
| `global.css`    | Solo importa `tokens.css` y `base.css`; se carga una vez en `main.jsx`     |
| `movimiento.js` | Presets de springs y variantes de Motion (skill `apple-design`)            |

## Las 3 capas de tokens

1. **Primitivos:** los seis colores del brandbook (`--verde-avila`, `--naranja-sazon`…), sus derivados documentados, espaciado (`--space-1` … `--space-12`), radios y fuentes.
2. **Semánticos:** qué significa cada color (`--color-text`, `--color-primary`, `--color-danger`…).
3. **Componentes:** tokens locales que cada módulo define a partir de la capa 2 (por ejemplo `--boton-fondo` en `Boton.module.css`). En `tokens.css` solo están los compartidos (`--campo-*`).

## Collage de fondo

Las ilustraciones de la pág. 10 del brandbook (`/brand/patron-elementos-graficos.webp`) van en una capa fija detrás de todo, al 10 % de opacidad. Tokens en `tokens.css`: `--patron-imagen`, `--patron-opacidad` y `--patron-tamano` (26rem en móvil, 38rem, 46rem desde 1440px). Se oculta con `prefers-contrast: more` y al imprimir.

- Una pantalla con fondo crema **no** pinta su propio `background`: deja ver el del `body`.
- El texto que va directo sobre el collage usa `--color-text`; `--color-text-muted` baja a 3.91:1 sobre los trazos.

**Regla:** los componentes usan la capa 2 o sus tokens locales. Nunca hex sueltos, nunca `#000`, nunca un primitivo de color directamente.

## Movimiento

```js
import { springSuave, variantesModal } from '../styles/movimiento'

<motion.div variants={variantesModal} initial="oculto" animate="visible" exit="oculto" transition={springSuave} />
```

- `springSuave` (sin rebote) es el default. `springConImpulso` solo cuando un gesto trae inercia.
- Feedback de presión (`:active`) va en CSS a 100ms, no en Motion: tiene que ser instantáneo.
- `MotionConfig reducedMotion="user"` (en `main.jsx`) y el bloque `prefers-reduced-motion` de `base.css` dejan solo fundidos cuando el sistema lo pide.
