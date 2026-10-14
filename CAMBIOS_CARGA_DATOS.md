# Actualización: exportar y cargar compras

Exportar datos y Cargar datos están en el menú principal (respetan los permisos existentes). La pantalla de exportación conserva su interfaz.

Cargar datos acepta el JSON de Exportar datos: valida la extensión, el contenido y todas las compras antes de mostrar la selección. Cada fila permite elegir una compra por proveedor, fecha y total. Se cargan todos sus materiales, cantidades, unidades, montos, categorías y productos; el monto corresponde al total de cada material según el modelo existente.

La carga agrega compras a las existentes y asigna identificadores internos nuevos. No se deduplican: volver a cargar una compra crea otra independiente. No reemplaza la base de datos.

La validación se comparte entre el servicio del frontend y el backend en shared/compras-json.js. El modo servidor usa una transacción SQLite; el modo local restaura compras y catálogo si el almacenamiento falla. Se muestran mensajes de éxito y error.

## Ejecución

Requiere Node.js >= 22.13. Desde backend: npm install y npm start. Desde frontend: npm install y npm run dev. Para usar solo almacenamiento local, ejecutar únicamente el frontend.

El ZIP contiene el código, los recursos originales, las pruebas y la compilación actualizada en frontend/dist. No incluye node_modules ni el historial de Git; las dependencias se instalan con los package-lock.json existentes. Mantener shared junto a backend y frontend.

## Validación

- Backend: 39 pruebas aprobadas.
- Frontend: 143 pruebas aprobadas.
- ESLint y compilación de producción aprobados.
- Navegador local: selección de una compra entre dos, guardado exitoso y revisión de sus materiales, cantidades, unidades y precios.
