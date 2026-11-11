# Seguridad

Qué protege la app de compras de De Panas, cómo lo hace y qué prueba automática lo comprueba. Las pruebas se corren desde `backend/` con:

```bash
npm test
```

## Qué se protege y de quién

- **Qué:** las compras y el catálogo (el dinero del negocio), las contraseñas y los archivos de respaldo.
- **De quién:**
  - un usuario con sesión que intenta hacer más de lo que le toca;
  - alguien que usa la computadora del restaurante;
  - una página web abierta en el mismo navegador que intenta hablarle al servidor local.
- **Fuera de alcance:** ataques desde internet. El servidor solo escucha en la propia computadora (`127.0.0.1`).

## Controles y sus pruebas

| Control | Cómo funciona | Prueba |
|---|---|---|
| **Contraseñas con hash** | PBKDF2-SHA256 con 600 000 iteraciones y sal propia; un hash viejo se recalcula al entrar | `seguridad.test.js`: hash · `seguridad-datos.test.js`: la base exportada solo guarda hashes |
| **Bloqueo por intentos fallidos** | 5 contraseñas malas seguidas bloquean a ese usuario 5 minutos (429), también si el usuario no existe, para no revelar cuáles existen; entrar bien reinicia la cuenta | `seguridad.test.js`: intentos |
| **Sesión** | Token en cada petición; vence tras 8 h sin uso; salir lo invalida en el servidor | `seguridad.test.js`: sesión, 401 |
| **Permisos** | Cada ruta exige su pantalla o función (`permisos.js`), y el usuario se vuelve a leer en cada petición: quitarle algo se aplica en el acto | `seguridad.test.js`: permisos · `archivo.test.js`: archivar |
| **Validación de entradas** | El servidor valida todo aunque la interfaz ya lo haga: fechas reales, montos y cantidades mayores a 0, largos máximos, usuario y contraseña según las reglas, listas de ids | `seguridad-datos.test.js`: entradas |
| **Inyección SQL** | SQL siempre con parámetros (`?`): lo que escribe el usuario es texto, nunca código | `seguridad-datos.test.js`: inyección en filtros |
| **Errores sin detalles** | Un error inesperado se registra en el servidor; el usuario ve un mensaje genérico, sin SQL ni rutas. Un cuerpo mal formado responde 400 en JSON. Sin cabecera `X-Powered-By` | `seguridad-datos.test.js`: errores |
| **Archivos exportados** | Exportar exige sesión y la pantalla Exportar (un empleado no puede). El JSON de compras no lleva usuarios ni contraseñas; la base `.db` guarda solo hashes | `seguridad-datos.test.js`: exportar |
| **Respaldo antes de reemplazar** | Importar una base valida que sea de De Panas y guarda la actual en `depanas.respaldo.db`; si algo falla, la restaura. Solo con la pantalla Cargar datos | `seguridad-datos.test.js`: respaldo · `api.test.js`: importar |
| **Todo o nada** | Guardar una compra, cargar un respaldo o actuar sobre varias compras va en una transacción | `api.test.js`: un error de escritura deshace todo el lote |
| **Sitio web local (.zip)** | Solo responde a `localhost:4510`: frena el DNS rebinding | `seguridad.test.js`: hostsPermitidos |

## Recomendaciones para el cliente

- **Los respaldos se guardan en un lugar seguro**, como una memoria USB personal; no se envían por correo ni se suben a carpetas compartidas.
- **Cada persona usa su propio usuario.** Al dejar la computadora, se cierra el navegador; en la versión .zip, eso también apaga el sistema.
- **La contraseña inicial se cambia en el Gestor de usuarios.**
- **Modo local** (sin servidor): los permisos son solo una barrera de la interfaz. La versión para el cliente siempre trabaja con servidor.
