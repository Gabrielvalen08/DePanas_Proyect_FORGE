# Revisión de seguridad: cierre de la rama `mejoras-entrega-final`

**Fecha**: 11 de noviembre de 2026
**Alcance**: todo lo que cambia la rama contra `main` (capa DAO, Archivo quitado, eliminar varias, páginas, «No encontrada», fuentes locales, demo) más la lista de comprobación de la skill `revision-seguridad`.
**Modelo de amenazas**: un empleado con sesión que intenta hacer más de lo que le toca; alguien con acceso a la computadora del local; una página web abierta en el mismo navegador que intenta hablarle al servidor local.

## Resultado

**Sin problemas explotables abiertos.** Se corrigieron dos cosas durante la revisión y una tercera queda documentada:

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| 1 | `body-parser` (DoS con cuerpos comprimidos, alta) y `qs` (DoS, moderada) en el backend | Alta / moderada | **Corregido** con `npm audit fix` (sin cambio de versión mayor). `npm audit --omit=dev`: 0 vulnerabilidades |
| 2 | El servidor no mandaba cabeceras de seguridad | Baja (defensa en profundidad) | **Corregido**: CSP solo con lo propio, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (`backend/app.js`, prueba en `seguridad-datos.test.js`) |
| 3 | `react-router` 6.30.6: dos avisos (redirección abierta con barra invertida en `<Link>`/`useNavigate`; inyección al hidratar errores en SSR) | Moderada en el aviso; **no explotable aquí** | Documentado. Todos los destinos de navegación son rutas fijas del código (`navegacion.js`, `useRegresar`, `rutaInicio`), nunca texto del usuario ni de la URL, y la app no usa renderizado en servidor. El arreglo exige pasar a React Router 7 (cambio mayor): queda para después |

## Lista de comprobación

### Autenticación
- [x] Ninguna respuesta incluye el hash ni el token de otro usuario (`publico()` en `dao/usuarios.js`; el token solo vuelve a quien entra).
- [x] El error al entrar no revela si el usuario existe («Usuario o contraseña incorrectos», y el bloqueo de 5 intentos cuenta también usuarios inexistentes).
- [x] Salir (`DELETE /api/sesion`) invalida el token en el servidor; eliminar un usuario cierra sus sesiones.
- [x] Las contraseñas no se comparan con las de otros usuarios.

### Autorización
- [x] Ruta nueva `POST /api/compras/eliminar` en `permisos.js` con la función `compras.eliminar`; un empleado recibe 403 (`lote.test.js`).
- [x] La ruta de archivar ya no existe (404 en JSON, `lote.test.js`); la función `compras.archivar` guardada en bases viejas no da nada (`funcionesEfectivas` solo devuelve funciones conocidas).
- [x] Una función solo cuenta si el usuario tiene su pantalla.
- [x] El administrador no se elimina ni se degrada.
- [x] «Pantalla no encontrada» no abre nada sin permiso: una pantalla que existe y no se tiene sigue llevando al inicio (`App.test.jsx`).

### Entradas
- [x] El backend valida tipos, largos (120), montos y cantidades > 0, fechas reales y nombres de producto sin comas.
- [x] SQL siempre con parámetros. Los únicos SQL armados con texto (`dao/catalogo.js`, `db.js`) usan nombres de columna de la lista blanca `TIPOS` (`tipoValido`) o marcas `?` generadas.
- [x] Ningún texto del usuario se inserta como HTML (no hay `dangerouslySetInnerHTML` ni `innerHTML`).
- [x] Límites de tamaño: `express.json` 50 MB (413 en JSON), `multer` 200 MB, lotes de hasta 5 000 ids (`shared/lote.js`).

### Archivos exportados y respaldos
- [x] El `.db` exportado lleva hashes de contraseña (nunca contraseñas); el JSON de compras no lleva usuarios. El manual («Tus datos y su privacidad») pide guardar los respaldos en lugar seguro.
- [x] Importar es todo o nada y deja `depanas.respaldo.db`.
- [x] Las subidas temporales se borran en `finally`; la copia para exportar, en el callback de la descarga.

### Privacidad
- [x] La app no hace pedidos fuera de la computadora: las fuentes de la marca dejaron de pedirse a Google Fonts (`e2e/navegacion.spec.js` lo vigila). Con la CSP nueva, además, el navegador bloquearía cualquier recurso externo.

### Modo local (sin servidor)
- [x] Documentado como barrera de interfaz, no como seguridad (`docs/SEGURIDAD.md`, `CLAUDE.md`).

### Dependencias
- [x] Backend: `npm audit --omit=dev` sin vulnerabilidades.
- [~] Frontend: solo los dos avisos de `react-router` del hallazgo 3 (no explotables aquí).

## Cómo se probó

```bash
cd backend && npm test                      # 132 pruebas, incluidas las de cabeceras y lotes
cd frontend && npm run test:e2e             # acceso, permisos y «ningún pedido externo»
cd backend && npm audit --omit=dev          # 0 vulnerabilidades
```

**Pendiente de comprobar con la carpeta armada:** que la CSP no bloquee nada de la app compilada (Vite de desarrollo no manda la cabecera). Se verifica en la prueba del .zip.
