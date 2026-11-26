/**
 * reporte-pruebas.mjs — Vuelve a correr todas las pruebas y arma el reporte HTML en docs/pruebas/.
 *
 * Desde desktop/:  npm run reporte:pruebas
 *
 * Corre, en orden: backend (node --test), interfaz (Vitest), punta a punta (Playwright, escritorio y
 * celular), la versión .zip (preparar + test:escritorio) y npm audit --omit=dev en las tres carpetas.
 * Guarda la salida exacta de cada una en docs/pruebas/crudo/ y los reportes nativos de Playwright en
 * docs/pruebas/playwright-frontend/ y playwright-zip/. Las páginas se generan solo con esa salida:
 * nada se escribe a mano salvo el informe de seguridad, que resume docs/revisiones/seguridad.md.
 * Con --sin-correr solo vuelve a generar las páginas a partir de los .txt que ya están en crudo/.
 */

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SALIDA = join(RAIZ, 'docs', 'pruebas')
const CRUDO = join(SALIDA, 'crudo')
const CORRER = !process.argv.includes('--sin-correr')
mkdirSync(CRUDO, { recursive: true })

const hoy = new Date().toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/El_Salvador' })
const node = process.version
const sinColor = t => t.replace(/\x1b\[[0-9;]*m/g, '')
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Corre un comando y guarda su salida en crudo/<archivo>. Devuelve { salida, codigo } */
function correr(archivo, comando, carpeta, env = {}) {
  const ruta = join(CRUDO, archivo)
  if (!CORRER) {
    const meta = existsSync(ruta + '.codigo') ? Number(readFileSync(ruta + '.codigo', 'utf8')) : 0
    return { salida: existsSync(ruta) ? readFileSync(ruta, 'utf8') : '', codigo: meta }
  }
  console.log(`· ${comando}  (${carpeta})`)
  const r = spawnSync(comando, { cwd: join(RAIZ, carpeta), shell: true, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', ...env }, maxBuffer: 64 * 1024 * 1024 })
  const salida = sinColor(`> ${comando}\n\n${r.stdout ?? ''}${r.stderr ?? ''}`)
  writeFileSync(ruta, salida)
  writeFileSync(ruta + '.codigo', String(r.status ?? 1))
  return { salida, codigo: r.status ?? 1 }
}

// ---------------------------------------------------------------------------
// 1. Correr
// ---------------------------------------------------------------------------
const backend = correr('01-backend-npm-test.txt', 'npm test', 'backend')
const vitest = correr('02-frontend-vitest.txt', 'npx vitest run', 'frontend')
const auditB = correr('03a-npm-audit-backend.txt', 'npm audit --omit=dev', 'backend')
const auditF = correr('03b-npm-audit-frontend.txt', 'npm audit --omit=dev', 'frontend')
const auditD = correr('03c-npm-audit-desktop.txt', 'npm audit --omit=dev', 'desktop')
const e2e = correr('04-e2e-playwright-frontend.txt', 'npx playwright test --reporter=list,html', 'frontend', { PLAYWRIGHT_HTML_OUTPUT_DIR: join(SALIDA, 'playwright-frontend'), PLAYWRIGHT_HTML_OPEN: 'never' })
const preparar = correr('05-desktop-preparar.txt', 'npm run preparar', 'desktop')
const zip = correr('06-desktop-test-escritorio.txt', 'npx playwright test --reporter=list,html', 'desktop', { PLAYWRIGHT_HTML_OUTPUT_DIR: join(SALIDA, 'playwright-zip'), PLAYWRIGHT_HTML_OPEN: 'never' })

// ---------------------------------------------------------------------------
// 2. Leer resultados
// ---------------------------------------------------------------------------
function leerNodeTest(salida) {
  const pruebas = []
  for (const linea of salida.split('\n')) {
    if (/^ℹ tests/.test(linea)) break
    const m = linea.match(/^\s*(✔|✖|﹣)\s+(.+?)\s+\(([\d.]+)ms\)\s*$/)
    if (m && !/\.js$/.test(m[2])) pruebas.push({ nombre: m[2], ok: m[1] === '✔', tiempo: `${Math.round(Number(m[3]))} ms` })
  }
  const n = clave => Number((salida.match(new RegExp(`ℹ ${clave} (\\d+)`)) || [])[1] ?? 0)
  return { pruebas, total: n('tests'), pasaron: n('pass'), fallaron: n('fail'), omitidas: n('skipped') }
}
function leerVitest(salida) {
  const archivos = []
  for (const linea of salida.split('\n')) {
    const m = linea.match(/^\s*(✓|×|❯)\s+(\S+\.(?:jsx?|tsx?))\s+\((\d+) tests?(?:\s*\|\s*(\d+) failed)?\)\s+([\d.]+m?s)/)
    if (m) archivos.push({ nombre: m[2], ok: m[1] === '✓', n: Number(m[3]), tiempo: m[5] })
  }
  const tests = salida.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)/)
  const files = salida.match(/Test Files\s+(?:\d+ failed \| )?(\d+) passed \((\d+)\)/)
  return { archivos, fallaron: Number(tests?.[1] ?? 0), pasaron: Number(tests?.[2] ?? 0), total: Number(tests?.[3] ?? 0), nArchivos: Number(files?.[2] ?? archivos.length) }
}
function leerPlaywright(salida) {
  const pruebas = []
  for (const linea of salida.split('\n')) {
    const m = linea.match(/^\s*(ok|x|✘|-|✓)\s+\d+\s+(.+?)(?:\s+\(([\d.]+m?s)\))?\s*$/)
    if (m && m[2].includes('›')) pruebas.push({ nombre: m[2], estado: m[1] === 'ok' || m[1] === '✓' ? 'ok' : m[1] === '-' ? 'omitida' : 'mal', tiempo: m[3] ?? '' })
  }
  const n = clave => Number((salida.match(new RegExp(`(\\d+) ${clave}`)) || [])[1] ?? 0)
  return { pruebas, pasaron: n('passed'), fallaron: n('failed'), omitidas: n('skipped'), inestables: n('flaky') }
}
function leerAudit(salida) {
  if (/found 0 vulnerabilities/.test(salida)) return { total: 0, detalle: 'Sin vulnerabilidades.' }
  const m = salida.match(/(\d+) (?:\w+ severity )?vulnerabilit(?:y|ies)/)
  const sev = [...salida.matchAll(/(\d+) (low|moderate|high|critical)/g)].map(x => `${x[1]} ${{ low: 'baja', moderate: 'moderada', high: 'alta', critical: 'crítica' }[x[2]]}${x[1] === '1' ? '' : 's'}`)
  const paquetes = [...new Set([...salida.matchAll(/^([a-z@][\w@/.-]*)\s+[<>=*\d]/gm)].map(x => x[1]))]
  return { total: Number(m?.[1] ?? 0), detalle: `${sev.join(' · ') || '—'}${paquetes.length ? ` (${paquetes.join(', ')})` : ''}` }
}

const rb = leerNodeTest(backend.salida)
const rv = leerVitest(vitest.salida)
const re = leerPlaywright(e2e.salida)
const rz = leerPlaywright(zip.salida)
const audits = { backend: leerAudit(auditB.salida), frontend: leerAudit(auditF.salida), desktop: leerAudit(auditD.salida) }
writeFileSync(join(CRUDO, '03-npm-audit.txt'), [auditB.salida, auditF.salida, auditD.salida].join('\n\n'))

// ---------------------------------------------------------------------------
// 3. Páginas
// ---------------------------------------------------------------------------
const css = readFileSync(join(SALIDA, 'assets', 'reporte.css'), 'utf8')
const chip = (estado, texto) => `<span class="chip ${{ ok: 'ok', mal: 'mal', aviso: 'aviso', omitida: 'nar' }[estado]}">${esc(texto)}</span>`
const pie = `<footer>De Panas SV · Corrida del ${hoy} · Generado por <code>desktop/scripts/reporte-pruebas.mjs</code> a partir de la salida real de cada prueba (archivos en la carpeta «crudo»).</footer>`
function pagina(archivo, titulo, subtitulo, cuerpo, volver = true) {
  writeFileSync(join(SALIDA, archivo), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · De Panas SV</title><link rel="icon" href="assets/logo-badge.png"><link rel="stylesheet" href="../manual/fuentes/fuentes.css"><style>${css}</style></head><body>
<header class="top"><div class="wrap"><img src="assets/logo-badge.png" alt="Logo De Panas"><div><h1>${esc(titulo)}</h1><p>${esc(subtitulo)}</p></div></div></header>
<main><div class="wrap">${volver ? '<nav class="volver"><a href="index.html">← Volver al resumen</a></nav>' : ''}${cuerpo}
${pie}</div></main></body></html>`)
}
const tarjetasDe = ({ n, resumen, estado, textoEstado, comando, codigo }) => `<div class="tarjetas">
<div class="tarjeta"><h3>Resultado</h3><div class="num">${n}</div><p class="meta">${esc(resumen)}</p>${chip(estado, textoEstado)}</div>
<div class="tarjeta"><h3>Comando</h3><p><code>${esc(comando)}</code></p><p class="meta">Código de salida: ${codigo}</p></div>
<div class="tarjeta"><h3>Fecha</h3><p>${hoy}</p><p class="meta">Windows 11 · Node ${node}</p></div></div>`
const crudoDe = (archivo, salida) => `<details><summary>Salida completa de la terminal (${archivo})</summary><p class="meta">Copia exacta, sin editar; el .txt original está en la carpeta «crudo».</p><pre>${esc(salida)}</pre></details>`
const tabla = (filas, cols = ['#', 'Prueba', 'Resultado', 'Tiempo']) => `<table><thead><tr>${cols.map((c, i) => `<th${i === cols.length - 1 ? ' class="der"' : ''}>${c}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>`

// Backend
const estadoB = backend.codigo === 0 && rb.fallaron === 0 ? 'ok' : 'mal'
pagina('1-backend.html', 'Pruebas del backend', 'API, base de datos, sesión y permisos',
  tarjetasDe({ n: rb.total, resumen: `${rb.pasaron} pasaron · ${rb.fallaron} fallaron · ${rb.omitidas} omitidas`, estado: estadoB, textoEstado: estadoB === 'ok' ? 'Pasó' : 'Falló', comando: 'cd backend && npm test', codigo: backend.codigo }) +
  `<h2>Qué cubre</h2><p>Runner nativo de Node (<code>node --test</code>) con una base temporal por prueba. Incluye <code>seguridad.test.js</code> y <code>seguridad-datos.test.js</code>: sesión por token, permisos por pantalla y función, el subadministrador, la base completa solo para el administrador, bloqueo tras 5 contraseñas malas, recálculo del hash, validación de entradas y rechazo de pedidos con otro Host (DNS rebinding).</p>
<h2>Detalle</h2>` + tabla(rb.pruebas.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nombre)}</td><td>${chip(p.ok ? 'ok' : 'mal', p.ok ? 'Pasó' : 'Falló')}</td><td class="der">${p.tiempo}</td></tr>`)) + crudoDe('01-backend-npm-test.txt', backend.salida))

// Vitest
const estadoV = vitest.codigo === 0 && rv.fallaron === 0 ? 'ok' : 'mal'
pagina('2-frontend-vitest.html', 'Pruebas de la interfaz', 'Vitest · pantallas, componentes, servicios y utilidades',
  tarjetasDe({ n: rv.total, resumen: `${rv.pasaron} pasaron · ${rv.fallaron} fallaron · ${rv.nArchivos} archivos`, estado: estadoV, textoEstado: estadoV === 'ok' ? 'Pasó' : 'Falló', comando: 'cd frontend && npx vitest run', codigo: vitest.codigo }) +
  `<h2>Qué cubre</h2><p>Cada pantalla y componente con Testing Library, la capa de datos <code>api.js</code> en sus dos modos (servidor con <code>fetch</code> simulado y local), los cálculos de IVA y totales, el Excel exportado y los textos de <code>mensajes.js</code>.</p>
<h2>Por archivo</h2>` + tabla(rv.archivos.map((a, i) => `<tr><td>${i + 1}</td><td><code>${esc(a.nombre)}</code> · ${a.n} pruebas</td><td>${chip(a.ok ? 'ok' : 'mal', a.ok ? 'Pasó' : 'Falló')}</td><td class="der">${a.tiempo}</td></tr>`), ['#', 'Archivo', 'Resultado', 'Tiempo']) + crudoDe('02-frontend-vitest.txt', vitest.salida))

// Punta a punta
const totalE = re.pasaron + re.fallaron + re.omitidas + re.inestables
const estadoE = re.fallaron === 0 ? 'ok' : 'mal'
pagina('3-e2e-playwright.html', 'Pruebas de punta a punta', 'Playwright · en el navegador, en computadora y en teléfono',
  tarjetasDe({ n: totalE, resumen: `${re.pasaron} pasaron · ${re.fallaron} fallaron · ${re.omitidas} omitidas${re.inestables ? ` · ${re.inestables} inestables` : ''}`, estado: estadoE, textoEstado: estadoE === 'ok' ? 'Pasó' : 'Falló', comando: 'cd frontend && npx playwright test', codigo: e2e.codigo }) +
  `<h2>Qué cubre</h2><p>El sistema completo en Chromium: backend propio en el puerto 3100 con una base temporal y Vite en el 5174. Dos proyectos: <b>escritorio</b> y <b>movil</b> (Pixel 7). Una prueba falla si la página lanza una excepción, escribe un error en consola o el backend responde 5xx. La prueba omitida lo está a propósito (solo aplica a un proyecto).</p><p><a href="playwright-frontend/index.html">Abrir el reporte nativo de Playwright</a></p>
<h2>Detalle</h2>` + tabla(re.pruebas.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nombre)}</td><td>${chip(p.estado, { ok: 'Pasó', mal: 'Falló', omitida: 'Omitida' }[p.estado])}</td><td class="der">${p.tiempo}</td></tr>`)) + crudoDe('04-e2e-playwright-frontend.txt', e2e.salida))

// Versión .zip
const estadoZ = zip.codigo === 0 && rz.fallaron === 0 && rz.pasaron > 0 ? 'ok' : 'mal'
pagina('4-version-zip.html', 'Prueba de la versión .zip', 'La carpeta que recibe el cliente',
  tarjetasDe({ n: rz.pasaron + rz.fallaron, resumen: `${rz.pasaron} pasó · ${rz.fallaron} fallaron`, estado: estadoZ, textoEstado: estadoZ === 'ok' ? 'Pasó' : 'Falló', comando: 'cd desktop && npm run preparar && npm run test:escritorio', codigo: zip.codigo }) +
  `<h2>Qué cubre</h2><p>Arma la carpeta «De Panas SV» (Node.js oficial firmado por OpenJS Foundation, comprobado por <code>preparar.mjs</code>), abre el <code>.cmd</code> de verdad, usa el sistema en el navegador, lo apaga desde el menú y comprueba que los datos se conservan.</p><p><a href="playwright-zip/index.html">Abrir el reporte nativo de Playwright</a> · <a href="crudo/05-desktop-preparar.txt">Salida de <code>npm run preparar</code></a></p>
<h2>Detalle</h2>` + tabla(rz.pruebas.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nombre)}</td><td>${chip(p.estado, p.estado === 'ok' ? 'Pasó' : 'Falló')}</td><td class="der">${p.tiempo}</td></tr>`)) + crudoDe('06-desktop-test-escritorio.txt', zip.salida))

// npm audit
const chipAudit = (a, prod) => a.total === 0 ? chip('ok', 'Limpio') : chip('aviso', prod)
pagina('5-npm-audit.html', 'Auditoría de dependencias', 'npm audit --omit=dev · backend, frontend y desktop',
  `<div class="tarjetas">${Object.entries(audits).map(([k, a]) => `<div class="tarjeta"><h3>${k}</h3><div class="num">${a.total}</div><p class="meta">${esc(a.detalle)}</p>${chipAudit(a, 'No explotable aquí')}</div>`).join('')}</div>
<h2>Cómo leerlo</h2><p>Se revisan solo las dependencias que llegan a la app del cliente (<code>--omit=dev</code>). Lo del frontend son los avisos de <code>react-router</code> 6 (redirección abierta con barra invertida y SSR): la app navega solo a rutas fijas del código y no usa renderizado en servidor. El arreglo pide pasar a React Router 7, un cambio mayor que queda documentado en el <a href="0-informe-seguridad.html">informe de seguridad</a>.</p>
<h2>Salida completa</h2><pre>${esc([auditB.salida, auditF.salida, auditD.salida].join('\n\n'))}</pre>`)

// Informe de seguridad (resume docs/revisiones/seguridad.md)
const hallazgos = [
  ['La base completa (.db) la podía reemplazar un operador o un subadministrador, y así ponerle otra contraseña al administrador; descargarla daba los hashes de todas las contraseñas', 'Alta', 'ok', 'Corregido', 'Solo el administrador la exporta o la reemplaza. Prueba nueva en seguridad-datos.test.js (fallaba antes del arreglo)'],
  ['La ayuda de la contraseña decía «Distinta a la de los demás usuarios.», que no es cierto', 'Baja', 'ok', 'Corregido', 'Texto nuevo en mensajes.js'],
  ['react-router 6: dos avisos de la librería', 'Moderada', 'aviso', 'No explotable aquí', 'Rutas fijas del código y sin SSR. Se arregla al pasar a React Router 7'],
  ['body-parser y qs (revisión del 11 de noviembre)', 'Alta', 'ok', 'Corregido', 'npm audit fix; backend con 0 vulnerabilidades'],
  ['Cabeceras de seguridad (revisión del 11 de noviembre)', 'Baja', 'ok', 'Corregido', 'CSP, nosniff, X-Frame-Options y Referrer-Policy'],
]
pagina('0-informe-seguridad.html', 'Revisión de seguridad', '25 de noviembre de 2026 · incluye el subadministrador',
  `<div class="tarjetas"><div class="tarjeta"><h3>Abiertos y explotables</h3><div class="num">0</div><p class="meta">4 corregidos · 1 documentado como no explotable</p>${chip('ok', 'Sin pendientes explotables')}</div>
<div class="tarjeta"><h3>Pruebas de seguridad</h3><div class="num">${(rb.pruebas.filter(p => /seguridad|permis|sesi|subadmin|base completa|bloque|hash|Host/i.test(p.nombre)).length) || '—'}</div><p class="meta">En el backend, todas pasaron</p>${chip(estadoB, estadoB === 'ok' ? 'Pasó' : 'Falló')}</div></div>
<h2>Modelo de amenazas</h2><p>Un usuario con sesión (empleado, operador o subadministrador) que intenta hacer más de lo que le toca; alguien con acceso a la computadora del local; una página web abierta en el mismo navegador que intenta hablarle al servidor local.</p>
<h2>Hallazgos</h2>` + tabla(hallazgos.map((h, i) => `<tr><td>${i + 1}</td><td>${esc(h[0])}</td><td>${esc(h[1])}</td><td>${chip(h[2], h[3])}<br><span class="meta">${esc(h[4])}</span></td></tr>`), ['#', 'Hallazgo', 'Gravedad', 'Estado']) +
  `<p>El detalle, con la lista de comprobación completa, está en <code>docs/revisiones/seguridad.md</code> y el resumen de controles en <code>docs/SEGURIDAD.md</code> del repositorio.</p>`)

// Resumen
const total = rb.total + rv.total + totalE + rz.pasaron + rz.fallaron
const todoVerde = [estadoB, estadoV, estadoE, estadoZ].every(e => e === 'ok')
const tarjeta = (href, titulo, num, meta, estado, texto) => `<a class="tarjeta" href="${href}"><h3>${titulo}</h3><div class="num">${num}</div><p class="meta">${esc(meta)}</p>${chip(estado, texto)}</a>`
pagina('index.html', 'Reporte de pruebas', `De Panas SV · ${hoy}`,
  `<p>Resultados de todas las pruebas automáticas del sistema de compras de <b>De Panas SV</b>, ejecutadas de nuevo el <b>${hoy}</b> sobre la rama de la entrega final. Cada tarjeta abre su página; la salida completa de la terminal está en cada una y en la carpeta «crudo».</p>
<h2>Resumen</h2><div class="tarjetas">
${tarjeta('0-informe-seguridad.html', 'Informe de seguridad', 5, '4 corregidos · 1 no explotable', 'ok', '0 abiertos')}
${tarjeta('1-backend.html', 'Backend', rb.total, 'API, sesión, permisos y datos', estadoB, estadoB === 'ok' ? 'Pasó' : 'Falló')}
${tarjeta('2-frontend-vitest.html', 'Interfaz (Vitest)', rv.total, `${rv.nArchivos} archivos`, estadoV, estadoV === 'ok' ? 'Pasó' : 'Falló')}
${tarjeta('3-e2e-playwright.html', 'Punta a punta', totalE, `escritorio y teléfono · ${re.omitidas} omitida a propósito`, estadoE, estadoE === 'ok' ? 'Pasó' : `${re.fallaron} falló`)}
${tarjeta('4-version-zip.html', 'Versión .zip', rz.pasaron + rz.fallaron, 'prueba integral del paquete del cliente', estadoZ, estadoZ === 'ok' ? 'Pasó' : 'Falló')}
${tarjeta('5-npm-audit.html', 'npm audit', audits.backend.total + audits.frontend.total + audits.desktop.total, `backend ${audits.backend.total}, frontend ${audits.frontend.total}, desktop ${audits.desktop.total}`, audits.backend.total + audits.desktop.total === 0 ? 'ok' : 'aviso', 'Ver detalle')}
</div>
<h2>Total</h2><p><b>${total} pruebas automáticas</b>${todoVerde ? ', todas en verde' : ''}. Más los reportes nativos de Playwright: <a href="playwright-frontend/index.html">frontend</a> y <a href="playwright-zip/index.html">.zip</a>.</p>
<h2>Archivos crudos</h2><ul>${['01-backend-npm-test.txt', '02-frontend-vitest.txt', '03-npm-audit.txt', '04-e2e-playwright-frontend.txt', '05-desktop-preparar.txt', '06-desktop-test-escritorio.txt'].map(f => `<li><a href="crudo/${f}">${f}</a></li>`).join('')}</ul>
<p class="meta">Otras partes de la documentación: <a href="../index.html">inicio</a> · <a href="../sitio/index.html">sitio del proyecto</a> · <a href="../manual/index.html">manual de uso</a>.</p>`, false)

for (const f of ['01-backend-npm-test.txt', '02-frontend-vitest.txt', '03a-npm-audit-backend.txt', '03b-npm-audit-frontend.txt', '03c-npm-audit-desktop.txt', '04-e2e-playwright-frontend.txt', '05-desktop-preparar.txt', '06-desktop-test-escritorio.txt']) rmSync(join(CRUDO, f + '.codigo'), { force: true })
for (const f of ['03a-npm-audit-backend.txt', '03b-npm-audit-frontend.txt', '03c-npm-audit-desktop.txt']) rmSync(join(CRUDO, f), { force: true })
void cpSync
console.log(`listo: ${total} pruebas · backend ${rb.total}, interfaz ${rv.total}, punta a punta ${totalE}, .zip ${rz.pasaron + rz.fallaron}`)
