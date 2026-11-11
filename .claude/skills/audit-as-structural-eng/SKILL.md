---
name: audit-as-structural-eng
description: Audita un plan o un cambio con la mirada de un arquitecto de sistemas para De Panas (frontend React, backend Express + SQLite, shared/ y la versión .zip de desktop/). Úsala cuando se pida "revisar la arquitectura", "revisar la estructura", o ante planes que agregan módulos, mueven código entre capas, cambian el modelo de datos o agregan algo transversal (permisos, archivo, sesiones). Atrapa reglas duplicadas que se separan, capas que se saltan y acoplamientos que hacen difícil el siguiente cambio.
---

# Auditoría como arquitecto (De Panas)

Piensas en la forma del sistema, no en el código de cada archivo.

## Las capas

```
frontend/src/pages, components  ──►  hooks, context  ──►  services/api.js  ──►  (servidor) /api/*  ──►  backend/routes  ──►  db.js  ──►  SQLite
                                                              │                                         │
                                                              └──── (local) localStorage                └──► permisos.js, sesiones.js
                         shared/  ◄── usado igual por api.js (modo local) y por el backend
desktop/  ──►  empaqueta backend + shared + frontend/dist + Node oficial  (sitio web local en :4510)
```

Reglas:
- Las páginas no conocen el transporte; solo `api.js`.
- Una regla de negocio (validar compra, permisos, IVA, productos, catálogo JSON) vive **una vez**, en `shared/`.
- El backend no importa nada del frontend; el frontend importa de `shared/` solo a través de `api.js` o `utils/`.
- `desktop/` no cambia la lógica: solo configura `crearApp` (estáticos, hosts, apagar).
- Los textos de la UI están en `utils/mensajes.js`; los del backend son mensajes de error con `campo`.

## Qué buscar

- ¿La función nueva duplica una regla que ya existe en `shared/` o en `db.js`?
- ¿Una pantalla llama a otra capa saltándose `api.js`?
- ¿Un cambio en el modelo de datos toca los dos modos, el backend, los respaldos JSON (`shared/compras-json.js`, `catalogo-json.js`) y la exportación?
- ¿Un concepto nuevo (p. ej. "compra duplicada") queda en un solo lugar de verdad, o se calcula distinto en el backend y en el modo local?
- ¿Los respaldos viejos siguen cargando? ¿Las bases viejas siguen abriendo?
- ¿La pieza nueva sigue la forma de las vecinas (fábrica `crearRutasX(getDb)`, página + componentes + `module.css`)?

## Trampas conocidas

1. **Regla en dos lugares**: el backend y el modo local se separan con el tiempo; a la segunda copia, muévela a `shared/`.
2. **Contexto que crece**: un contexto que guarda todo hace que cualquier cambio rerenderice la app.
3. **Estado del servidor duplicado**: la página guarda una copia y no se entera de cambios (por eso existe `EVENTO_ARTICULO_RENOMBRADO`).
4. **Material/artículo**: la interfaz dice "artículo", el código y la API dicen `material`; no mezclar en la misma capa.

## Formato del reporte

Escribe en `docs/revisiones/auditoria-estructura.md`: resumen, veredicto, problemas críticos (tabla), recomendaciones, y un **mapa de dependencias** del cambio: qué módulos nuevos aparecen, de quién dependen y quién depende de ellos, marcando cualquier flecha que vaya contra las capas de arriba.

## Calibración

- Cambio de un solo archivo sin módulos nuevos: se omite.
- Módulo nuevo, cambio de modelo o regla transversal: auditoría completa.
