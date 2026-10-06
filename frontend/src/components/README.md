# components/

Componentes de la app. Las piezas genéricas y reutilizables están en [`common/`](common/README.md); aquí quedan las específicas.

| Componente          | Qué hace                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| `Sidebar`           | Navegación de escritorio (≥ 768px). Naranja Sazón sólido, ítem activo en píldora Crema y Trigo. Arriba, la arepa del logo (`/brand/arepa.png`) junto a "DE PANAS"; abajo, el botón Bloquear (`onBloquear`) |
| `BarraInferior`     | Navegación móvil (< 768px). La píldora activa se desliza con `layoutId`. También tiene Bloquear |
| `navegacion.js`     | Lista única de rutas, íconos y títulos; la usan `Sidebar`, `BarraInferior` y `App`. `itemConfiguracion` va al pie del menú, arriba de Bloquear (en la barra móvil, antes de Bloquear) |
| `Header`            | Header fijo: transparente arriba, crema sólido al hacer scroll. Props: `title`, `badge`, `frase` |
| `BloqueCompra`      | Formulario de una compra: proveedor y fecha una vez, filas de material/cantidad/unidad/precio, total en vivo, validación con resumen y su propio Cancelar/Guardar. Bajo cada material muestra su categoría · producto; si falta alguno abre `AsignarMaterial` (al elegirlo, al salir del campo o al guardar) y guarda la compra con la categoría y el producto de cada fila. Se usa en Agregar compra y, con `plano`, para editar dentro de `DetalleLista`. Decide tabla o tarjetas por su propio ancho (container query) |
| `DetalleLista`      | Modal con los materiales de una compra; permite editarla y eliminarla (con `ConfirmModal`) |
| `AsignarMaterial`   | Ventana "Material nuevo" / "Categoría y producto". Pide solo lo que le falta al material; las opciones son botones (`aria-pressed`), un buscador las filtra y lo que no existe se puede agregar. Props: `material` (de `getAsignacion`, `null` = cerrada), `alGuardar`, `alCancelar` |
| `FiltrosEnLinea`    | Panel de filtros que se despliega junto al botón "Filtrar" (sin ventana); filtra en vivo |
| `ConfirmModal`      | Confirmación (`alertdialog`). El foco inicial va a "Cancelar"               |
| `EditorCatalogo`    | Ventana para agregar o editar una opción del catálogo (Configuración). Para un material, también su categoría y su producto con los botones de `AsignarMaterial` (`SelectorOpciones`) |
| `AutocompleteInput` | Combobox WAI-ARIA que funciona como el desplegable de Excel: clic o flecha ▾ muestran todas las opciones, escribir filtra, se elige con clic o flechas + Enter y acepta valores nuevos. Props extra: `onSeleccionar(valor)`, `ayuda` |

## Convenciones
- Los textos para el usuario (toasts, errores, títulos de ventanas) salen de `utils/mensajes.js`, no se escriben en línea.
- Un `Componente.module.css` por componente. Nada de `style={{}}`: ESLint lo rechaza.
- Nombres de props existentes (`title`, `isOpen`…) se conservan; los nuevos van en español.
- Íconos solo de `lucide-react`, con `aria-hidden="true"` cuando acompañan texto. Nunca emojis.
- Si un control solo tiene ícono, necesita `aria-label`.
