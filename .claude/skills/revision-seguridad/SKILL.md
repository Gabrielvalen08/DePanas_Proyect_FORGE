---
name: revision-seguridad
description: Revisión de seguridad de De Panas (sesiones con token, bloqueo por intentos, permisos por pantalla y función, contraseñas PBKDF2, validación de entradas, exportar/importar respaldos, versión .zip como sitio local). Úsala cuando se pida "revisar seguridad", "pruebas de seguridad", antes de cerrar el PR final, o ante cualquier cambio en autenticación, permisos, usuarios, carga de archivos o exportación. Da la lista de comprobaciones, dónde vive cada defensa y qué prueba la cubre.
---

# Revisión de seguridad (De Panas)

Reporta solo problemas reales y explotables, con archivo:línea, cómo se explota y la corrección. Escribe el resultado en `docs/revisiones/seguridad.md`.

## Modelo de amenazas

- **Quién**: un empleado con sesión que intenta hacer más de lo que le toca; alguien con acceso a la computadora del restaurante; una página web abierta en el mismo navegador que intenta hablarle al servidor local.
- **Qué se protege**: las compras y el catálogo (dinero del negocio), las contraseñas, los respaldos exportados.
- **Fuera de alcance**: ataques a la red pública (el servidor escucha solo en `127.0.0.1`/`::1`).

## Defensas actuales y dónde viven

| Defensa | Dónde | Prueba |
|---|---|---|
| Contraseñas PBKDF2-SHA256, 600 000 iteraciones, rehash al entrar | `backend/contrasenas.js`, `api.js` (WebCrypto en local) | `test/seguridad.test.js` |
| Sesión con token, vence tras 8 h sin uso | `backend/sesiones.js` | `test/seguridad.test.js` |
| 5 contraseñas malas → bloqueo 5 min (429), también si el usuario no existe | `backend/sesiones.js` | `test/seguridad.test.js` |
| Toda la API exige `Authorization: Bearer` (salvo health y entrar) | `backend/app.js` | `test/seguridad.test.js` |
| Permisos por pantalla y función, releídos en cada pedido | `backend/permisos.js` + `shared/usuarios.js` | `test/seguridad.test.js` |
| Requisitos de contraseña configurables | `shared/usuarios.js` (`faltaEnContrasena`) | `test/usuarios.test.js` |
| Hosts permitidos (frena DNS rebinding) en el .zip | `app.js` (`hostsPermitidos`) | `desktop/pruebas` |
| Validación de compras, catálogo y respaldos | `shared/compras-json.js`, `catalogo-json.js`, `proveedores.js` | `test/api.test.js`, `test/carga.test.js` |
| Importar `.db`: valida el archivo y guarda respaldo antes | `routes/db_export.js`, `db.js` (`esBaseDePanas`) | `test/api.test.js` |

## Lista de comprobación

### Autenticación
- [ ] Ninguna respuesta incluye el hash ni el token de otro usuario.
- [ ] El mensaje de error al entrar no revela si el usuario existe.
- [ ] Salir (`DELETE /api/sesion`) invalida el token en el servidor.
- [ ] Las contraseñas no se comparan con las de otros usuarios.

### Autorización
- [ ] Cada ruta nueva está en `permisos.js`; un empleado no puede llamarla con `fetch` directo.
- [ ] Una función solo cuenta si el usuario tiene su pantalla.
- [ ] El administrador no se puede eliminar ni degradar.

### Entradas
- [ ] El backend valida tipos, longitudes, montos y cantidades > 0, fechas y nombres (sin comas en productos).
- [ ] SQL siempre con parámetros.
- [ ] Ningún texto del usuario se inserta como HTML (`dangerouslySetInnerHTML` no se usa).
- [ ] Límite de tamaño del cuerpo y de los archivos subidos (`express.json`, `multer`).

### Archivos exportados y respaldos
- [ ] El respaldo `.db` y el JSON contienen hashes de contraseña (`.db`): documentar que se guardan en lugar seguro y no se envían por correo; el JSON de compras no lleva usuarios.
- [ ] Importar es todo o nada y deja respaldo de la base anterior.
- [ ] Los archivos temporales de subida (`tmp_uploads/`) se borran.

### Modo local (sin servidor)
- [ ] Es solo una barrera de interfaz: documentarlo, no venderlo como seguro.

### Dependencias
- [ ] `npm audit --omit=dev` en backend/ y frontend/ sin vulnerabilidades altas.

## Cómo probar

```bash
cd backend && npm test -- --test-name-pattern="seguridad|sesión|permiso"
cd frontend && npm run test:e2e -- e2e/acceso.spec.js
```

Para cada hallazgo nuevo, agrega su prueba en `backend/test/seguridad.test.js` antes de corregirlo.
