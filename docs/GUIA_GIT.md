**Pasos para crear una rama y comprobar que estás trabajando en esa rama**



*Crear y cambiar a la nueva rama en un solo paso:*

git checkout -b <nombre-de-la-rama>

Explicación: Crea una nueva rama local con el nombre especificado y te cambia automáticamente a ella.



*Comprobar la rama actual:*

git branch

Explicación: Lista todas las ramas locales de tu repositorio y resalta con un asterisco (\*) y un color distinto la rama en la que estás posicionado.



**Comando para hacer el git pull**



*Descargar e integrar cambios remotos:*

git pull

Explicación: Descarga las últimas novedades del repositorio remoto (GitHub, GitLab, etc.) en la rama actual y las combina inmediatamente con tu código local.



**Pasos para subir mi avance al repositorio**



*Añadir los archivos modificados al área de preparación (staging):*

git add .

Explicación: Prepara todos los archivos modificados, creados o eliminados del directorio actual para incluir en el próximo commit.



*Registrar el commit con un mensaje descriptivo:*

git commit -m "Mensaje explicando los cambios"

Explicación: Guarda una foto (snapshot) de los cambios preparados en el historial local con un mensaje explicativo.



*Subir los cambios al repositorio remoto:*

git push -u origin <nombre-de-la-rama>

Explicación: Envía tus commits locales a la rama correspondiente en el servidor remoto. La bandera -u enlaza tu rama local con la remota para que en el futuro solo tengas que usar git push.



**Cómo revisar en qué rama estoy trabajando**



*Verificar el estado del repositorio y la rama actual:*

git status

Explicación: Muestra en la primera línea el nombre de la rama activa, además de informarte si hay archivos modificados sin guardar o commits pendientes por subir.



**Pasos para cambiar de rama en Git**



*Verificar las ramas disponibles:*

git branch

Explicación: Muestra la lista de ramas locales existentes para que confirmes el nombre exacto de la rama a la que deseas moverte.



*Cambiar a la rama deseada:*

git checkout <nombre-de-la-rama>

Explicación: Te mueve de la rama actual a la rama especificada, actualizando los archivos de tu espacio de trabajo para que coincidan con esa rama. (También puedes usar git switch <nombre-de-la-rama> en versiones recientes de Git).



*Confirmar el cambio de rama:*

git status

Explicación: Muestra en la primera línea el nombre de la rama en la que quedaste posicionado para asegurar que te moviste correctamente.

