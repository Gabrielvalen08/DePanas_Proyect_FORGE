# components/

Componentes de la app. Las piezas genéricas y reutilizables están en [`common/`](common/README.md); aquí quedan las específicas.

| Componente          | Qué hace                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| `Sidebar`           | Navegación de escritorio (≥ 768px). Verde Ávila sólido, ítem activo en Amarillo Criollo |
| `BarraInferior`     | Navegación móvil (< 768px). La píldora activa se desliza con `layoutId`     |
| `navegacion.js`     | Lista única de rutas, íconos y títulos; la usan `Sidebar`, `BarraInferior` y `App` |
| `Header`            | Header translúcido (`backdrop-filter`). Props: `title`, `badge`             |
| `FilterModal`       | Filtros de compras. El formulario interno se remonta en cada apertura       |
| `ConfirmModal`      | Confirmación (`alertdialog`). El foco inicial va a "Cancelar"               |
| `AutocompleteInput` | Combobox WAI-ARIA con lista anclada al campo                                |

## Convenciones
- Un `Componente.module.css` por componente. Nada de `style={{}}`: ESLint lo rechaza.
- Nombres de props existentes (`title`, `isOpen`…) se conservan; los nuevos van en español.
- Íconos solo de `lucide-react`, con `aria-hidden="true"` cuando acompañan texto. Nunca emojis.
- Si un control solo tiene ícono, necesita `aria-label`.
