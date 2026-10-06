# Decisiones técnicas

Resumen técnico de lo aplicado en el refactor ([plan](PLAN_REFACTOR_FRONTEND.md)) y en los cambios posteriores (catálogo, categoría y producto por material, collage y voz de marca). Las decisiones de **marca** (paleta, tipografía, logotipo, tono, movimiento) están en [`DESIGN_DECISIONS.md`](../DESIGN_DECISIONS.md); este documento no las repite.

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
- **Combobox** (`AutocompleteInput`): patrón WAI-ARIA APG con `aria-activedescendant`. Las opciones son `div role="option"`, porque el modo strict de `jsx-a11y` no admite `li` con rol interactivo. El clic en la opción lleva un `eslint-disable` justificado: el teclado se maneja desde el input. La flecha del desplegable es un `button` con `tabIndex={-1}` y `aria-label` (patrón APG "combobox con botón"): no suma una parada de Tab y la lista se abre también con clic o con flecha abajo.
- **Ventana de categoría y producto** (`AsignarMaterial`): cada grupo es un `fieldset` con `legend`; las opciones son botones con `aria-pressed`. El foco inicial va al primer buscador (prop `focoInicial` de `Modal`). Se renderiza fuera del `<form>` de la compra: sus eventos (portal) no deben llegar al `onSubmit`.
- **Validación:** solo al intentar guardar. Hay un error por campo enlazado con `aria-describedby` y un resumen `role="alert"` que recibe el foco y enlaza a cada campo. Tras el primer intento, los errores se revalidan en vivo y al salir del campo. Las filas completamente vacías se ignoran. (`apple-design` sugiere validar en línea; el equipo prefirió no interrumpir mientras se llena la compra.)
- **Regiones vivas:** los toasts usan `status` (éxito) y `alert` (error); el autocompletado anuncia cuántas sugerencias hay.
- **Navegación:** enlace "Saltar al contenido"; al cambiar de ruta, el foco va al `<main>` y se actualiza `document.title`.
- `scroll-margin` en controles para que lo enfocado no quede bajo el header fijo ni bajo la barra inferior.

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
| `#4F735E` / crema bajo un trazo del collage (peor caso `#F3D9B9`) | 3.91 ✗ |
| Verde Ávila / crema bajo un trazo del collage   | 8.18  |
| Crema y Trigo / Verde Ávila (botón elegido en `AsignarMaterial`) | 9.71 |

Por la fila marcada con ✗, el texto que va **directo sobre el collage** (frase del encabezado, aviso de dónde se guardan las compras) usa `--color-text` y no `--color-text-muted`.

## Desviaciones del plan

| Plan | Implementado | Motivo |
| ---- | ------------ | ------ |
| `Modal` con prop `pie` | `Modal` + `CuerpoModal` + `PieModal` como hijos | El pie de `FilterModal` depende del estado del formulario; con hijos, el formulario envuelve cuerpo y pie |
| Tabla de Agregar compra como tarjetas solo en móvil | Tarjetas bajo **1100px** (2 columnas en tablet) | Con scroll horizontal, la lista del autocompletado quedaba recortada dentro de la tabla |
| Fecha del header en `--color-text-muted` | `--color-text` con peso 600 | `DESIGN_DECISIONS.md` (precedencia mayor): sobre material translúcido nunca texto atenuado. Se mantiene aunque el header ya no es translúcido: ahora va sobre el collage |
| — | Insignia del header oculta bajo 480px | Con logo + título + insignia, el título se truncaba |
| Estado `tocados` en la validación | Solo `errors` | Equivalente: `onBlur` siempre valida; `onChange` revalida solo si ya había error |

## Listas de compra (cambio de funcionalidad)

Ver [PLAN_LISTAS_COMPRA.md](PLAN_LISTAS_COMPRA.md).

| Tema | Decisión |
| ---- | -------- |
| Modelo | Compra `{ id, proveedor, fecha, categoria, materiales[] }` (antes `productos[]` con `precio`); `monto` es el total de la línea y el gasto es la suma. `api.js` sigue aceptando el formato anterior al leer |
| Página principal | `/` = Agregar compra; se eliminó `Inicio` (y `FilterModal`) |
| Varias compras | Un `BloqueCompra` por compra, cada uno con su Cancelar/Guardar; al guardar se vacía o se quita |
| Detalle | Modal (`DetalleLista`) con ver, editar (el mismo `BloqueCompra` con `plano`) y eliminar |
| Filtros | En línea, sin modal, en vivo. Mientras llega la respuesta se mantiene la tabla anterior (sin parpadeo de "cargando") |
| Fila clicable | Botón en la celda del proveedor con `::after` que cubre la fila: un solo control accesible por fila, con nombre descriptivo |
| Layout del bloque | Container query (`@container`, 760px): tabla o tarjetas según el ancho del bloque, igual en la página y en el modal |
| Datos previos | `depanas_compras` se migra una vez a `depanas_listas`, agrupando por proveedor y fecha |

## Catálogo y buscador tipo Excel

| Tema | Decisión | Por qué |
| ---- | -------- | ------- |
| Origen | Listas de las columnas Proveedor, Categoría, Material y Producto de `Datos De Panas.xlsx`; la categoría y el producto de cada material salen de sus filas de compras | Es lo que el negocio ya usaba |
| Dónde vive | Tabla `catalogo (tipo, nombre, categoria, producto)` con `UNIQUE (tipo, nombre COLLATE NOCASE)`. `db.js` la siembra desde `db/catalogo.js` cada vez que abre la base | `INSERT OR IGNORE` + completar solo lo vacío: no duplica ni pisa lo que el usuario asignó, y también siembra una base importada |
| Migración | Bases con `catalogo` sin `categoria`/`producto` reciben las columnas con `ALTER TABLE` | La base del equipo ya tenía la tabla de la primera versión |
| Copia en el frontend | `CATALOGO` en `api.js` repite el catálogo para el modo local | El modo local no tiene servidor; los dos se mantienen iguales a mano |
| Opciones | Solo el catálogo, sin repetir mayúsculas/minúsculas y en orden alfabético en español (`localeCompare('es')`). Cada compra guardada registra lo suyo en el catálogo | Un proveedor nuevo aparece al guardarlo, y lo eliminado en Configuración no vuelve (ver abajo) |
| Material que ya estaba en compras | Al completar la base por primera vez, toma la categoría y el producto de su fila más reciente | Las compras viejas o importadas no piden asignación de nuevo |
| Búsqueda | Coincide en cualquier parte, sin tildes ni mayúsculas (`textoBusqueda` en `utils/formato.js`, que conserva la longitud para resaltar) | Como el buscador de Excel 365; "jamon" encuentra "Jamón de Pavo" |
| Valores nuevos | Se aceptan: el campo no obliga a elegir de la lista | El negocio compra cosas nuevas |

## Categoría y producto por material

| Tema | Decisión |
| ---- | -------- |
| Modelo | La categoría y el producto son del **material**, no de la compra (como en el Excel). Cada fila de `ingresos` guarda su `categoria`; la de la compra queda como respaldo |
| Cuándo se pide | Al elegir un material de la lista, al salir del campo o, si falta alguno, al guardar. Si el material ya tiene categoría o producto, ese campo no se muestra |
| Guardar después | Si la ventana se abrió al guardar, al confirmarla se reintenta el guardado (`requestSubmit`); "Ahora no" cancela y avisa con un toast |
| "Ahora no" | Ese material no se vuelve a pedir al salir del campo (solo al guardar) |
| API | `PUT /api/catalogo/materiales/:nombre` responde qué se creó (`materialNuevo`, `categoriaNueva`, `productoNuevo`) para el mensaje de confirmación; reutiliza la escritura existente sin distinguir mayúsculas |
| Modo servidor | Tras asignar, la caché del catálogo se actualiza en el acto con la respuesta (el formulario la lee de forma síncrona) y luego se recarga |
| Importar JSON | La `categoria` de un material solo se incluye si viene: así el id derivado de compras exportadas antes no cambia y no se duplican |

## Collage, encabezado y logo

| Tema | Decisión | Por qué |
| ---- | -------- | ------- |
| Collage | Mosaico WebP sin costuras (1200 px, 136 kB) generado con las 17 ilustraciones de la pág. 10 del brandbook, en `body::before` fijo con `z-index: -1` | Una sola regla cubre todas las pantallas con fondo crema; lo que tiene fondo propio lo tapa |
| Opacidad | En CSS (`--patron-opacidad: 0.1`), no horneada en la imagen | Se ajusta sin regenerar el archivo |
| Header | Transparente arriba; fondo crema y sombra aparecen con `opacity` cuando `useScrollDetectado` detecta scroll. Sin `backdrop-filter` | El blur del collage dejaba una banda borrosa con borde marcado. Se anima solo `opacity`, como pide `DESIGN_DECISIONS.md` |
| Logo del menú | Arepa recortada de `logo-badge.png` (`/brand/arepa.png`, 192 px) junto al logotipo tipográfico, con la sombra Vinotinto de las letras | Pedido del cliente: el badge completo es ilegible a 40 px |

## Configuración del catálogo

| Tema | Decisión | Por qué |
| ---- | -------- | ------- |
| Fuente de las opciones | Solo la tabla `catalogo`. Cada compra guardada (formulario, `/api/ingresos`, importar JSON) registra su proveedor, materiales, categorías y productos con `registrarCompra` | Antes las opciones salían también de las compras: lo eliminado volvía a aparecer si alguna compra vieja lo usaba |
| Siembra | Catálogo del Excel + lo que ya hay en las compras, **una sola vez por base** (`PRAGMA user_version = 1`) | Si se sembrara en cada arranque, lo que el usuario elimina del Excel reaparecería. Una base importada de la versión anterior se completa al abrirla |
| Renombrar | Cambia el nombre en `catalogo` y en todas las filas de `ingresos` (sin distinguir mayúsculas). Una categoría o producto también se cambia en sus materiales | Pedido del cliente: "se actualizan en todos los datos" |
| Material | Editar su categoría y producto los cambia también en sus compras guardadas | Igual que arriba |
| Eliminar | Quita la opción; las compras conservan su texto. Una categoría o producto deja vacío ese campo en sus materiales, que lo vuelven a pedir al registrar una compra | Borrar historial de compras sería peor; la confirmación avisa cuántas compras o materiales la usan |
| Repetidos | Agregar o renombrar a un nombre que ya existe (sin distinguir mayúsculas) responde 409 | Fusionar dos opciones queda fuera de alcance |
| `uso` | `GET /api/catalogo` trae cuántas compras usan cada proveedor o material, y cuántos materiales cada categoría o producto | La lista y la confirmación de eliminar lo muestran |
| Rutas | `/configuracion/:seccion` (`proveedores`, `categorias`, `materiales`, `productos`) | El botón Atrás del navegador vuelve a la sección anterior |
| Móvil | Las cuatro opciones van en 2 columnas compactas; cada fila de la lista es una tarjeta | Que la lista quede a la vista |

## Conexión con SQLite

| Tema | Decisión | Por qué |
| ---- | -------- | ------- |
| Modo | WAL (`journal_mode = WAL`) con `busy_timeout = 5000` | Si otro programa (p. ej. DB Browser for SQLite) tiene la base ocupada, el servidor espera hasta 5 s en vez de fallar al instante |
| Consolidar el WAL | `consolidar()` en db.js: `wal_checkpoint(TRUNCATE)` al abrir y `wal_checkpoint(PASSIVE)` tras cada escritura exitosa (middleware de app.js) | Con WAL los datos viven en `depanas.db-wal` hasta cerrar la conexión o juntar ~4 MB, y `npm run dev` mata el proceso sin cerrarla. Se comprobó en la base real: `depanas.db` pesaba 4 KB y todo estaba en el `-wal`; copiar solo el `.db` a una USB se llevaba una base vacía |
| Apagado | `index.js` cierra la conexión con SIGINT/SIGTERM (Ctrl+C) | Un cierre ordenado deja el `-wal` vacío |
| Una conexión | `crearApp` guarda la conexión y la expone con `getDb()`; importar un `.db` la cierra, reemplaza el archivo y la reabre (con respaldo y restauración si falla) | Las rutas no guardan la conexión vieja después de importar |
| SQL dinámico | Los nombres de columna interpolados (`${tipo}`, `${campo}`) salen de listas fijas (`TIPOS`) validadas antes; los valores siempre van como parámetros `?` | Sin inyección SQL |
| Validación | `PUT /api/ingresos/:id` usa `validarCompra` igual que `/api/compras` | Antes aceptaba montos negativos y fechas como "ayer" |
| Excel | El archivo `.xlsx` del negocio **no** va en el repo (`.gitignore`); sus datos están en `backend/db/catalogo.js` | Solo hacen falta los datos |

## Exportar y Cargar datos

- **Exportar** (`/exportar`) arma el archivo en el navegador con `fetchListas({ fechaDesde, fechaHasta })`, así funciona igual con o sin servidor. CSV con BOM (Excel lee bien las tildes), coma como separador (configuración regional de El Salvador) y una fila por material con las columnas del Excel del negocio. El JSON tiene el formato que acepta `importar-json`.
- Un rango sin compras no descarga un archivo vacío: el botón se desactiva y lo dice.
- **Cargar** (`/cargar`) queda en construcción por pedido del cliente. La API `POST /api/db/importar` y `importar-json` y `importarDB()` en `api.js` siguen disponibles para cuando se haga la pantalla.

## Mensajes del sistema

- Todo texto que el sistema le dice al usuario vive en `frontend/src/utils/mensajes.js`, agrupado por tema (`ACCESO`, `COMPRA`, `VALIDACION`, `ASIGNACION`, `ESTADOS`, `DATOS`). Los mensajes con datos son funciones (`COMPRA.guardada(proveedor, n)`).
- Los tests importan los textos de ahí: cambiar una frase no rompe pruebas.
- La frase del encabezado cambia una vez al día (`fraseDelDia`, por día del año), no en cada recarga, para que la interfaz no "salte".

## Pendientes
- **Bundle:** el JS pasó de ~193 kB a ~339 kB (sin gzip), sobre todo por `motion`. Si importa, se puede cargar Motion de forma diferida.
- `npm audit` reporta vulnerabilidades en `esbuild` (dev) y `react-router` 6. Arreglarlas implica subir versiones mayores (fuera del alcance).
- Drawer móvil con gestos (`springConImpulso`, proyección de inercia) para una fase futura.
