# Revisión de seguridad: entrega final

**Fecha**: 25 de noviembre de 2026
**Alcance**: lo que entró a `main` desde la revisión del 11 de noviembre: la ronda de noviembre (Pedro P1–P6, Gabriel G1–G3, Alejandro A1–A5), sobre todo el rol **subadministrador**, más la lista de comprobación completa de la skill `revision-seguridad`.
**Modelo de amenazas**: un usuario con sesión (empleado, operador o subadministrador) que intenta hacer más de lo que le toca; alguien con acceso a la computadora del local; una página web abierta en el mismo navegador que intenta hablarle al servidor local.

## Resultado

**Sin problemas explotables abiertos.** Esta revisión encontró y corrigió uno; el aviso de `react-router` sigue documentado como no explotable.

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| 1 | `POST /api/db/importar` (reemplazar la base completa) pedía solo la pantalla Cargar datos. Un **operador** o un **subadministrador** podía subir una base armada por él con otra contraseña para el administrador y quedarse con su cuenta. `GET /api/db/exportar` (la base completa) también les daba los hashes de todas las contraseñas | Alta (escalada de privilegios) | **Corregido**: las dos rutas son solo del administrador (regla `'principal'` en `backend/permisos.js`). La interfaz no las usa; las compras en JSON siguen con Exportar y Cargar. Prueba nueva en `seguridad-datos.test.js` («la base completa (.db) solo la exporta o reemplaza el administrador»), que fallaba antes del arreglo |
| 2 | La ayuda de la contraseña en Nuevo usuario decía «Distinta a la de los demás usuarios.», que no es cierto: el sistema no compara contraseñas entre usuarios, a propósito | Baja (texto engañoso) | **Corregido** en `mensajes.js` |
| 3 | `react-router` 6.30.6: dos avisos (redirección abierta con barra invertida en `<Link>`/`useNavigate`; inyección al hidratar errores en SSR) | Moderada en el aviso; **no explotable aquí** | Sin cambios desde el 11 de noviembre: todos los destinos de navegación son rutas fijas del código y la app no usa renderizado en servidor. El arreglo exige pasar a React Router 7 (cambio mayor) |

## El subadministrador

| Comprobación | Resultado | Dónde |
|---|---|---|
| No edita ni elimina al administrador, tampoco con `fetch` directo | 403 | `dao/usuarios.js` (`editar`, `eliminar`) · `usuarios.test.js` |
| No crea subadministradores ni da ese rol | 403 | `validarRol` con `rolesQueAsigna` · `usuarios.test.js` · `usuarios.spec.js` |
| No edita ni elimina a otro subadministrador | 403 | `puedeGestionar` · `usuarios.test.js` |
| En su propio perfil cambia nombre y contraseña, no su rol | Se ignora el cambio de acceso | `dao/usuarios.js` (`propio`) · `usuarios.test.js` |
| No reemplaza la base para cambiar la contraseña del administrador | 403 (hallazgo 1) | `permisos.js` · `seguridad-datos.test.js` |
| Bases viejas con el CHECK sin `subadmin` | `migrarUsuarios` rehace la tabla y conserva las funciones | `usuarios.test.js` |

Puede cambiar los requisitos de contraseña: es parte de «gestionar todo», como se acordó con el cliente el 12 de noviembre.

## Lista de comprobación

### Autenticación
- [x] Ninguna respuesta incluye el hash ni el token de otro usuario (`publico()` en `dao/usuarios.js`).
- [x] El error al entrar no revela si el usuario existe; el bloqueo de 5 intentos cuenta también usuarios inexistentes.
- [x] Salir invalida el token en el servidor; eliminar un usuario cierra sus sesiones.
- [x] Las contraseñas no se comparan con las de otros usuarios (y la ayuda ya no dice lo contrario).

### Autorización
- [x] Todas las rutas están en `permisos.js`; lo que no está es solo del administrador o el subadministrador.
- [x] La base completa (.db) es solo del administrador (hallazgo 1).
- [x] Una función solo cuenta si el usuario tiene su pantalla.
- [x] El administrador no se elimina ni se degrada, tampoco por el subadministrador.
- [x] Las unidades del artículo: `PUT /api/catalogo/materiales/:nombre` sin `catalogo.editar` solo completa lo que falta (403 si cambia la unidad ya asignada).

### Entradas
- [x] El backend valida tipos, largos (120), montos y cantidades > 0, fechas reales y **no futuras**, unidades de la lista (`shared/unidades.js`) y nombres de producto sin comas.
- [x] SQL siempre con parámetros.
- [x] Ningún texto del usuario se inserta como HTML (no hay `dangerouslySetInnerHTML` ni `innerHTML`).
- [x] Límites de tamaño: `express.json` 50 MB (413 en JSON), `multer` 200 MB, lotes de hasta 5 000 ids.

### Archivos exportados y respaldos
- [x] El JSON de compras no lleva usuarios; la base `.db`, con hashes, solo la descarga el administrador.
- [x] Importar es todo o nada y deja `depanas.respaldo.db`.
- [x] Las subidas temporales se borran en `finally`.

### Privacidad
- [x] La app no hace pedidos fuera de la computadora (`e2e/navegacion.spec.js`).

### Modo local (sin servidor)
- [x] Documentado como barrera de interfaz, no como seguridad.

### Dependencias
- [x] Backend y versión .zip: `npm audit --omit=dev` sin vulnerabilidades.
- [~] Frontend: solo los dos avisos de `react-router` del hallazgo 3.

## Cómo se probó

```bash
cd backend && npm test                      # 151 pruebas, incluida la nueva de la base completa
cd frontend && npm run test:e2e             # acceso, permisos, subadministrador y «ningún pedido externo»
cd backend && npm audit --omit=dev          # 0 vulnerabilidades
```

Las salidas completas están en el [reporte de pruebas](../pruebas/index.html).

---

# Revisión anterior (11 de noviembre de 2026)

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
