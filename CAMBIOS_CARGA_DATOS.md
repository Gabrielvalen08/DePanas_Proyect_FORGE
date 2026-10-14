# Carga de compras y resolución de duplicados

## Uso

1. Exportar datos y Cargar datos permanecen en el menú, con sus permisos actuales.
2. Adjuntar el JSON exportado por De Panas. Se valida todo el archivo antes de ofrecer la selección.
3. Elegir las compras. Se muestra si cada una es nueva, idéntica o modificada.
4. Las idénticas se omiten automáticamente. Para las modificadas se muestra la compra guardada y la del archivo, con todos los atributos de sus materiales.
5. Las filas guardadas comienzan seleccionadas y las entrantes sin seleccionar. La compra final contiene exactamente las filas elegidas de ambos lados; cada fila conserva material, cantidad, unidad, monto, categoría y producto.
6. Elegir de cuál compra tomar el proveedor y la fecha, de manera independiente. Se conserva la categoría general de la compra guardada; cada material conserva su propia categoría.
7. Revisar la vista previa de la compra final y guardar. También se puede descartar una compra del archivo o volver a la selección sin guardar.
8. El resultado muestra compras cargadas, actualizadas, omitidas por duplicadas y descartadas/conservadas sin cambios.

No se puede guardar una compra sin materiales. Marcar una fila en ambos lados conserva ambas filas: la selección es explícita y no se eliminan materiales automáticamente.

## Identificación y datos anteriores

La detección utiliza el identificador original (origen_id cuando existe, id para respaldos anteriores). Ese identificador se conserva al importar, editar y reexportar; el identificador interno de la compra local sigue siendo independiente. Las compras locales nuevas reciben una identidad original UUID para evitar colisiones entre equipos.

La igualdad compara proveedor, fecha, categoría general y todos los atributos de cada material, ignorando identificadores internos y el orden de las filas. Dos compras con identificadores originales distintos no se deduplican aunque tengan el mismo contenido.

La versión anterior no guardaba el identificador original de las importaciones. No es posible recuperarlo con certeza: esas compras antiguas pueden no reconocerse la primera vez que se carga de nuevo su respaldo. No se borran ni se vinculan automáticamente por semejanza. Los identificadores numéricos de compras creadas en versiones antiguas tampoco garantizan unicidad entre equipos independientes; si coinciden con datos distintos, la comparación permite revisarlos antes de guardar.

Se rechazan archivos que repiten una identidad y situaciones con varias compras existentes asociadas a una misma identidad, para evitar actualizar una compra arbitrariamente.

## Arquitectura y guardado

La capa de datos sigue en frontend/src/services/api.js. shared/carga-compras.js contiene el análisis y la validación de decisiones que comparten ambos modos. Las decisiones envían índices de filas, no materiales arbitrarios.

SQLite agrega origen_id y compra_categoria mediante la migración automática de db.js, conserva el identificador interno al actualizar y guarda todo el lote en una transacción. El modo local restaura compras y catálogo si falla el almacenamiento. Si una compra cambia desde que se abrió la comparación, se rechaza la decisión y se debe volver a revisar. No se sobrescribe silenciosamente.

## Ejecución

Requiere Node.js >= 22.13. Desde backend: npm install y npm start. Desde frontend: npm install y npm run dev. Para usar solo almacenamiento local, ejecutar únicamente el frontend.

El ZIP incluye código, recursos, pruebas y la compilación actualizada en frontend/dist. No incluye node_modules ni el historial de Git. Mantener shared junto a backend y frontend.

## Verificación

46 pruebas del backend y 149 de la interfaz. Incluyen omisión por identidad, combinación de filas, elección de proveedor y fecha, descarte, selección vacía, datos inválidos, decisiones obsoletas, conservación de origen tras editar/reexportar y reversión ante fallos de guardado. ESLint y compilación de producción.

La revisión visual en navegador no se pudo completar porque se denegó el acceso a la copia local.
