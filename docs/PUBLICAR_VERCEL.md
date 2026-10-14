# Publicar en Vercel (solo frontend, modo local)

Esta guía publica **solo el frontend**. Sin backend, la app entra sola en **modo local**: todo se guarda en el navegador (`localStorage`). El backend (Express + SQLite) se publicará después en un hosting con disco; ver [Pendiente](#pendiente-publicar-el-backend).

## Cómo funciona publicada

- `vercel.json` (raíz) instala y compila `frontend/` y sirve `frontend/dist`. Toda ruta va a `index.html`, así `/compras` o `/catalogo` abren bien al recargar.
- La app pregunta a `/api/health` si hay servidor. En Vercel esa ruta devuelve el HTML de la app, no `{ ok: true }`, así que `detectarModo()` elige **local**. No hay que configurar nada.
- La carpeta `shared/` se usa al compilar (Vercel clona el repo completo); no hay que moverla.
- No hay variables de entorno.

## Publicar (una sola vez)

Lo hace quien administre la cuenta de Vercel del equipo:

1. Entrar a [vercel.com](https://vercel.com) con la cuenta de GitHub que tenga acceso a `Gabrielvalen08/DePanas_Proyect_FORGE`.
2. **Add New → Project** e importar el repositorio.
3. Dejar **Root Directory** en la raíz del repo (no `frontend/`): `vercel.json` ya indica cómo compilar.
4. **Deploy**. Cada push a `main` vuelve a publicar; cada PR recibe su propia URL de vista previa.

Antes de publicar, para probar lo mismo que hará Vercel:

```bash
cd frontend && npm ci && npm run build && npm run preview
```

## Uso en el restaurante: reglas importantes

En modo local los datos viven **solo en el navegador donde se registraron**:

- **Un solo equipo y un solo navegador.** Otro equipo, otro navegador o una ventana de incógnito empiezan de cero y no ven las compras.
- **No borrar los datos del navegador** ("Borrar historial", "Datos de sitios", limpiadores). Eso borra todas las compras, el catálogo y los usuarios.
- **Respaldo cada semana:** Exportar datos → formato **Respaldo (.json)** → rango **Todo** → guardar el archivo en un lugar seguro (USB, Drive, correo). Es la única copia fuera del navegador.
- **Recuperar:** en el mismo equipo o en uno nuevo, Cargar datos → elegir el último `.json` → elegir todas → Cargar compras. Las que ya están se omiten y las que cambiaron se comparan antes de guardar.
- **El primer día:** entrar como administrador y, en el Gestor de usuarios, cambiar las contraseñas iniciales (`Cesar_01` y `Marta_02` están en el repositorio y en la pista de la pantalla de acceso).
- **Compras de ejemplo:** el navegador nuevo arranca con compras de prueba. Hay que eliminarlas desde Compras antes de registrar las reales, para que no sumen en los totales ni salgan en los respaldos.
- **Se necesita internet** para abrir la app (está en Vercel). Una vez abierta, guardar funciona aunque se corte.

## Pendiente: publicar el backend

Para compartir los datos entre equipos (computadora y tablet) hace falta el backend:

- **Dónde:** un hosting que conserve el disco para `depanas.db` (Render, Railway o Fly.io con volumen). En Vercel el disco se borra entre ejecuciones y se perderían los datos.
- **Conexión:** una regla en `vercel.json` que mande `/api/*` a la URL del backend, **antes** de la regla de `index.html`. Con eso `detectarModo()` pasa a **servidor** sin cambiar el frontend.
- **Seguridad, antes de publicarlo:** hoy ninguna ruta de la API pide sesión (tampoco `/api/usuarios`). Hay que exigir autenticación en el backend; si no, cualquiera con la URL lee, cambia o borra compras y usuarios.
- **Pasar los datos:** exportar el respaldo `.json` desde el navegador del restaurante y cargarlo en la versión con servidor (Cargar datos).
