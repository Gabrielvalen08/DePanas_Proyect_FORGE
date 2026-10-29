# desktop/ — App de escritorio para Windows (Electron)

Empaqueta el sistema completo (backend + frontend compilado) en un instalador `.exe` para Windows 10/11 x64. La guía para el cliente está en [docs/INSTALACION_CLIENTE.md](../docs/INSTALACION_CLIENTE.md).

## Cómo funciona

- **`main.js`** (proceso principal de Electron):
  - importa `crearApp` de `app/backend/app.js` y lo levanta en **`127.0.0.1`** con un puerto libre;
  - abre una ventana con el frontend que sirve ese mismo servidor (opción `estaticos` de `crearApp`);
  - con una sola instancia: abrirla otra vez trae la ventana abierta;
  - los enlaces externos se abren en el navegador.
- **La base** va en `app.getPath('userData')`, es decir `%APPDATA%\De Panas SV\depanas.db`, nunca dentro de la app. El instalador no la borra al desinstalar.
- **`scripts/preparar.mjs`** compila el frontend y copia a `app/`:
  - `backend/`, sin pruebas, bases ni `node_modules`;
  - `shared/`;
  - el frontend compilado.

  Las dependencias del backend (`express`, `cors`, `multer`) están en este `package.json`, así que `import 'express'` desde `app/backend` las encuentra en `desktop/node_modules`.
- **Electron 44.7.2** trae Node 24, con `node:sqlite` estable: el backend corre tal cual, sin procesos aparte.

## Comandos (desde `desktop/`)

| Comando | Qué hace |
|---|---|
| `npm install` | Instala Electron, electron-builder y lo que usan las pruebas |
| `npm start` | Prepara `app/` y abre la app sin empaquetar |
| `npm run dist` | Prepara `app/` y arma **`dist/De Panas SV Setup <versión>.exe`** (NSIS x64, sin firma) |
| `npm run test:escritorio` | Prueba con Playwright la app sin empaquetar (corre antes `npm run preparar`) |

Para probar la app empaquetada, define `DEPANAS_EXE` con la ruta de `dist\win-unpacked\De Panas SV.exe` y corre `npm run test:escritorio`.

La prueba (`pruebas/escritorio.spec.js`):
- entra como Cesar_01;
- comprueba que con Pepsi solo salen bebidas y que la API responde 401 sin sesión;
- registra una compra y la exporta a Excel (lee el archivo);
- cierra, vuelve a abrir y comprueba que la compra sigue.

Usa una carpeta de datos temporal (`DEPANAS_DATOS`) y otra para las descargas (`DEPANAS_DESCARGAS`, que solo existe para las pruebas: sin ella sale el diálogo «Guardar como»).

## Versión nueva

1. Sube `version` en este `package.json`.
2. Corre `npm run dist`.
3. Al instalar la versión nueva sobre la anterior, los datos del cliente se conservan.

## Notas

- **Sin firma digital:** Windows muestra «Windows protegió su PC → Más información → Ejecutar de todas formas». Para quitar el aviso hace falta un certificado de firma de código.
- `app/`, `build/` (ícono generado desde `frontend/public/brand/icon-512.png`) y `dist/` se generan y están en `.gitignore`.
