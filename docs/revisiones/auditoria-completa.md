# Auditoría completa: cierre de De Panas (rama `mejoras-entrega-final`)

**Fecha**: 11 de noviembre de 2026
**Modo**: rama contra `main` (revisión de PR)
**Fuente**: `mejoras-entrega-final` (25 commits, 99 archivos de código; sin contar skills, documentación ni imágenes)
**Lentes**: 9 de 9
**Lentes omitidas**: ninguna (la rama toca interfaz, backend, `shared/`, la versión .zip y la documentación)

**Alcance real.** Se leyeron completos los archivos nuevos del backend (`dao/`, `routes/responder.js`, `routes/usuarios.js`, `routes/db_export.js`, `db/demo.js`), los cambios de `app.js`, `db.js`, `permisos.js` y `desktop/portable/app/`, y en el frontend `PantallaMaestra`, `PantallaNoEncontrada`, `Header`, `AutocompleteInput`, `AgregarCompra`, `Tarjeta`, `utils/exportar.js`, `services/api.js` (modo local de compras y usuarios) y las pruebas nuevas. De `BloqueCompra` (formulario por pasos) se revisaron la lógica de pasos y su prueba, no cada línea de estilo.

---

## Veredicto general: APROBAR CON CAMBIOS

No hay nada que impida entregar: el refactor a DAO deja el SQL fuera de las rutas, los errores inesperados ya no muestran detalles, quitar el Archivo dejó el código y la base consistentes, y la suite completa pasa. Los cambios pedidos son de cierre: rehacer y probar el .zip con lo nuevo (fuentes locales, sin Archivo), cabeceras de seguridad en el servidor, dos detalles de la lista paginada (anuncio para lector de pantalla y memoria del orden) y dejar al día las cifras de pruebas.

## Veredicto por lente

| # | Lente | Veredicto | Críticos | Recomendaciones |
|---|-------|-----------|----------|-----------------|
| 1 | Diseño | Aprobar | 0 | 1 |
| 2 | Experiencia de uso | Aprobar con cambios | 0 | 3 |
| 3 | Frontend | Aprobar con cambios | 0 | 3 |
| 4 | Backend | Aprobar con cambios | 0 | 2 |
| 5 | Estructura | Aprobar | 0 | 2 |
| 6 | Mantenimiento del repo | Aprobar con cambios | 0 | 3 |
| 7 | Listo para el cliente | Aprobar con cambios | 0 | 3 |
| 8 | Rendimiento | Aprobar con cambios | 0 | 2 |
| 9 | Accesibilidad | Aprobar con cambios | 0 | 2 |

## Problemas críticos (hay que arreglarlos)

Ninguno.

## Preocupaciones que cruzan varias lentes

| Preocupación | La señalan | Causa | Arreglo único |
|---|---|---|---|
| El .zip no se ha vuelto a armar desde quitar el Archivo y empaquetar las fuentes | Listo para el cliente, Repo, Backend | Los cambios se probaron con Vite y el backend de desarrollo, no con la carpeta armada | `npm run preparar` + `npm run test:escritorio` y abrir la demo (fase de chequeo) |
| La lista trae todas las compras y las pagina en el navegador | Rendimiento, Frontend, Estructura | Paginación en el cliente por tiempo (decisión documentada) | Memorizar el orden ahora; paginar en el servidor solo si un día son miles |
| Sin cabeceras de seguridad HTTP | Backend, Listo para el cliente | `app.js` nunca las tuvo | Agregar `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy` en `crearApp` |

## Todas las recomendaciones

**Aplicadas en esta misma revisión:** R2 (cabeceras, con prueba en `seguridad-datos.test.js`), R3 (Enter solo completa si la opción empieza igual, con prueba), R4, R5, R6 (con prueba) y R10. **En las fases siguientes:** R1 (prueba del .zip), R7 (cifras) y R8 (limpieza). **Se quedan así:** R9, R11 y R12.

| # | Recomendación | Lente | Archivo(s) | Arreglo |
|---|---|---|---|---|
| R1 | Rehacer y probar el .zip (normal y demo) con las fuentes locales y sin Archivo | Listo para el cliente | `desktop/` | `npm run preparar`, `npm run test:escritorio`, abrir la demo |
| R2 | Cabeceras de seguridad | Backend, Listo para el cliente | `backend/app.js` | CSP `default-src 'self'` (con `style-src 'self' 'unsafe-inline'` por Motion), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, con prueba |
| R3 | Enter en el buscador completa la mejor coincidencia aunque solo «contenga» lo escrito: quien escribe un nombre nuevo que es parte de otro («Selecto» con «Selectos» registrado) puede elegir el existente sin querer | Experiencia de uso | `components/AutocompleteInput.jsx` | Marcar de entrada solo si la opción empieza igual o una de sus palabras empieza igual (nivel ≤ 2) |
| R4 | El cambio de página no se anuncia al lector de pantalla | Accesibilidad | `pages/PantallaMaestra.jsx` | `aria-live="polite"` en «1–50 de 380» |
| R5 | El orden de la lista se recalcula en cada render (cada casilla) | Rendimiento, Frontend | `pages/PantallaMaestra.jsx` | `useMemo` sobre `listas` |
| R6 | Eliminar cuenta también compras elegidas en otras páginas, que no se ven | Experiencia de uso | `pages/PantallaMaestra.jsx`, `mensajes.js` | Decirlo en la confirmación («incluye N de otras páginas») |
| R7 | Cifras de pruebas del README y del sitio quedaron viejas (hay pruebas e2e nuevas) | Repo | `README.md`, `docs/sitio/` | Ponerlas al día con la corrida final |
| R8 | Archivos que no deberían ir en el repo (capturas de antes y después, `Claude outputs/`) | Repo | `docs/capturas/`, `docs/img/`, raíz | Fase de limpieza |
| R9 | `api.js` usa `eslint-disable` para soltar campos viejos | Frontend | `services/api.js` | Aceptable; alternativa: función `sinCamposViejos` |
| R10 | Las bases de desarrollo conservan la columna `compra_archivo` sin uso | Backend | `db.js`, `docs/MODELO_DATOS.md` | Anotarlo en Migraciones (no hace falta borrarla: SQLite la ignora) |
| R11 | La paginación vive dentro de la página | Estructura | `pages/PantallaMaestra.jsx` | Si otra tabla la necesita, sacarla a `hooks/usePaginacion` |
| R12 | En Exportar del teléfono el pie fijo tapa media opción «Respaldo (.json)» hasta bajar | Diseño | `PantallaExportar.module.css` | Aceptable (se ve al bajar); alternativa: formatos en dos columnas |

---

# Reportes por lente

---

## 1. Diseño

**Veredicto**: APROBAR

| Archivo | Qué se revisó |
|---|---|
| `PantallaMaestra.module.css` | Páginas, aviso de selección, casillas |
| `Header.module.css` | Regresar solo con flecha bajo 480 px |
| `PantallaExportar.module.css` | Pie fijo en el teléfono |
| `tokens.css` | `--tabla-*`, `--color-seleccion` |
| `PantallaNoEncontrada.jsx` | Uso de `Tarjeta` + `EstadoVacio` |

**Cumplimiento del sistema de diseño.** Todo usa tokens semánticos (`--color-seleccion`, `--color-surface`, `--sombra-flotante`); no hay hex sueltos ni `style={{}}`. Las fuentes de la marca ahora van dentro de la app, así que la tipografía se ve igual sin internet (antes, en el local sin red, caía a `system-ui` y Georgia).

**Estados visuales.**

| Pieza | Normal | Elegida | Vacía | Cargando | Error | Teléfono |
|---|---|---|---|---|---|---|
| Lista de compras | ✓ | ✓ (fila crema) | ✓ con «Agregar compra» | ✓ | toast | ✓ tarjetas |
| Páginas | ✓ | — | oculta con ≤ 50 | — | — | ✓ baja de línea |
| No encontrada | ✓ | — | — | — | — | ✓ |
| Exportar | ✓ | — | ✓ «Ver todas las fechas» | ✓ | ✓ | ✓ pie fijo |

**Recomendación**: R12.

---

## 2. Experiencia de uso

**Veredicto**: APROBAR CON CAMBIOS

**Recorridos.**

| Recorrido | Pasos | Resultado |
|---|---|---|
| Registrar una compra | Fecha y proveedor → fila → total y Guardar | Claro; lo que no toca no se ve |
| Encontrar una compra vieja | Lista → flechas o Filtrar | Claro; el manual lo explica |
| Eliminar varias | Casillas → papelera → confirmar con cantidad | Claro; ver R6 con varias páginas |
| Dirección mal escrita | Pantalla «No encontrada» → Volver al inicio | Antes llevaba al inicio sin avisar |
| Exportar en el teléfono | Rango → Descargar fijo abajo | Antes había que bajar |

**Consistencia.** Toda acción destructiva sigue confirmándose; los estados vacíos ahora ofrecen la acción siguiente; Regresar se comporta igual en todas las pantallas.

**Recomendaciones**: R3, R6. **Opcional**: en «No encontrada» mostrar la dirección escrita.

---

## 3. Frontend

**Veredicto**: APROBAR CON CAMBIOS

**Ruta de render de la Lista.** `fetchListas(filters)` en un efecto con descarte de respuestas viejas (`vigente`) → `setListas` desde la promesa (cumple react-hooks v7) → orden y página calculados en render. `cambiarFiltros` vuelve a la página 1 desde el callback, no con un efecto. `paginaActual` se acota en render, así que eliminar la última página no deja la tabla vacía.

**Datos.** Las páginas no llaman `fetch` ni `localStorage`; todo pasa por `api.js`. El modo local suelta los campos del Archivo de compras guardadas antes y una prueba lo cubre.

**Recomendaciones**: R5, R9. **Opcional**: R11.

---

## 4. Backend

**Veredicto**: APROBAR CON CAMBIOS

**Caminos de error.**

| Origen | Antes | Ahora |
|---|---|---|
| Dato no válido en un DAO | `res.status(400)` en cada ruta | `ErrorDatos` → `responder` (400/403/404/409 con `campo`) |
| Error de SQLite o disco | Detalle técnico al usuario | Registro en consola + 500 genérico |
| JSON mal formado o muy grande | Página HTML de Express | 400/413 en JSON |
| Ruta de `/api` que no existe | HTML «Cannot GET» | 404 en JSON |
| Contraseña mala | 401 | 401, y 429 tras 5 (sin cambio) |

**Ciclo de vida de recursos.**

| Recurso | Abre | Cierra | Bien |
|---|---|---|---|
| Copia para exportar `.db` | `copiaConsistente` | `borrarSiExiste` en el callback y en el error | ✓ |
| Subida de `.db` (multer) | carpeta temporal | `finally` | ✓ |
| Base de la demo en `servidor.mjs` | `abrirDB` | `finally db.close()` | ✓ |
| Transacciones de lote y respaldos | `enTransaccion` | commit o rollback | ✓ |

**Migraciones.** Quitar el Archivo no rompe bases que ya tienen `compra_archivo` (las inserciones nombran sus columnas). La migración de Marta corre una sola vez por base. Las funciones guardadas con `compras.archivar` desaparecen al leerlas (`funcionesEfectivas` solo devuelve funciones conocidas).

**Recomendaciones**: R2, R10.

---

## 5. Estructura

**Veredicto**: APROBAR

**Mapa de dependencias.** rutas → `responder` → DAO → `db.js`/SQLite; las reglas compartidas viven en `shared/` (`gastos.js`, `lote.js`, `usuarios.js`, `carga-compras.js`) y las usan igual el backend y `api.js`. No hay rutas que escriban SQL.

**Cruces de capas.** Ninguna página habla con el backend directo; `navegacion.js` importa textos de `mensajes.js` sin ciclo (`mensajes.js` no importa nada).

**Recomendaciones**: R11. **Opcional**: el demo (`db/demo.js`) depende del DAO de compras, bien; mantenerlo fuera del arranque normal como está.

---

## 6. Mantenimiento del repo

**Veredicto**: APROBAR CON CAMBIOS

| Convención | Cumple |
|---|---|
| Código y textos en español | ✓ |
| Textos para el usuario en `mensajes.js` | ✓ (incluye los de páginas, «No encontrada» y estados vacíos) |
| Un `README.md` por carpeta al día | ✓ (`pages/`, `e2e/`) |
| Tokens, sin `style={{}}` | ✓ |
| Pruebas en los dos modos de `api.js` | ✓ |
| Commits pequeños en español con prefijo | ✓ |
| `CLAUDE.md` y `DESIGN_DECISIONS.md` al día | ✓ |
| Cifras de pruebas en la documentación | ✗ (R7) |
| Nada sobrante en el repo | ✗ (R8) |

**Recomendaciones**: R7, R8.

---

## 7. Listo para el cliente

**Veredicto**: APROBAR CON CAMBIOS

**Modos de falla.**

| Falla | Qué pasa | Bien |
|---|---|---|
| Sin internet en el local | Todo funciona; ahora también la tipografía | ✓ |
| Base de una versión anterior | Migra al abrir; el Archivo viejo se ignora | ✓ |
| Cerrar la pestaña | Se apaga a los 5 s; F5 no apaga | ✓ (sin cambio) |
| Abrir la demo y la real a la vez | Puertos 4510 y 4511, carpetas distintas | ✓ |
| Error inesperado | Se anota en `registro.log` y el usuario ve un mensaje genérico | ✓ |

**Entorno.** Node oficial firmado, `%APPDATA%\De Panas SV`, sin cambios de puertos. El manual viaja con sus fuentes (`docs/manual/fuentes/`).

**Recomendaciones**: R1, R2, R7.

---

## 8. Rendimiento

**Veredicto**: APROBAR CON CAMBIOS

| Recurso | Hoy | Con 2 años de compras (~1 000) | Comentario |
|---|---|---|---|
| `GET /api/compras` | 44 compras demo | ~1 000 compras, ~200 KB | Aceptable en local |
| Render de la lista | 50 filas por página | 50 filas | La paginación limita el DOM |
| Orden de la lista | En cada render | 1 000 elementos por clic de casilla | R5 |
| Fuentes | 6 archivos woff2 (~90 KB) | igual | Solo el subconjunto latino |
| Excel | `write-excel-file` se carga al exportar | igual | ✓ |

**Recomendaciones**: R5; paginar en el servidor solo si la lista pasa de varios miles.

---

## 9. Accesibilidad

**Veredicto**: APROBAR CON CAMBIOS

**Teclado.** Casillas alcanzables con Tab; «Elegir todas» con estado a medias (`indeterminate`); flechas de página son botones con `aria-label` y quedan desactivadas en los extremos; el aviso «Elegir las 380» es un botón. Regresar solo con flecha conserva su nombre (`aria-label`).

**ARIA.**

| Elemento | Estado |
|---|---|
| `nav` de páginas con `aria-label` | ✓ |
| Rango «1–50 de 380» | ✗ no se anuncia al cambiar (R4) |
| Aviso de selección `role="status"` | ✓ |
| Contador de la tarjeta `aria-live` | ✓ |
| «No encontrada»: `h1`, `main#contenido` | ✓ |
| Estados vacíos con botón real | ✓ |

**Recomendaciones**: R4, y revisar R3 (Enter elige sin que el lector lo anuncie si la lista no está abierta: hoy sí se anuncia porque la lista se abre al escribir).
