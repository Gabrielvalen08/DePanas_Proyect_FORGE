# context/

Estado global compartido por React Context.

## `ToastContext`

```jsx
const { addToast } = useToast()
addToast(COMPRA.eliminada)                          // éxito
addToast(COMPRA.errorGuardar(error.message), 'error') // error
// Los textos salen de utils/mensajes.js
```

- Dos regiones vivas permanentes: los éxitos se anuncian en `role="status"` (polite) y los errores en `role="alert"` (assertive).
- Cierre automático a los 3.5 s, que se pausa con hover o foco. Botón de cerrar accesible.
- Entran y salen por el mismo borde: derecha en escritorio, arriba en móvil (abajo está la barra de navegación).
- **No** uses un toast como único aviso de un error de formulario: los errores van junto al campo (ver `AgregarCompra`).

## `AuthContext`

```jsx
const { autenticado, ingresar, salir } = useAuth()
ingresar('1234') // { ok: true } o { ok: false, error: ACCESO.incorrecta }
```

- `App.jsx` muestra `PantallaContrasena` mientras `autenticado` sea `false`. La sesión se guarda en `sessionStorage` (`depanas_autenticado`): dura hasta cerrar la pestaña.
- "Bloquear" (sidebar y barra inferior) llama a `salir()` y avisa con un toast.
- Es una barrera de interfaz para el local, **no** seguridad: la contraseña está en el código del navegador y la API no pide autenticación.
