# De Panas SV — Guía de instalación

Programa para registrar las compras de la cocina y administrar el catálogo (proveedores, categorías, artículos y productos). Funciona en una computadora con **Windows 10 u 11 de 64 bits** y **no necesita internet**.

## 1. Instalar

1. Copia el archivo **`De Panas SV Setup 1.0.0.exe`** a la computadora y ábrelo con doble clic.
2. Windows puede mostrar **«Windows protegió su PC»**. Pasa porque el instalador no tiene una firma digital comprada; el programa es el mismo. Para seguir:
   - toca **«Más información»**;
   - toca **«Ejecutar de todas formas»**.
3. Elige la carpeta de instalación (la que propone está bien) y toca **Instalar**.
4. Al terminar queda un acceso directo **De Panas SV** en el escritorio y en el menú Inicio.

## 2. Entrar

Al abrir el programa pide usuario y contraseña:

| Usuario | Contraseña | Qué puede hacer |
|---|---|---|
| `Cesar_01` | `DePanas#2026` | Administrador: todo, incluido el Gestor de usuarios |
| `Marta_02` | `5678` | Operadora: todo menos el Gestor de usuarios |

- **Cambia estas contraseñas** desde **Gestor de usuarios** (solo el administrador).
- Tras **5 contraseñas incorrectas seguidas**, ese usuario debe esperar **5 minutos** antes de volver a intentar.
- La sesión se cierra sola tras **8 horas sin uso**, y siempre al cerrar el programa.

## 3. Dónde quedan los datos

Todo se guarda en un solo archivo de esta computadora:

```
%APPDATA%\De Panas SV\depanas.db
```

Para abrir esa carpeta, pega `%APPDATA%\De Panas SV` en la barra de direcciones del Explorador de archivos.

- Los datos **no se borran** al cerrar el programa, al reinstalarlo ni al desinstalarlo.
- El programa solo es accesible desde esta computadora: nadie más en la red puede entrar a los datos.

## 4. Respaldos (recomendado cada semana)

Cualquiera de estas dos formas sirve:

- **Desde el programa:** en **Lista de compras**, menú **⋮ → Exportar datos**, elige **Respaldo (.json)** y guárdalo en una memoria USB o en la nube. Para recuperarlo: **⋮ → Cargar datos**.
- **Copiando el archivo:** con el programa **cerrado**, copia `depanas.db` de la carpeta del punto 3 a una memoria USB.

En cada sección del Catálogo, el menú **⋮** también permite exportar a Excel y guardar o cargar un respaldo de esa sección.

## 5. Desinstalar

Ve a **Configuración → Aplicaciones → Aplicaciones instaladas**, busca **De Panas SV** y elige **Desinstalar**.

La carpeta de datos (punto 3) se conserva. Para borrar también los datos, elimínala a mano después de desinstalar.

## 6. Si algo falla

- **«No se pudo abrir la aplicación»:** reinicia la computadora y vuelve a abrir el programa.
- **Olvidaste la contraseña de un usuario:** el administrador la cambia desde el Gestor de usuarios.
- **Olvidaste la del administrador:** contacta al equipo de desarrollo.
