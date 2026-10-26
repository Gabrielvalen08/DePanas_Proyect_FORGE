# e2e/

Pruebas end-to-end con [Playwright](https://playwright.dev): un navegador real (Chromium) recorre la app completa como lo haría una persona, con el backend y una base de datos de verdad.

## Cómo correrlas

Desde `frontend/`:

```bash
npm install                       # trae @playwright/test (está en devDependencies)
npx playwright install chromium   # solo la primera vez (descarga el navegador)
npm run test:e2e                  # todas, sin ventana
npm run test:e2e -- --headed      # viendo el navegador
npm run test:e2e:ui               # modo interactivo: elegir, repetir y ver paso a paso
npx playwright show-report        # reporte de la última corrida
```

No hace falta tener `npm run dev` ni el backend abiertos: `playwright.config.js` levanta los suyos en otros puertos (backend 3100, Vite 5174).

## Base de datos

`servidor-pruebas.js` arranca el backend de siempre con `DEPANAS_DB` apuntando a `e2e/.tmp/e2e.db`, que se borra al empezar cada corrida. Cada corrida parte de los datos iniciales (catálogo del Excel, `Cesar_01` / `DePanas#2026` y `Marta_02` / `5678`) y **nunca toca `backend/db/depanas.db`**. Como todas las pruebas comparten esa base, corren una a la vez y cada una deja los datos como los encontró (lo que crea, lo elimina).

## Archivos

| Archivo | Qué prueba |
| --- | --- |
| `acceso.spec.js` | Pantalla de acceso, contraseña incorrecta, ver/ocultar contraseña, permisos de César y Marta (el menú: Agregar compra, Lista de compras, Catálogo, Gestor de usuarios), Cerrar sesión con confirmación, sesión al recargar |
| `navegacion.spec.js` | Cada botón del menú abre su pantalla con su título; Exportar y Cargar fuera del menú (se abren desde el ⋮ de Lista de compras y tienen Regresar); que la app use el servidor; rutas viejas (`/configuracion`, `/catalogo/materiales`) o inexistentes; secciones del Catálogo; "Saltar al contenido" |
| `compras.spec.js` | Validación, total, filas y bloques; artículos filtrados por las categorías del proveedor; registrar una compra (con confirmación), verla en Lista de compras, exportarla a Excel (.xlsx, leído con `read-excel-file`) y eliminarla |
| `catalogo.spec.js` | Agregar, renombrar y eliminar un proveedor; nombre vacío o repetido; exportar a Excel quitando un proveedor y cargar un respaldo eligiendo uno; buscador |
| `usuarios.spec.js` | Gestor de usuarios: requisitos de contraseña en vivo, usuario o contraseña repetidos; un empleado que registra compras pero no ve el Catálogo ni puede eliminarlas; darle el Catálogo solo para consultar; cambiar los requisitos |
| `movil.spec.js` | Proyecto `movil` (Pixel 7): barra inferior, hoja "Más" (Gestor de usuarios y Cerrar sesión), que nada se salga del ancho y que Marta no vea el gestor |
| `ayudantes.js` | `entrar(page, usuario)`, `menu(page)`, `confirmar(page, etiqueta)` (toda acción pasa por un `ConfirmDialog`), `salir(page)` y el vigilante de errores |

## Convenciones

- Importa `test` y `expect` de `./ayudantes.js`, no de `@playwright/test`: así cada prueba falla si la página lanza una excepción, escribe un error en la consola o el backend responde 5xx (o 404 en `/api`). Las respuestas 4xx esperadas (contraseña incorrecta, usuario repetido) no cuentan.
- Busca los elementos como los encuentra una persona o un lector de pantalla: `getByRole`, `getByLabel`, `getByText`. Nunca por clase CSS.
- Los textos se importan de `src/utils/mensajes.js`, igual que en las pruebas de Vitest: si cambia un mensaje, la prueba sigue al día.
- Lo que una prueba crea (compras, proveedores, usuarios) lleva un nombre propio (p. ej. `Luis_e2e`) y se elimina al final.
- Si una prueba falla, `test-results/` guarda la captura, el video y el trace (`npx playwright show-trace …`). Esas carpetas están en `.gitignore`.
