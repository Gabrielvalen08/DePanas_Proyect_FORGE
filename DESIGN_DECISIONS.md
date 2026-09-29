# DESIGN_DECISIONS.md

## Propósito

Este documento define las decisiones visuales obligatorias del aplicativo de contabilidad para restaurante. La interfaz debe inspirarse en el estilo visual de **DEPANAS SV**, adaptándolo a un sistema administrativo profesional.

La referencia define la **identidad visual**, no la estructura de navegación.

---

## Identidad Visual

La interfaz debe transmitir:

* Cálida
* Gastronómica
* Moderna
* Amigable
* Profesional
* Clara

Debe evitar sentirse como un dashboard corporativo genérico o una aplicación financiera fría.

---

## Paleta

| Token          | Color     | Uso                                      |
| -------------- | --------- | ---------------------------------------- |
| `primary`      | `#EF7D05` | Identidad principal, headers, navegación |
| `primary-dark` | `#A85804` | Fondos secundarios                       |
| `brown`        | `#651A0C` | Botones, cards y elementos de contraste  |
| `gold`         | `#F8A914` | Acentos y métricas destacadas            |
| `cream`        | `#FFE0A3` | Fondos suaves, badges                    |
| `white`        | `#FFFFFF` | Superficies y texto sobre fondos oscuros |
| `black`        | `#000000` | Bordes y sombras                         |

### Reglas

* Priorizar naranja + marrón como combinación principal.
* Utilizar dorado únicamente como acento.
* No saturar las pantallas utilizando todos los colores simultáneamente.
* Los colores semánticos de éxito, error y advertencia pueden utilizarse cuando sean necesarios.
* Priorizar contraste y legibilidad sobre fidelidad absoluta a la paleta.

---

## Tipografía

Usar preferentemente:

**Nunito Sans**

Pesos:

* `400` — texto
* `500` — labels
* `600` — navegación
* `700` — títulos
* `800` — métricas importantes

La tipografía debe sentirse **bold, redondeada, moderna y amigable**.

---

## Formas

### Border Radius

* Inputs: `12–16px`
* Cards: `18–24px`
* Modales: `20–24px`
* Botones: `999px`

Los botones tipo **pill** son una característica importante del lenguaje visual.

### Bordes

Utilizar bordes oscuros visibles en componentes destacados:

```css
border: 2px solid #000000;
```

No utilizar bordes negros gruesos en cada elemento de una tabla.

### Sombras

Preferir sombras sólidas y ligeramente marcadas:

```css
box-shadow: 3px 4px 0 #000000;
```

Usarlas principalmente en botones, cards y componentes destacados.

---

## Componentes

### Botones

Los botones principales deben:

* Ser redondeados tipo pill.
* Tener alto contraste.
* Utilizar marrón oscuro o naranja.
* Utilizar texto blanco cuando corresponda.
* Tener estados `hover`, `focus` y `disabled` claros.

### Cards

Las cards deben:

* Tener esquinas redondeadas.
* Tener jerarquía visual clara.
* Utilizar blanco, crema o marrón.
* Reservar los colores fuertes para información importante.

### Inputs

Los inputs deben:

* Tener `12–16px` de radius.
* Tener bordes visibles.
* Tener labels claros.
* Mostrar claramente el estado `focus` y `error`.

### Tablas

Las tablas deben ser más sobrias que el resto de la interfaz:

* Fondo claro.
* Texto oscuro.
* Headers con crema o tonos suaves.
* Bordes discretos.
* Hover visible.
* Buena alineación de valores monetarios.

La estética **nunca debe dificultar la lectura financiera**.

---

## Layout

En desktop utilizar:

```text
Sidebar + Header + Main Content
```

El sidebar debe utilizar el lenguaje visual de los botones de la referencia:

* Elementos redondeados.
* Estado activo claramente diferenciado.
* Iconos consistentes.
* Navegación simple.

En mobile:

* Utilizar drawer o bottom navigation.
* Cards de una columna.
* Formularios de una columna.
* Adaptar tablas para pantallas pequeñas.

No convertir el aplicativo en un layout vertical tipo Linktree.

---

## Dashboard

El dashboard debe priorizar:

1. Métricas financieras.
2. Costos.
3. Gastos.
4. Utilidad/margen.
5. Gráficos.
6. Actividad reciente.

Los valores monetarios deben tener mayor jerarquía visual que sus etiquetas.

---

## Iconografía

Utilizar una única librería de iconos consistente.

Preferencias:

* Lucide
* Phosphor
* Material Symbols

Los iconos complementan el texto; no deben sustituir etiquetas cuando una acción pueda ser ambigua.

---

## Imágenes

Las imágenes gastronómicas pueden utilizarse en:

* Login
* Bienvenida
* Empty states
* Dashboard
* Elementos de branding

No utilizar fotografías como decoración en formularios, tablas o pantallas donde interfieran con la información.

---

## UX

La prioridad de diseño es:

```text
Claridad
→ Usabilidad
→ Consistencia
→ Identidad visual
→ Decoración
```

La aplicación debe permitir comprender rápidamente:

* Cuánto se gastó.
* En qué se gastó.
* Cuánto cuesta producir.
* Qué categorías generan más costos.
* Cómo cambian los costos y gastos.
* Qué registros requieren atención.

---

## Reglas estrictas

1. **No crear un dashboard genérico de SaaS.**
2. **No copiar literalmente Linktree.**
3. **No sacrificar legibilidad por estética.**
4. **Mantener naranja + marrón como identidad principal.**
5. **Usar bordes redondeados consistentemente.**
6. **Usar botones tipo pill para acciones principales.**
7. **Mantener una tipografía bold, redondeada y amigable.**
8. **Usar bordes oscuros y sombras sólidas de forma estratégica.**
9. **Mantener tablas y reportes visualmente sobrios.**
10. **Toda nueva pantalla debe parecer parte del mismo sistema de diseño.**
11. **La estética gastronómica debe complementar la aplicación, no competir con los datos.**
12. **Cuando estética y funcionalidad entren en conflicto, siempre prevalece la funcionalidad.**
