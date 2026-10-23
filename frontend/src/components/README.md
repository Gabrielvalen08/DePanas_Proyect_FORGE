# components/

Componentes de la app. Las piezas genéricas y reutilizables están en [`common/`](common/README.md); aquí quedan las específicas.

| Componente          | Qué hace                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| `Sidebar`           | Navegación de escritorio (≥ 768px). Naranja Sazón sólido, ítem activo en píldora Crema y Trigo. Arriba, la arepa del logo (`/brand/arepa.png`) junto a "DE PANAS"; abajo, el botón Cerrar sesión (`onCerrarSesion`) |
| `BarraInferior`     | Navegación móvil (< 768px). La píldora activa se desliza con `layoutId`. Muestra los ítems `enBarra` y "Más", que abre una hoja con el resto y Cerrar sesión |
| `AvisoModo`         | Dice si los datos van al servidor o se quedan en el navegador (Exportar y Cargar) |
| `CompararCompra`    | Compra guardada frente a la del archivo en Cargar datos: filas a conservar, proveedor, fecha y vista previa |
| `navegacion.js`     | Lista única de rutas, íconos y títulos; la usan `Sidebar`, `BarraInferior` y `App`. Catálogo va debajo de Compras; `itemsPie` (Gestor de usuarios) va al pie del menú, arriba de Cerrar sesión (en móvil, dentro de "Más"); `enBarra` marca lo que va directo en la barra inferior; `oculto` deja una ruta (Exportar y Cargar datos) fuera del menú sin quitarle la ruta ni el permiso |
| `Header`            | Header fijo: transparente arriba, crema sólido al hacer scroll. Props: `title`, `badge`, `frase` |
| `BloqueCompra`      | Formulario de una compra: proveedor y fecha una vez, filas de material/cantidad/unidad/precio unitario con el monto calculado (cantidad × precio; el precio se sugiere desde la última compra del material y se puede cambiar), total en vivo, confirmación al guardar y cancelar, botones deshabilitados sin datos y fila nueva solo si la anterior está completa, validación con resumen y su propio Cancelar/Guardar. Bajo cada material muestra su categoría · producto; si falta alguno abre `AsignarMaterial` (al elegirlo, al salir del campo o al guardar) y guarda la compra con la categoría y el producto de cada fila. Se usa en Agregar compra y, con `plano`, para editar dentro de `DetalleLista`. Decide tabla o tarjetas por su propio ancho (container query) |
| `DetalleLista`      | Modal con los materiales de una compra; permite editarla y eliminarla (con `ConfirmDialog`) |
| `AsignarMaterial`   | Ventana "Material nuevo" / "Categoría y producto". Pide solo lo que le falta al material; las opciones son botones (`aria-pressed`), un buscador las filtra y lo que no existe se puede agregar. Props: `material` (de `getAsignacion`, `null` = cerrada), `alGuardar`, `alCancelar` |
| `FiltrosEnLinea`    | Panel de filtros que se despliega junto al botón "Filtrar" (sin ventana); filtra en vivo |
| `EditorCatalogo`    | Ventana para agregar o editar una opción del catálogo (Catálogo). Para un material, también su categoría y su producto con los botones de `AsignarMaterial` (`SelectorOpciones`). Para una categoría o un producto, casillas con buscador para elegir sus materiales (`SelectorMateriales`), diciendo dónde está hoy cada uno |
| `AutocompleteInput` | Combobox WAI-ARIA que funciona como el desplegable de Excel: clic o flecha ▾ muestran todas las opciones, escribir filtra, se elige con clic o flechas + Enter y acepta valores nuevos. Props extra: `onSeleccionar(valor)`, `ayuda` |

## Convenciones
- Los textos para el usuario (toasts, errores, títulos de ventanas) salen de `utils/mensajes.js`, no se escriben en línea.
- Un `Componente.module.css` por componente. Nada de `style={{}}`: ESLint lo rechaza.
- Nombres de props existentes (`title`, `isOpen`…) se conservan; los nuevos van en español.
- Íconos solo de `lucide-react`, con `aria-hidden="true"` cuando acompañan texto. Nunca emojis.
- Si un control solo tiene ícono, necesita `aria-label`.
