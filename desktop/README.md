# desktop/ — De Panas SV en un .zip para Windows

Arma **`dist/De Panas SV <versión>.zip`**: al descomprimirlo queda una carpeta con **`Abrir De Panas SV.cmd`**. Ese archivo levanta el sistema como **sitio web local** en `http://localhost:4510` y lo abre en el navegador predeterminado; los datos quedan en `%APPDATA%\De Panas SV\depanas.db`. La guía para el cliente está en [docs/INSTALACION_CLIENTE.md](../docs/INSTALACION_CLIENTE.md).

## Por qué un .zip con Node.js y no un .exe (Smart App Control)

Windows 11 con **Smart App Control** bloquea los ejecutables **sin firma digital**, sin ofrecer «Ejecutar de todas formas». Le pasó al instalador de Electron (1.1.0). Comprobado en la computadora de desarrollo, que tiene Smart App Control activado:

| Qué se abre | Resultado |
|---|---|
| `.exe` de Electron (sin firma) | ❌ bloqueado |
| `node.exe` oficial (firmado por **OpenJS Foundation**), aunque venga de internet | ✅ corre |
| `.cmd` o `.lnk` **marcado como descargado de internet** | ❌ bloqueado («extensión de archivo peligrosa de web») |
| `.cmd` o `.lnk` **sin esa marca** | ✅ corre |

Por eso:
- el `.zip` lleva el `node.exe` oficial **sin modificar**: copiarlo no cambia su firma, y `preparar.mjs` la comprueba;
- nuestro código va como archivos JavaScript, que no son ejecutables;
- el cliente **desbloquea el .zip** (Propiedades → «Desbloquear») antes de extraerlo, o lo recibe por USB, que no lleva la marca;
- `iniciar.mjs` crea un acceso directo en el escritorio que, por estar hecho en la computadora, nunca lleva la marca.

Para no depender del paso «Desbloquear» haría falta un lanzador `.exe` **firmado** con un certificado de firma de código, que tiene costo.

## Cómo funciona

- **`portable/`** es lo que va tal cual al `.zip`:
  - **`Abrir De Panas SV.cmd`** corre `node\node.exe app\iniciar.mjs` y solo hace una pausa si hubo un error.
  - **`app/iniciar.mjs`**:
    - si `http://localhost:4510/api/health` ya responde, abre otra pestaña;
    - si no, arranca `servidor.mjs` **oculto y aparte** (`detached`, `windowsHide`), espera a que responda y abre el navegador;
    - después crea o actualiza el acceso directo del escritorio;
    - avisa con un cuadro de mensaje si el puerto está ocupado o el servidor no arranca.
  - **`app/servidor.mjs`**:
    - `crearApp` de `backend/app.js` con `estaticos` (el frontend compilado), `hostsPermitidos` (`localhost`/`127.0.0.1`/`[::1]:4510`) y `apagar`;
    - escucha en `127.0.0.1` y `::1`;
    - los errores van a `%APPDATA%\De Panas SV\registro.log`.
- **«Apagar De Panas SV»:**
  - con la opción `apagar`, `/api/health` responde `{ apagable: true }` y existe `POST /api/apagar` (con sesión);
  - el frontend muestra el botón en el menú solo entonces (`puedeApagar()` de `api.js`) y, al apagar, queda `PantallaApagado`.
- **`scripts/preparar.mjs`** arma `salida/De Panas SV/`:
  1. compila el frontend;
  2. copia `portable/`, el `node.exe` que lo corre (exige Node ≥ 22.13 y la firma `Valid` de OpenJS Foundation), `backend/` sin pruebas ni bases, `shared/`, el frontend compilado, `backend/node_modules` (solo dependencias de producción) y el ícono;
  3. con `--zip`, comprime con `Compress-Archive`.

## Comandos (desde `desktop/`, en Windows)

| Comando | Qué hace |
|---|---|
| `npm install` | Instala lo que usan las pruebas (Playwright y `read-excel-file`) |
| `npm run preparar` | Arma `salida/De Panas SV/`, la carpeta lista para probar |
| `npm run dist` | Arma la carpeta y **`dist/De Panas SV <versión>.zip`** |
| `npm run test:escritorio` | Prueba con Playwright la carpeta armada (corre antes `npm run preparar`) |

La prueba (`pruebas/escritorio.spec.js`):
- abre el `.cmd` de verdad y comprueba que termina y que el servidor queda encendido;
- la API responde 401 sin sesión y 403 a otro `Host`;
- abrirlo otra vez no levanta otro servidor;
- con un Chromium de Playwright: entra, con Pepsi solo salen bebidas, registra una compra y la exporta a Excel;
- **«Apagar»** lo apaga, y al volver a abrir la compra sigue.

Variables **solo para pruebas**:
- `DEPANAS_DATOS`: carpeta de datos;
- `DEPANAS_PUERTO`: puerto;
- `DEPANAS_PRUEBA=1`: no abre el navegador, ni crea el acceso directo, ni muestra cuadros de mensaje.

## Versión nueva

Sube `version` en `package.json` y corre `npm run dist`. El cliente apaga el sistema, reemplaza la carpeta y sus datos se conservan.

## Notas

- `salida/` y `dist/` se generan y están en `.gitignore`.
- `npm audit` del backend: `body-parser` y `qs` tienen arreglo, que conviene aplicar cuando esas versiones cumplan 2 semanas (ver `docs/DECISIONS.md`). Después, volver a armar el `.zip`.
