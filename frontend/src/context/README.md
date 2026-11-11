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

## `DatosSinGuardarContext`

Avisa antes de perder datos sin guardar. `DatosSinGuardarProvider` va una sola vez, en `App`: `useBlocker` admite uno.

```jsx
const { intentarCerrar, cierreRef } = useCierreConAviso(alCerrar) // solo en una ventana: alCerrar={intentarCerrar} en su Modal
const aviso = useDatosSinGuardar({ sucio, registrar: () => formRef.current?.requestSubmit(), cierreRef })
// En el flujo de guardar: aviso.terminar(true | false), aviso.aceptar() al confirmar, aviso.cerrar() en el onClose
// aviso.descartar() cuando la persona ya confirmó que desecha los datos
const pedirSalida = usePedirSalida() // Cerrar sesión y Apagar: pedirSalida(() => abrirSuConfirmacion())
```

- Sin `registrar`, el aviso ofrece «Seguir aquí» en vez de «Registrar» (Exportar).
- Sin provider, los hooks no hacen nada: una pantalla se puede probar sola.
- `terminar(true)` y `descartar()` sueltan el formulario hasta que cambie `sucio`, porque `AnimatePresence` lo deja montado durante su salida. Si sigue abierto tras guardar, su `sucio` debe pasar a falso.

## `AuthContext`

```jsx
const { autenticado, usuario, sesion, esAdmin, tienePermiso, ingresar, salir } = useAuth()
await ingresar('Marta_02', 'DePanas#2026') // { ok: true, usuario } o { ok: false, error } (ACCESO.incorrecta o ACCESO.demasiadosIntentos)
tienePermiso('/catalogo')     // según utils/permisos.js
```

- `ingresar` es asíncrono: comprueba la contraseña con `iniciarSesion` de `services/api.js` (backend `POST /api/sesion` o, en modo local, `depanas_usuarios`). Las contraseñas solo existen como hash PBKDF2; el navegador nunca las tiene en el código.
- `App.jsx` muestra `PantallaContrasena` mientras `autenticado` sea `false`. La sesión (`{ usuario, nombre, rol, permisos, funciones, token }`) se guarda en `sessionStorage` (`depanas_sesion`): dura hasta cerrar la pestaña. Con servidor, el `token` va en cada pedido (`fijarTokenSesion` de `api.js`) y el servidor revisa los permisos en cada uno, así que un cambio del administrador se aplica en el acto; el menú lo refleja en el próximo inicio de sesión.
- "Cerrar sesión" (sidebar y barra inferior; no existe en la versión .zip, que solo apaga) llama a `salir()`, que también cierra la sesión en el servidor (`DELETE /api/sesion`), y avisa con un toast.
- Si el servidor rechaza el token (8 h sin uso, servidor reiniciado o usuario eliminado), `api.js` dispara `EVENTO_SESION_VENCIDA`: `AuthProvider` cierra la sesión y avisa con `ACCESO.sesionVencida`.
- Con servidor la seguridad es real (ver `backend/sesiones.js` y `backend/permisos.js`). En **modo local** (sin servidor) sigue siendo solo una barrera de interfaz.
