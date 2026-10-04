# Decisiones del refactor del frontend

Resumen técnico de lo aplicado en el refactor ([plan](PLAN_REFACTOR_FRONTEND.md)). Las decisiones de **marca** (paleta, tipografía, logotipo, tono, movimiento) están en [`DESIGN_DECISIONS.md`](../DESIGN_DECISIONS.md); este documento no las repite.

**Precedencia:** Brandbook > skills de `.claude/skills/` > `DESIGN_DECISIONS.md` > este documento.

## Tokens semánticos aplicados

Definidos en `frontend/src/styles/tokens.css` (capa 2). Los componentes solo usan estos o sus tokens locales.

| Token                  | Valor                           | Uso                                    |
| ---------------------- | ------------------------------- | -------------------------------------- |
| `--color-bg`           | Crema y Trigo `#FEEECC`         | Fondo de página y atmósfera general    |
| `--color-surface`      | `#FFFFFF`                       | Tarjetas, tablas, modales, inputs      |
| `--color-surface-soft` | `#FFF8EB`                       | Encabezados de tabla, hover suave      |
| `--color-text`         | Verde Ávila `#144428`           | Texto principal, cifras y contraste AA |
| `--color-text-muted`   | `#4F735E`                       | Texto secundario                       |
| `--color-primary`      | Naranja Sazón `#EF7D05`         | Acción principal, sidebar, barra móvil |
| `--color-on-primary`   | Ávila profundo `#0F331E`        | Texto e íconos sobre naranja (5.03:1)  |
| `--color-brand`        | Naranja Sazón `#EF7D05`         | Franjas de identidad, íconos de marca  |
| `--color-accent`       | Amarillo Criollo `#F8A914`      | Detalles, acentos secundarios          |
| `--color-danger`       | Rojo Vinotinto `#911C0D`        | Eliminar, errores                      |
| `--color-focus`        | Rojo Vinotinto `#911C0D`        | Anillo de foco                         |

> **Jerarquía cromática de marca:** Crema y Trigo (`#FEEECC`) y Naranja Sazón (`#EF7D05`) son los colores dominantes que definen la calidez y personalidad de De Panas SV. Verde Ávila (`#144428`) se reserva como ancla tipográfica y contable para garantizar contraste estricto WCAG AA en todo momento. Sobre el naranja, el texto usa **Ávila profundo** (`#0F331E`, el mismo verde con menos luz), porque Verde Ávila da 4.03:1 y solo cumple en texto grande. En la barra lateral naranja, el ítem activo usa una píldora Crema y Trigo con texto Verde Ávila (9.71:1). El logotipo "DE PANAS" va en crema con sombra Vinotinto, como en el badge; los logotipos están exentos del criterio de contraste.

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
| Ávila profundo / Naranja Sazón (botón primario, sidebar, barra) | 5.03 |
| Ávila profundo / hover primario (Naranja 85% + blanco) | 5.79 |
| Blanco / hover peligro `#7E2211` (Vinotinto 85% + Ávila) | 9.89 |
| `#4F735E` / `--color-surface-soft`              | 5.04  |
| Verde Ávila / `--color-surface-soft`            | 10.53 |
| Vinotinto / tinte de error `#F4E8E7`            | 7.38  |
| Verde Ávila / tinte de éxito `#E2EFD4`          | 9.29  |
| Ávila profundo / hover de nav (crema 20% sobre naranja) | ≥ 5.03 |
| Verde Ávila / píldora activa Crema y Trigo      | 9.71  |

## Desviaciones del plan

| Plan | Implementado | Motivo |
| ---- | ------------ | ------ |
| `Modal` con prop `pie` | `Modal` + `CuerpoModal` + `PieModal` como hijos | El pie de `FilterModal` depende del estado del formulario; con hijos, el formulario envuelve cuerpo y pie |
| Tabla de Agregar compra como tarjetas solo en móvil | Tarjetas bajo **1100px** (2 columnas en tablet) | Con scroll horizontal, la lista del autocompletado quedaba recortada dentro de la tabla |
| Fecha del header en `--color-text-muted` | `--color-text` con peso 600 | `DESIGN_DECISIONS.md` (precedencia mayor): sobre material translúcido nunca texto atenuado |
| — | Insignia del header oculta bajo 480px | Con logo + título + insignia, el título se truncaba |
| Estado `tocados` en la validación | Solo `errors` | Equivalente: `onBlur` siempre valida; `onChange` revalida solo si ya había error |

## Listas de compra (cambio de funcionalidad)

Ver [PLAN_LISTAS_COMPRA.md](PLAN_LISTAS_COMPRA.md).

| Tema | Decisión |
| ---- | -------- |
| Modelo | Lista `{ id, proveedor, fecha, productos[] }`; `precio` es el total de la línea y el gasto es la suma |
| Página principal | `/` = Agregar compra; se eliminó `Inicio` (y `FilterModal`) |
| Varias compras | Un `BloqueCompra` por compra, cada uno con su Cancelar/Guardar; al guardar se vacía o se quita |
| Detalle | Modal (`DetalleLista`) con ver, editar (el mismo `BloqueCompra` con `plano`) y eliminar |
| Filtros | En línea, sin modal, en vivo. Mientras llega la respuesta se mantiene la tabla anterior (sin parpadeo de "cargando") |
| Fila clicable | Botón en la celda del proveedor con `::after` que cubre la fila: un solo control accesible por fila, con nombre descriptivo |
| Layout del bloque | Container query (`@container`, 760px): tabla o tarjetas según el ancho del bloque, igual en la página y en el modal |
| Datos previos | `depanas_compras` se migra una vez a `depanas_listas`, agrupando por proveedor y fecha |

## Pendientes
- **Bundle:** el JS pasó de ~193 kB a ~339 kB (sin gzip), sobre todo por `motion`. Si importa, se puede cargar Motion de forma diferida.
- `npm audit` reporta vulnerabilidades en `esbuild` (dev) y `react-router` 6. Arreglarlas implica subir versiones mayores (fuera del alcance).
- Drawer móvil con gestos (`springConImpulso`, proyección de inercia) para una fase futura.
