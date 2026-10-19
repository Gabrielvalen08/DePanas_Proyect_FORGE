# components/common/

Biblioteca de componentes base. Todo lo visual de la app se arma con estas piezas. Se importan desde el índice:

```js
import { Boton, Campo, Selector, Tarjeta, Insignia, Modal, ConfirmDialog, CuerpoModal, PieModal, EstadoVacio, SelectorArchivo } from '../components/common'
```

| Componente    | Props principales                                                              |
| ------------- | ------------------------------------------------------------------------------ |
| `Boton`       | `variante` (`primario` · `secundario` · `fantasma` · `peligro` · `icono`), `tamano` (`sm` · `md`), `icono`, `cargando`, `sombra`, `ancho`, `a` (ruta → se renderiza como `Link`) |
| `Campo`       | `id`, `etiqueta`, `etiquetaOculta`, `tipo`, `prefijo`, `error`, `ayuda`, `children` (contenido extra dentro del control) |
| `Selector`    | `id`, `etiqueta`, `etiquetaOculta`, `opciones` (`string[]` o `{ valor, texto }[]`), `error` |
| `Tarjeta`     | `titulo`, `icono`, `accion`, `sombra`, `franja`, `interactiva` + `a` u `onClick` |
| `Insignia`    | `tono` (`neutro` · `marca` · `exito` · `aviso` · `error`)                       |
| `Modal`       | `abierto`, `alCerrar`, `titulo`, `icono`, `rol` (`dialog` · `alertdialog`), `anchoMax` (`sm` · `md`), `focoInicial` (ref) |
| `ConfirmDialog` | `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `danger`. Confirmación (`alertdialog`): el foco inicial va a «Cancelar», nunca a la acción. Úsalo antes de cualquier acción que guarde, cancele o elimine |
| `EstadoVacio` | `icono`, `titulo`, `texto`, `accion`, `cargando`                                |
| `SelectorArchivo` | `id`, `etiqueta`, `ayuda`, `accept`, `nombre`, `textoVacio`, `textoSoltar`, `disabled`, `onElegir(archivo)`; `ref` al input. En lugar del botón nativo de archivo, que no sigue la marca |

## Ejemplo: modal
```jsx
<Modal abierto={abierto} alCerrar={cerrar} titulo="Filtrar compras" icono={<SlidersHorizontal />}>
  <CuerpoModal>…campos…</CuerpoModal>
  <PieModal>
    <Boton variante="fantasma" onClick={cerrar}>Cancelar</Boton>
    <Boton variante="primario" type="submit">Aplicar</Boton>
  </PieModal>
</Modal>
```

## Convenciones
- Props en español; las props HTML nativas pasan con `...resto`.
- `Boton`, `Campo` y `Selector` reenvían `ref` (`forwardRef`) para poder enfocarlos.
- `Campo` y `Selector` siempre tienen `<label>`. `etiquetaOculta` la deja solo para lectores de pantalla (marca `data-etiqueta-oculta`, que una página puede volver visible en móvil).
- Cada componente tiene su `Componente.test.jsx`. Consulta por rol o texto (`getByRole`), nunca por clase.
- Alto mínimo de controles: `--alto-control` (44px).
