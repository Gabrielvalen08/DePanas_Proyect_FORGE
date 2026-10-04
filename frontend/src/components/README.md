# components/

Componentes de la app. Las piezas genéricas y reutilizables están en [`common/`](common/README.md); aquí quedan las específicas.

| Componente          | Qué hace                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| `Sidebar`           | Navegación de escritorio (≥ 768px). Naranja Sazón sólido, ítem activo en píldora Crema y Trigo |
| `BarraInferior`     | Navegación móvil (< 768px). La píldora activa se desliza con `layoutId`     |
| `navegacion.js`     | Lista única de rutas, íconos y títulos; la usan `Sidebar`, `BarraInferior` y `App` |
| `Header`            | Header translúcido (`backdrop-filter`). Props: `title`, `badge`             |
| `BloqueCompra`      | Formulario de una lista de compra: proveedor y fecha una vez, filas de producto/cantidad/unidad/precio, total en vivo, validación con resumen y su propio Cancelar/Guardar. Se usa en Agregar compra y, con `plano`, para editar dentro de `DetalleLista`. Decide tabla o tarjetas por su propio ancho (container query) |
| `DetalleLista`      | Modal con los productos de una lista; permite editarla y eliminarla (con `ConfirmModal`) |
| `FiltrosEnLinea`    | Panel de filtros que se despliega junto al botón "Filtrar" (sin ventana); filtra en vivo |
| `ConfirmModal`      | Confirmación (`alertdialog`). El foco inicial va a "Cancelar"               |
| `AutocompleteInput` | Combobox WAI-ARIA con lista anclada al campo                                |

## Convenciones
- Un `Componente.module.css` por componente. Nada de `style={{}}`: ESLint lo rechaza.
- Nombres de props existentes (`title`, `isOpen`…) se conservan; los nuevos van en español.
- Íconos solo de `lucide-react`, con `aria-hidden="true"` cuando acompañan texto. Nunca emojis.
- Si un control solo tiene ícono, necesita `aria-label`.
