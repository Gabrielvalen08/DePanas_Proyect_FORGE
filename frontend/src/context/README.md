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
const { autenticado, usuario, sesion, esAdmin, tienePermiso, ingresar, salir } = useAuth()
await ingresar('Marta_02', '5678') // { ok: true, usuario } o { ok: false, error: ACCESO.incorrecta }
tienePermiso('/configuracion')     // según utils/permisos.js
```

- `ingresar` es asíncrono: comprueba la contraseña con `iniciarSesion` de `services/api.js` (backend `POST /api/sesion` o, en modo local, `depanas_usuarios`). Las contraseñas solo existen como hash PBKDF2; el navegador nunca las tiene en el código.
- `App.jsx` muestra `PantallaContrasena` mientras `autenticado` sea `false`. La sesión (`{ usuario, nombre, rol, permisos }`) se guarda en `sessionStorage` (`depanas_sesion`): dura hasta cerrar la pestaña. Si el administrador cambia los permisos de alguien, se aplican en su próximo inicio de sesión.
- "Bloquear" (sidebar y barra inferior) llama a `salir()` y avisa con un toast.
- Sigue siendo una barrera de interfaz, **no** seguridad: la API no pide autenticación y la sesión vive en el navegador.
