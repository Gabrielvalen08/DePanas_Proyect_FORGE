# Decisiones del refactor del frontend

Resumen técnico de lo aplicado en el refactor ([plan](PLAN_REFACTOR_FRONTEND.md)). Las decisiones de **marca** (paleta, tipografía, logotipo, tono, movimiento) están en [`DESIGN_DECISIONS.md`](../DESIGN_DECISIONS.md); este documento no las repite.

**Precedencia:** Brandbook > skills de `.claude/skills/` > `DESIGN_DECISIONS.md` > este documento.

## Tokens semánticos aplicados

Definidos en `frontend/src/styles/tokens.css` (capa 2). Los componentes solo usan estos o sus tokens locales.

| Token                  | Valor                           | Uso                                    |
| ---------------------- | ------------------------------- | -------------------------------------- |
| `--color-bg`           | Crema y Trigo `#FEEECC`         | Fondo de página                        |
| `--color-surface`      | `#FFFFFF`                       | Tarjetas, tablas, modales, inputs      |
| `--color-surface-soft` | `#FFF8EB`                       | Encabezados de tabla, hover            |
| `--color-text`         | Verde Ávila `#144428`           | Texto y cifras                         |
| `--color-text-muted`   | `#4F735E`                       | Texto secundario                       |
| `--color-primary`      | Verde Ávila `#144428`           | Acción principal, sidebar, barra inferior |
| `--color-brand`        | Naranja Sazón `#EF7D05`         | Franjas de identidad, íconos decorativos |
| `--color-accent`       | Amarillo Criollo `#F8A914`      | Navegación activa, insignias de marca  |
| `--color-danger`       | Rojo Vinotinto `#911C0D`        | Eliminar, errores                      |
| `--color-focus`        | Rojo Vinotinto `#911C0D`        | Anillo de foco                         |

Escala de espaciado `--space-1` … `--space-12` (base 4px, en `rem`). Radios: inputs 12px, tarjetas 20px, modales 24px, botones 999px. Sombra de marca `3px 4px 0` Vinotinto.

## Decisiones técnicas

| Tema | Decisión | Por qué |
| ---- | -------- | ------- |
| CSS | **CSS Modules** + globales mínimos en `styles/` | Sin choques de nombres; Vite lo soporta sin configuración. ESLint prohíbe `style={{}}` |
| Animación | **`motion`** 14 (`motion/react`) | Springs interrumpibles que parten del valor actual (skill `apple-design`) |
| Springs | `springSuave` `{ bounce: 0, duration: 0.35 }`; `springConImpulso` `{ bounce: 0.2, duration: 0.3 }` | Damping 1.0 por defecto; rebote solo con inercia |
| Feedback de presión | CSS `:active`, 100ms (`scale(0.97)` o hundirse en la sombra) | Debe ser instantáneo; Motion agregaría latencia |
| Navegación móvil | **Barra inferior** de 3 ítems | Siempre visible y más simple que un drawer con gestos; el drawer queda para una fase futura |
| Calidad | Vitest 2 + Testing Library, ESLint 9 con `jsx-a11y` (strict) y `react-hooks` v7 | `@eslint/js` fijado en `^9`: la v10 exige ESLint 10, que `jsx-a11y` no soporta |
| Tests y Motion | `MotionGlobalConfig.skipAnimations = true` en `src/test/setup.js` | Las salidas animadas no hacen esperar a los tests |

## Accesibilidad

- **Modal:** portal, `aria-modal`, trampa de foco, Escape, retorno del foco y bloqueo del scroll. Las confirmaciones usan `alertdialog`, con foco inicial en "Cancelar" y sin cerrar con clic en el scrim.
- **Combobox** (`AutocompleteInput`): patrón WAI-ARIA APG con `aria-activedescendant`. Las opciones son `div role="option"`, porque el modo strict de `jsx-a11y` no admite `li` con rol interactivo. El clic en la opción lleva un `eslint-disable` justificado: el teclado se maneja desde el input.
- **Validación:** al salir del campo, con el error enlazado por `aria-describedby`. Si el envío falla, aparece un resumen `role="alert"` que recibe el foco y enlaza a cada campo.
- **Regiones vivas:** los toasts usan `status` (éxito) y `alert` (error); el autocompletado anuncia cuántas sugerencias hay.
- **Navegación:** enlace "Saltar al contenido"; al cambiar de ruta, el foco va al `<main>` y se actualiza `document.title`.
- `scroll-margin` en controles para que lo enfocado no quede bajo el header translúcido ni bajo la barra inferior.

### Contrastes adicionales calculados

Combinaciones nuevas que no estaban en la tabla de `DESIGN_DECISIONS.md` (WCAG 2.1):

| Texto / fondo                                   | Ratio |
| ----------------------------------------------- | ----- |
| Crema / hover primario `#376048` (Ávila 85% + blanco) | 6.25 |
| Blanco / hover peligro `#7E2211` (Vinotinto 85% + Ávila) | 9.89 |
| `#4F735E` / `--color-surface-soft`              | 5.04  |
| Verde Ávila / `--color-surface-soft`            | 10.53 |
| Vinotinto / tinte de error `#F4E8E7`            | 7.38  |
| Verde Ávila / tinte de éxito `#E2EFD4`          | 9.29  |
| Crema / hover de nav `#30583C`                  | 7.08  |

## Desviaciones del plan

| Plan | Implementado | Motivo |
| ---- | ------------ | ------ |
| `Modal` con prop `pie` | `Modal` + `CuerpoModal` + `PieModal` como hijos | El pie de `FilterModal` depende del estado del formulario; con hijos, el formulario envuelve cuerpo y pie |
| Tabla de Agregar compra como tarjetas solo en móvil | Tarjetas bajo **1100px** (2 columnas en tablet) | Con scroll horizontal, la lista del autocompletado quedaba recortada dentro de la tabla |
| Fecha del header en `--color-text-muted` | `--color-text` con peso 600 | `DESIGN_DECISIONS.md` (precedencia mayor): sobre material translúcido nunca texto atenuado |
| — | Insignia del header oculta bajo 480px | Con logo + título + insignia, el título se truncaba |
| Estado `tocados` en la validación | Solo `errors` | Equivalente: `onBlur` siempre valida; `onChange` revalida solo si ya había error |

## Pendientes
- **Bundle:** el JS pasó de ~193 kB a ~339 kB (sin gzip), sobre todo por `motion`. Si importa, se puede cargar Motion de forma diferida.
- `npm audit` reporta vulnerabilidades en `esbuild` (dev) y `react-router` 6. Arreglarlas implica subir versiones mayores (fuera del alcance).
- Drawer móvil con gestos (`springConImpulso`, proyección de inercia) para una fase futura.
