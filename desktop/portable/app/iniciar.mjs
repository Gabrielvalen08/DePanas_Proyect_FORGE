/**
 * iniciar.mjs — Lo que corre «Abrir De Panas SV.cmd» (y el acceso directo del escritorio).
 *
 * 1. Si el sistema ya está encendido en http://localhost:4510, solo abre otra pestaña.
 * 2. Si no, arranca servidor.mjs oculto y aparte (sigue corriendo cuando esta ventana se
 *    cierra), espera a que responda y abre el navegador predeterminado.
 * 3. Crea o actualiza el acceso directo «De Panas SV» del escritorio. Como lo crea esta
 *    computadora, Windows no lo marca como descargado de internet y Smart App Control lo deja abrir.
 *
 * Usa el node.exe de la carpeta node/ (el oficial, firmado por OpenJS Foundation).
 * DEPANAS_PUERTO y DEPANAS_DATOS cambian el puerto y la carpeta de datos; DEPANAS_PRUEBA=1 no abre
 * el navegador, ni crea el acceso directo, ni muestra ventanas de aviso (pruebas automáticas).
 */

import { execFile, spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const APP = dirname(fileURLToPath(import.meta.url))
const RAIZ = dirname(APP)
const PUERTO = Number(process.env.DEPANAS_PUERTO) || 4510
const DIRECCION = `http://localhost:${PUERTO}`
const PRUEBA = process.env.DEPANAS_PRUEBA === '1'
const DATOS = process.env.DEPANAS_DATOS || join(process.env.APPDATA ?? homedir(), 'De Panas SV')

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))

/** 'depanas' si el sistema ya responde, 'otro' si el puerto lo usa otro programa, 'libre' si no hay nada */
async function estado() {
  try {
    const res = await fetch(`http://127.0.0.1:${PUERTO}/api/health`, { signal: AbortSignal.timeout(2000) })
    const json = await res.json().catch(() => null)
    return res.ok && json?.ok ? 'depanas' : 'otro'
  } catch (error) {
    return error?.cause?.code === 'ECONNREFUSED' ? 'libre' : 'otro'
  }
}

/** Ejecuta un comando de PowerShell (oculto) y no falla si PowerShell no está */
function powershell(comando) {
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', comando], { windowsHide: true }, () => resolve())
  })
}

const texto = cadena => `'${String(cadena).replace(/'/g, "''")}'`

function abrirNavegador() {
  if (PRUEBA) return
  spawn('explorer.exe', [DIRECCION], { detached: true, stdio: 'ignore' }).unref()
}

/** Avisa en esta ventana y con un cuadro de mensaje (por si se abrió desde el acceso directo, minimizado) */
async function avisar(mensaje) {
  console.error(`\n${mensaje}\n`)
  if (PRUEBA) return
  await powershell(`Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show(${texto(mensaje)}, 'De Panas SV', 'OK', 'Warning') | Out-Null`)
}

/** Acceso directo «De Panas SV» en el escritorio, apuntando a esta carpeta (se rehace si la carpeta se movió) */
async function accesoDirecto() {
  if (PRUEBA) return
  const node = join(RAIZ, 'node', 'node.exe')
  await powershell([
    "$escritorio = [Environment]::GetFolderPath('Desktop')",
    "$acceso = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $escritorio 'De Panas SV.lnk'))",
    `$acceso.TargetPath = ${texto(node)}`,
    `$acceso.Arguments = ${texto(`"${join(APP, 'iniciar.mjs')}"`)}`,
    `$acceso.WorkingDirectory = ${texto(RAIZ)}`,
    `$acceso.IconLocation = ${texto(join(APP, 'icono.ico'))}`,
    '$acceso.WindowStyle = 7',
    "$acceso.Description = 'Abrir De Panas SV'",
    '$acceso.Save()',
  ].join('; '))
}

/** Últimas líneas del registro de errores del servidor, para el aviso */
function ultimoError() {
  const ruta = join(DATOS, 'registro.log')
  if (!existsSync(ruta)) return ''
  return readFileSync(ruta, 'utf8').trim().split('\n').slice(-3).join('\n')
}

async function principal() {
  console.log('Abriendo De Panas SV…')
  const actual = await estado()
  if (actual === 'otro') {
    await avisar(`El puerto ${PUERTO} lo está usando otro programa, así que De Panas SV no puede abrirse.\nCierra ese programa o reinicia la computadora y vuelve a intentarlo.`)
    return 1
  }

  if (actual === 'libre') {
    // Oculto y aparte: sigue funcionando cuando esta ventana se cierra
    spawn(process.execPath, [join(APP, 'servidor.mjs')], {
      cwd: APP, detached: true, stdio: 'ignore', windowsHide: true, env: process.env,
    }).unref()
    let listo = false
    for (let intento = 0; intento < 40 && !listo; intento++) {
      await esperar(500)
      listo = (await estado()) === 'depanas'
    }
    if (!listo) {
      await avisar(`De Panas SV no pudo arrancar.\n${ultimoError()}\nRevisa el registro en ${join(DATOS, 'registro.log')}.`)
      return 1
    }
  }

  abrirNavegador()
  await accesoDirecto()
  console.log(`De Panas SV está abierto en ${DIRECCION}. Esta ventana se cierra sola.`)
  return 0
}

process.exitCode = await principal()
