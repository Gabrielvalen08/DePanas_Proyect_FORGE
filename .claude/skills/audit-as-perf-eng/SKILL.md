---
name: audit-as-perf-eng
description: Audita el rendimiento de un plan o un cambio en De Panas: consultas SQLite, tamaño de las respuestas de la API, listas largas en React, memoria en sesiones de un día entero y arranque de la versión .zip en una computadora modesta. Úsala cuando se pida "auditar rendimiento", "¿será rápido?", o ante planes que agregan consultas, listas, filtros, archivo de compras, importaciones grandes o escuchas de eventos.
---

# Auditoría de rendimiento (De Panas)

La app corre en la computadora del restaurante (Windows, navegador, Node local) y queda abierta todo el día. Con meses de compras, la Lista de compras tiene que seguir abriendo rápido; para eso existe el Archivo.

## Qué medir

- **SQLite**: ¿la consulta usa índices (`EXPLAIN QUERY PLAN`)? ¿Se filtra en SQL o se traen todas las filas para filtrar en JavaScript? ¿Hay N+1 (una consulta por compra)?
- **API**: ¿la respuesta trae solo lo que se muestra? ¿`GET /api/compras` crece sin límite con el tiempo?
- **React**: ¿una lista de cientos de filas se rehace al escribir en un filtro? ¿Hay `useMemo`/`memo` donde el cálculo es caro? ¿Las claves son estables?
- **Memoria**: ¿un `addEventListener`, temporizador o suscripción se limpia al desmontar? ¿Las sesiones y pestañas en memoria del backend se vencen?
- **Escrituras**: `consolidar()` corre tras cada escritura; ¿un proceso en lote escribe fila por fila en vez de en una transacción?
- **Carga inicial**: ¿se agrega una dependencia pesada al bundle principal? ¿Se puede cargar al usarla?

## Proceso

1. Lee el plan o el diff.
2. Estima volúmenes reales: ~1 compra por día con 5–30 artículos → ~10 000 filas al año.
3. Para cada consulta o lista nueva, piensa en ese volumen.
4. Si hay duda, mide: base de prueba con datos de demostración y el tiempo de la petición.

## Trampas conocidas

1. **Filtrar en el cliente**: funciona con 50 compras y se arrastra con 2000.
2. **La lista crece sin tope**: la Lista de compras pagina de 50 en el cliente, pero la API devuelve todas las compras filtradas; con miles de compras, medir antes de agregar más trabajo por compra.
3. **Escuchas que no se limpian**: con la app abierta 8 horas se acumulan.
4. **Importar fila por fila sin transacción**: lento y no es todo o nada.

## Formato del reporte

`docs/revisiones/auditoria-rendimiento.md`: resumen, veredicto, problemas críticos, recomendaciones y una tabla **Volumen esperado** (operación, filas hoy, filas en un año, costo estimado, riesgo).

## Calibración

- Cambios de texto o estilo: se omite.
- Consultas, listas, filtros, importaciones o escuchas nuevas: auditoría completa.
