# De Panas SV — Guía de instalación

Programa para registrar las compras de la cocina y administrar el catálogo (proveedores, categorías, artículos y productos).

- Se usa **en el navegador** (Chrome, Edge…), como una página web.
- Todo se guarda **en esta computadora** y **no necesita internet**.
- Funciona en **Windows 10 u 11 de 64 bits**.
- **No se instala:** se entrega en un archivo **`De Panas SV 1.2.0.zip`**.

## 1. Preparar (una sola vez)

1. **Si el .zip llegó por correo, WhatsApp, Drive o una descarga:**
   - clic derecho sobre el `.zip` → **Propiedades**;
   - abajo, marca **«Desbloquear»** → **Aceptar**.

   Sin este paso, Windows (*Smart App Control*) puede impedir que el sistema se abra. Si llegó en una memoria USB, no hace falta.
2. Clic derecho sobre el `.zip` → **Extraer todo…** Elige una carpeta que no se vaya a borrar, por ejemplo `Documentos`.
3. Queda una carpeta **De Panas SV** con:

   ```
   De Panas SV/
     Abrir De Panas SV.cmd   ← este se abre
     LEEME.txt
     node/                   (no tocar)
     app/                    (no tocar)
   ```

## 2. Abrir y apagar

- **Abrir:** doble clic en **`Abrir De Panas SV`**.
  - Una ventana negra aparece unos segundos y se cierra sola.
  - Se abre el navegador en **`http://localhost:4510`**, que se puede guardar en favoritos.
  - La primera vez queda un acceso directo **De Panas SV** en el escritorio; las siguientes veces se abre desde ahí.
- **Abrirlo otra vez** mientras está encendido solo abre otra pestaña.
- **Apagar:** dentro del sistema, en el menú, **«Apagar De Panas SV»** (pide confirmación).
- **Cerrar la pestaña o la ventana del navegador también lo apaga**, si ya entraste:
  - El navegador pregunta **«¿Salir del sitio?»**: **Salir** apaga y **Cancelar** se queda. Esa ventana es del navegador: el sistema no puede cambiarle el texto ni los botones.
  - Con varias pestañas abiertas con sesión, se apaga al cerrar la última.
  - **Recargar la página (F5) no lo apaga**, aunque el navegador haga una pregunta parecida.
  - En la pantalla de contraseña no pregunta ni se apaga: sigue encendido y el acceso directo lo retoma.
- **Cambiar de usuario:** apaga el sistema y vuelve a abrirlo. Esta versión no tiene «Cerrar sesión».
- Si el favorito no abre nada, es que está apagado: ábrelo con el acceso directo.

## 3. Entrar

La primera pantalla pide usuario y contraseña:

| Usuario | Contraseña | Qué puede hacer |
|---|---|---|
| `Cesar_01` | `DePanas#2026` | Administrador: todo, incluido el Gestor de usuarios |
| `Marta_02` | `DePanas#2026` | Operadora: todo menos el Gestor de usuarios |

- **Cambia estas contraseñas** desde **Gestor de usuarios** (solo el administrador).
- Tras **5 contraseñas incorrectas seguidas**, ese usuario debe esperar **5 minutos** antes de volver a intentar.
- La sesión dura mientras la pestaña esté abierta (hasta 8 horas sin uso). **Cada pestaña nueva pide entrar.**
- **Si vas a salir con datos sin guardar, el sistema avisa:** puedes elegir **«Registrar»** o **«Salir sin guardar»**.

### Versión de demostración

Para conocer el sistema sin tocar los datos reales, abre **«Abrir De Panas SV (demo)»**:

- Se abre aparte, en http://localhost:4511.
- Trae dos meses de compras de ejemplo, del 11 de septiembre al 11 de noviembre de 2026.
- Guarda todo en su propia carpeta, `%APPDATA%\De Panas SV\demo`.

Para empezar la demostración de cero, apágala y borra esa carpeta.

## 4. Dónde quedan los datos

Todo se guarda en un solo archivo, **fuera** de la carpeta del `.zip`:

```
%APPDATA%\De Panas SV\depanas.db
```

Para abrir esa carpeta, pega `%APPDATA%\De Panas SV` en la barra de direcciones del Explorador de archivos.

- **Mover, reemplazar o borrar la carpeta `De Panas SV` no borra los datos.**
- El sistema solo es accesible desde esta computadora: nadie más en la red puede entrar a los datos.
- Los archivos que se descargan (Excel, respaldos) van a la carpeta **Descargas** del navegador.
- Si algo falla al abrir, el detalle queda en `%APPDATA%\De Panas SV\registro.log`.

## 5. Respaldos (recomendado cada semana)

Cualquiera de estas dos formas sirve:

- **Desde el sistema:** en **Lista de compras**, menú **⋮ → Exportar datos**, elige **Respaldo (.json)** y guárdalo en una memoria USB o en la nube. Para recuperarlo: **⋮ → Cargar datos**.
- **Copiando el archivo:** primero **«Apagar De Panas SV»**; después copia `depanas.db` de la carpeta del punto 4 a una memoria USB.

En cada sección del Catálogo, el menú **⋮** también permite exportar a Excel y guardar o cargar un respaldo de esa sección.

## 6. Versión nueva

1. **«Apagar De Panas SV».**
2. Borra la carpeta `De Panas SV` vieja.
3. Haz los pasos del punto 1 con el `.zip` nuevo, en el mismo lugar.

Los datos se conservan, y el acceso directo del escritorio se actualiza solo la primera vez que se abre la versión nueva.

## 7. Quitar el sistema

1. **«Apagar De Panas SV».**
2. Borra la carpeta `De Panas SV` y el acceso directo del escritorio.
3. Para borrar también los datos, elimina la carpeta `%APPDATA%\De Panas SV` (¡haz antes un respaldo!).

## 8. Si algo falla

- **Windows dice que bloqueó el archivo o no pasa nada al abrirlo:** falta el paso 1.1, «Desbloquear». Borra la carpeta, desbloquea el `.zip` y vuelve a extraerlo.
- **«El puerto 4510 lo está usando otro programa»:** cierra ese programa o reinicia la computadora y vuelve a abrir De Panas SV.
- **Olvidaste la contraseña de un usuario:** el administrador la cambia desde el Gestor de usuarios.
- **Olvidaste la del administrador:** contacta al equipo de desarrollo.
