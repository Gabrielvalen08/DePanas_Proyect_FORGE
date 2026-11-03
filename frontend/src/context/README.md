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
await ingresar('Marta_02', '5678') // { ok: true, usuario } o { ok: false, error } (ACCESO.incorrecta o ACCESO.demasiadosIntentos)
tienePermiso('/catalogo')     // según utils/permisos.js
```

- `ingresar` es asíncrono: comprueba la contraseña con `iniciarSesion` de `services/api.js` (backend `POST /api/sesion` o, en modo local, `depanas_usuarios`). Las contraseñas solo existen como hash PBKDF2; el navegador nunca las tiene en el código.
- `App.jsx` muestra `PantallaContrasena` mientras `autenticado` sea `false`. La sesión (`{ usuario, nombre, rol, permisos, funciones, token }`) se guarda en `sessionStorage` (`depanas_sesion`): dura hasta cerrar la pestaña. Con servidor, el `token` va en cada pedido (`fijarTokenSesion` de `api.js`) y el servidor revisa los permisos en cada uno, así que un cambio del administrador se aplica en el acto; el menú lo refleja en el próximo inicio de sesión.
- "Cerrar sesión" (sidebar y barra inferior) llama a `salir()`, que también cierra la sesión en el servidor (`DELETE /api/sesion`), y avisa con un toast.
- Si el servidor rechaza el token (8 h sin uso, servidor reiniciado o usuario eliminado), `api.js` dispara `EVENTO_SESION_VENCIDA`: `AuthProvider` cierra la sesión y avisa con `ACCESO.sesionVencida`.
- Con servidor la seguridad es real (ver `backend/sesiones.js` y `backend/permisos.js`). En **modo local** (sin servidor) sigue siendo solo una barrera de interfaz.
