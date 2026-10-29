/**
 * preparar.mjs — Arma desktop/app/ con lo que lleva la app de escritorio:
 *   app/backend   el servidor (sin pruebas, sin bases ni node_modules)
 *   app/shared    las reglas compartidas que importa el backend
 *   app/frontend  el frontend compilado (frontend/dist)
 * Las dependencias del backend (express, cors, multer) están en desktop/package.json,
 * así que `import 'express'` desde app/backend las encuentra en desktop/node_modules.
 * También copia el ícono a build/. Se corre antes de `electron .` y del instalador.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'
import { basename, dirname, join, relative, sep } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const ESCRITORIO = dirname(dirname(fileURLToPath(import.meta.url)))
const RAIZ = dirname(ESCRITORIO)
const DESTINO = join(ESCRITORIO, 'app')

// 1. Frontend compilado
console.log('Compilando el frontend…')
execSync('npm run build', { cwd: join(RAIZ, 'frontend'), stdio: 'inherit' })

// 2. Copias limpias
rmSync(DESTINO, { recursive: true, force: true })
mkdirSync(DESTINO, { recursive: true })

const SIN_COPIAR_BACKEND = new Set(['node_modules', 'test', 'tmp_uploads', 'package-lock.json'])
cpSync(join(RAIZ, 'backend'), join(DESTINO, 'backend'), {
  recursive: true,
  filter: origen => {
    const ruta = relative(join(RAIZ, 'backend'), origen)
    if (!ruta) return true
    if (SIN_COPIAR_BACKEND.has(ruta.split(sep)[0])) return false
    // Nunca la base de desarrollo ni sus respaldos: el cliente empieza con una base nueva
    return !/\.db(-wal|-shm)?$/.test(basename(origen))
  },
})
cpSync(join(RAIZ, 'shared'), join(DESTINO, 'shared'), { recursive: true })
cpSync(join(RAIZ, 'frontend', 'dist'), join(DESTINO, 'frontend'), { recursive: true })

// 3. Ícono de la app (electron-builder lo convierte a .ico para Windows)
mkdirSync(join(ESCRITORIO, 'build'), { recursive: true })
cpSync(join(RAIZ, 'frontend', 'public', 'brand', 'icon-512.png'), join(ESCRITORIO, 'build', 'icon.png'))

if (!existsSync(join(DESTINO, 'frontend', 'index.html'))) throw new Error('No se encontró frontend/dist/index.html')
console.log('Listo: desktop/app/ tiene el backend, shared y el frontend compilado.')
