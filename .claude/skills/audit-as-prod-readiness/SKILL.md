---
name: audit-as-prod-readiness
description: Audita si un plan o un cambio de De Panas está listo para la computadora del cliente: la versión .zip para Windows (Node oficial, sitio local en :4510, base en %APPDATA%), bases existentes que deben seguir abriendo, respaldos, recuperación de errores y uso real por César y Marta. Úsala cuando se pida "¿está listo para producción?", "auditar para entregar", o antes de armar el .zip o cerrar el PR final.
---

# Auditoría de preparación para producción (De Panas)

"Funciona en mi máquina" no cuenta. Producción es la computadora del restaurante: Windows 11 con Smart App Control, un usuario que no sabe qué es Node y una base con meses de compras reales.

## Qué revisar

### Datos del cliente
- ¿La base existente (`%APPDATA%\De Panas SV\depanas.db`) abre con el código nuevo? ¿La migración está probada?
- ¿Algo puede borrar o reescribir datos sin confirmación? ¿Hay respaldo antes de reemplazar (`depanas.respaldo.db`)?
- ¿Los respaldos JSON exportados con la versión anterior siguen cargando?

### Versión .zip (`desktop/`)
- ¿`npm run preparar` incluye los archivos nuevos (backend, shared, frontend/dist, node_modules)?
- ¿`npm run test:escritorio` pasa sobre la carpeta armada?
- ¿Un archivo nuevo depende de algo que solo existe en desarrollo (Vite, `DEPANAS_API`, puertos 3000/5173)?
- ¿Se apaga bien (menú «Apagar» y al cerrar la última pestaña)?

### Errores
- Si el backend falla, ¿el usuario ve un mensaje claro de `mensajes.js` y no pierde lo escrito?
- ¿Hay estados de carga y de vacío?

### Usuarios reales
- ¿César (admin) y Marta (operadora) pueden hacer lo nuevo con sus permisos? ¿Un empleado ve solo lo suyo?
- ¿Las contraseñas iniciales y migraciones de usuarios se aplican solas sin pisar cambios del cliente?

### Pruebas
- `backend: npm test`, `frontend: npm run test:run`, `npm run lint`, `npm run test:e2e` y `npm run build` pasan.

## Trampas conocidas

1. **Migración probada solo con base nueva**.
2. **Archivo nuevo fuera del .zip** porque `preparar.mjs` copia una lista fija.
3. **Ruta absoluta o variable de entorno de desarrollo** en el código final.
4. **`.cmd` bloqueado** si el cliente no desbloquea el .zip: documentado en `docs/INSTALACION_CLIENTE.md`.

## Formato del reporte

`docs/revisiones/auditoria-produccion.md`: resumen, veredicto, problemas críticos, recomendaciones y una **lista de entrega** (casilla por cada punto de arriba: cumple / no cumple / no aplica).

## Calibración

Nunca se omite.
