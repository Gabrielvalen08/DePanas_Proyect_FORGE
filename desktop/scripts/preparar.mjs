/**
 * preparar.mjs — Arma De Panas SV para el cliente en desktop/salida/De Panas SV/ y, con
 * --zip, lo comprime en desktop/dist/De Panas SV <versión>.zip.
 *
 *   De Panas SV/
 *     Abrir De Panas SV.cmd   ← lo que se abre (portable/)
 *     Abrir De Panas SV (demo).cmd  ← la versión de demostración, con datos de ejemplo (portable/)
 *     Manual de uso.html      ← doble clic: abre el manual en el navegador (portable/)
 *     LEEME.txt               (portable/)
 *     node/node.exe           ← el Node.js oficial que corre este script, SIN modificar: su firma
 *                               de OpenJS Foundation es lo que deja pasar a Smart App Control
 *     app/  iniciar.mjs, servidor.mjs, package.json (portable/app/), icono.ico, manual/ (docs/manual/),
 *           backend/ (sin pruebas ni bases), shared/, frontend/ (compilado),
 *           node_modules/ (las dependencias de producción del backend)
 *
 * Correr con Node ≥ 22.13 (node:sqlite) en Windows: `npm run preparar` o `npm run dist`.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { basename, dirname, join, relative, sep } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync, execSync } from 'child_process'

const ESCRITORIO = dirname(dirname(fileURLToPath(import.meta.url)))
const RAIZ = dirname(ESCRITORIO)
const DESTINO = join(ESCRITORIO, 'salida', 'De Panas SV')
const APP = join(DESTINO, 'app')
const { version } = JSON.parse(readFileSync(join(ESCRITORIO, 'package.json'), 'utf8'))

const fallar = mensaje => {
  console.error(`\n✖ ${mensaje}\n`)
  process.exit(1)
}

// 0. El Node que se va a entregar: el que corre este script, con node:sqlite y firmado
const [mayor, menor] = process.versions.node.split('.').map(Number)
if (mayor < 22 || (mayor === 22 && menor < 13)) fallar(`Hace falta Node 22.13 o más nuevo (este es ${process.version}).`)
const firma = execFileSync('powershell.exe', [
  '-NoProfile', '-Command',
  `$f = Get-AuthenticodeSignature -LiteralPath '${process.execPath.replace(/'/g, "''")}'; "$($f.Status)|$($f.SignerCertificate.Subject)"`,
], { encoding: 'utf8' }).trim()
if (!firma.startsWith('Valid|') || !firma.includes('OpenJS Foundation')) {
  fallar(`El node.exe (${process.execPath}) no tiene la firma válida de OpenJS Foundation (${firma}). Instala Node.js oficial desde nodejs.org.`)
}

// 1. Frontend compilado
console.log('Compilando el frontend…')
execSync('npm run build', { cwd: join(RAIZ, 'frontend'), stdio: 'inherit' })

// 2. Carpeta limpia
rmSync(join(ESCRITORIO, 'salida'), { recursive: true, force: true })
mkdirSync(DESTINO, { recursive: true })
cpSync(join(ESCRITORIO, 'portable'), DESTINO, { recursive: true })
// El manual va dentro de app/; «Manual de uso.html» (portable/) lo abre con un doble clic
cpSync(join(RAIZ, 'docs', 'manual'), join(DESTINO, 'app', 'manual'), { recursive: true })

// 3. node.exe tal cual (copiar no cambia la firma) y su licencia
mkdirSync(join(DESTINO, 'node'))
cpSync(process.execPath, join(DESTINO, 'node', 'node.exe'))
const licencia = join(dirname(process.execPath), 'LICENSE')
if (existsSync(licencia)) cpSync(licencia, join(DESTINO, 'node', 'LICENSE'))

// 4. El sistema
const SIN_COPIAR_BACKEND = new Set(['node_modules', 'test', 'tmp_uploads', 'package-lock.json'])
cpSync(join(RAIZ, 'backend'), join(APP, 'backend'), {
  recursive: true,
  filter: origen => {
    const ruta = relative(join(RAIZ, 'backend'), origen)
    if (!ruta) return true
    if (SIN_COPIAR_BACKEND.has(ruta.split(sep)[0])) return false
    // Nunca la base de desarrollo ni sus respaldos: el cliente empieza con una base nueva
    return !/\.db(-wal|-shm)?$/.test(basename(origen))
  },
})
cpSync(join(RAIZ, 'shared'), join(APP, 'shared'), { recursive: true })
cpSync(join(RAIZ, 'frontend', 'dist'), join(APP, 'frontend'), { recursive: true })
// backend/package.json solo tiene dependencias de producción (express, cors, multer)
cpSync(join(RAIZ, 'backend', 'node_modules'), join(APP, 'node_modules'), { recursive: true })
cpSync(join(RAIZ, 'frontend', 'public', 'favicon.ico'), join(APP, 'icono.ico'))

for (const archivo of ['Abrir De Panas SV.cmd', 'node/node.exe', 'app/iniciar.mjs', 'app/servidor.mjs', 'app/backend/app.js', 'app/frontend/index.html', 'app/node_modules/express/package.json']) {
  if (!existsSync(join(DESTINO, archivo))) fallar(`Falta ${archivo} en la carpeta armada.`)
}
console.log(`Listo: ${relative(RAIZ, DESTINO)} (Node ${process.version}, firmado por OpenJS Foundation).`)

// 5. El .zip
if (process.argv.includes('--zip')) {
  const zip = join(ESCRITORIO, 'dist', `De Panas SV ${version}.zip`)
  mkdirSync(dirname(zip), { recursive: true })
  rmSync(zip, { force: true })
  console.log('Comprimiendo…')
  execFileSync('powershell.exe', [
    '-NoProfile', '-Command',
    `Compress-Archive -LiteralPath '${DESTINO.replace(/'/g, "''")}' -DestinationPath '${zip.replace(/'/g, "''")}' -CompressionLevel Optimal`,
  ], { stdio: 'inherit' })
  console.log(`Listo: ${relative(RAIZ, zip)}`)
}
