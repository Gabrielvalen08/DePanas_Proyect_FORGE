# context/

Estado global compartido por React Context.

## `ToastContext`

```jsx
const { addToast } = useToast()
addToast('Compra eliminada correctamente')        // éxito
addToast('Error al guardar las compras', 'error') // error
```

- Dos regiones vivas permanentes: los éxitos se anuncian en `role="status"` (polite) y los errores en `role="alert"` (assertive).
- Cierre automático a los 3.5 s, que se pausa con hover o foco. Botón de cerrar accesible.
- Entran y salen por el mismo borde: derecha en escritorio, arriba en móvil (abajo está la barra de navegación).
- **No** uses un toast como único aviso de un error de formulario: los errores van junto al campo (ver `AgregarCompra`).
