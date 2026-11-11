---
name: audit-as-repo-maintainer
description: Audita si un plan o un cambio respeta las convenciones del repo De Panas: código y textos en español, lugar de cada archivo, README por carpeta, mensajes.js, tokens de estilo, tests en los dos modos, lint, commits y documentación (CLAUDE.md, DESIGN_DECISIONS.md, docs/). Úsala cuando se pida "revisar convenciones", "revisar el orden del repo", o antes de hacer commit o abrir el PR.
---

# Auditoría como mantenedor del repo (De Panas)

Cada desvío parece pequeño; juntos vuelven el repo difícil de leer para el equipo y el profesor.

## Convenciones

- **Idioma**: código, nombres y textos en español. En la UI se dice "artículo"; en código/API/base, `material`.
- **Lugar**: páginas en `src/pages`, piezas en `src/components` (UI base en `common/`), hooks en `src/hooks`, formato en `src/utils/formato.js`, textos en `src/utils/mensajes.js`, reglas compartidas en `shared/`. Cada carpeta de `src/` tiene `README.md` con sus reglas: actualízalo si cambia.
- **Estilos**: `Componente.module.css`, solo tokens `--color-*`, sin `style={{}}`.
- **Íconos**: solo `lucide-react`.
- **Pruebas**: un cambio de datos lleva pruebas en `frontend/src/services/api.test.js` (los dos modos) y en `backend/test/`; una pantalla o flujo nuevo, su prueba en `e2e/` (textos importados de `mensajes.js`).
- **Lint**: `npm run lint` sin errores (ESLint 9, jsx-a11y strict, react-hooks v7).
- **Documentación**: si cambia una regla o un flujo descrito en `CLAUDE.md`, `DESIGN_DECISIONS.md` o `docs/`, se actualiza en el mismo cambio.
- **Git**: rama de trabajo aparte, commits pequeños y descriptivos en español (qué y por qué), sin archivos generados (`dist/`, `salida/`, `*.db`, `node_modules`).

## Qué buscar

- Código muerto, `console.log`, comentarios viejos, archivos temporales (`tmp_uploads/`, capturas sueltas).
- Funciones casi iguales en dos archivos.
- Textos de UI fuera de `mensajes.js`; hex sueltos en CSS.
- Pruebas que faltan para lo nuevo; pruebas que se borraron sin razón.
- Documentación que ya no dice la verdad.

## Formato del reporte

`docs/revisiones/auditoria-repo.md`: resumen, veredicto, problemas críticos, recomendaciones y una tabla **Convenciones** (convención, cumple, archivos que no cumplen).

## Calibración

Nunca se omite.
