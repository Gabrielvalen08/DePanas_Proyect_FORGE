/**
 * capturas-manual.cjs — Capturas del manual de uso (docs/manual/img/), sobre la versión de
 * demostración armada. No guarda nada: llena formularios y abre ventanas, pero no los guarda.
 * Cada pantalla lleva marcadores numerados (recuadro naranja y número) sobre lo que se usa, en el
 * mismo orden que los pasos del manual, y cada botón que nombra el manual sale recortado en
 * docs/manual/img/botones/.
 *
 *   1. npm run preparar
 *   2. Abrir la demo armada (por ejemplo, desde salida/De Panas SV):
 *        DEPANAS_DEMO=1 DEPANAS_PRUEBA=1 node/node.exe app/iniciar.mjs     (puerto 4511)
 *   3. Desde desktop/:  CLAVE=<contraseña de Cesar_01> node scripts/capturas-manual.cjs
 *      (opcional: carpeta de salida y dirección:  node scripts/capturas-manual.cjs <salida> <base>)
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const salida = process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'manual', 'img')
const base = process.argv[3] || 'http://localhost:4511'
const botones = path.join(salida, 'botones')
fs.mkdirSync(botones, { recursive: true })

/** Marcadores: un recuadro naranja y un círculo con su número sobre cada elemento */
async function marcar(page, marcas) {
  const cajas = []
  for (const { loc, n, pos = 'arriba' } of marcas) {
    const caja = await loc.boundingBox()
    if (!caja) throw new Error(`Sin caja para el marcador ${n}`)
    cajas.push({ ...caja, n, pos })
  }
  await page.evaluate(cajas => {
    const capa = document.createElement('div')
    capa.id = 'marcas-manual'
    capa.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647'
    for (const c of cajas) {
      const r = document.createElement('div')
      r.style.cssText = `position:fixed;left:${c.x - 5}px;top:${c.y - 5}px;width:${c.width + 10}px;height:${c.height + 10}px;border:3px solid #EF7D05;border-radius:10px;box-shadow:0 0 0 3px rgba(255,255,255,.85)`
      const b = document.createElement('div')
      b.textContent = c.n
      // El número va centrado arriba del recuadro (o abajo si no cabe arriba): no tapa al vecino
      let izq = Math.max(4, c.x + c.width / 2 - 15)
      let arr = c.y > 44 ? c.y - 40 : c.y + c.height + 10
      if (c.pos === 'abajo') arr = c.y + c.height + 10
      if (c.pos === 'izq') { izq = Math.max(2, c.x - 40); arr = c.y + Math.min(c.height / 2, 24) - 15 }
      b.style.cssText = `position:fixed;left:${izq}px;top:${arr}px;width:30px;height:30px;border-radius:50%;background:#EF7D05;color:#0F331E;font:700 17px/30px 'Josefin Sans',sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)`
      capa.append(r, b)
    }
    document.body.append(capa)
  }, cajas)
}
const quitarMarcas = page => page.evaluate(() => document.getElementById('marcas-manual')?.remove())

async function foto(page, nombre, marcas = []) {
  await page.mouse.move(2, 2)
  await page.waitForTimeout(350)
  if (marcas.length) await marcar(page, marcas)
  await page.screenshot({ path: path.join(salida, `${nombre}.png`) })
  await quitarMarcas(page)
}

/** Recorte de un botón (con un poco de margen) */
async function recorte(page, loc, nombre) {
  await loc.scrollIntoViewIfNeeded()
  const c = await loc.boundingBox()
  if (!c) throw new Error(`Sin caja para el recorte ${nombre}`)
  const m = 6
  await page.screenshot({ path: path.join(botones, `${nombre}.png`), clip: { x: c.x - m, y: c.y - m, width: c.width + 2 * m, height: c.height + 2 * m } })
}

const ir = (page, ruta) => page.evaluate(r => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')) }, ruta)
async function salirSinGuardar(page) {
  const salir = page.getByRole('button', { name: 'Salir sin guardar' })
  if (await salir.count()) await salir.click()
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 })
  await page.goto(base + '/')
  await page.waitForTimeout(800)

  // 1. Acceso
  await page.getByLabel('Usuario').fill('Cesar_01')
  await foto(page, '01-acceso', [
    { loc: page.getByLabel('Usuario'), n: 1 },
    { loc: page.locator('#input-contrasena'), n: 2 },
    { loc: page.getByRole('button', { name: 'Ingresar' }), n: 3 },
  ])
  await recorte(page, page.getByRole('button', { name: 'Ingresar' }), 'ingresar')
  await page.locator('#input-contrasena').fill(process.env.CLAVE)
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.waitForTimeout(800)
  await recorte(page, page.getByRole('button', { name: 'Apagar De Panas SV' }).first(), 'apagar')

  // 2. Agregar compra: una fila completa (sin guardar)
  const form = page.getByRole('form').first()
  await form.getByRole('combobox', { name: 'Proveedor' }).fill('Selectos')
  await page.keyboard.press('Enter')
  await form.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Harina PAN')
  await page.keyboard.press('Enter')
  await form.getByLabel('Cantidad, fila 1').fill('6')
  await form.getByLabel('Unidad, fila 1').selectOption('unidad')
  await page.mouse.click(5, 5)
  await page.waitForTimeout(700)
  const guardar = form.getByRole('button', { name: 'Guardar compra' })
  await foto(page, '02-agregar-compra', [
    { loc: form.getByLabel('Fecha'), n: 1 },
    { loc: form.getByRole('combobox', { name: 'Proveedor' }), n: 2 },
    { loc: form.getByRole('combobox', { name: 'Artículo, fila 1' }), n: 3 },
    { loc: form.getByLabel('Cantidad, fila 1'), n: 4 },
    { loc: form.getByLabel('Monto, fila 1'), n: 5 },
    { loc: guardar, n: 6 },
  ])
  await recorte(page, guardar, 'guardar-compra')
  await recorte(page, page.getByRole('button', { name: 'Nueva compra' }), 'nueva-compra')
  await recorte(page, form.getByText('Agregar otro artículo'), 'agregar-otro')
  await recorte(page, form.getByRole('button', { name: /^Editar artículo: Harina PAN/ }), 'lapiz-articulo')

  // 3. Un artículo nuevo: el «+» abre su formulario
  await form.getByRole('combobox', { name: 'Artículo, fila 1' }).fill('Queso cheddar')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const mas = form.getByRole('button', { name: /^Agregar artículo nuevo: Queso cheddar/ })
  await recorte(page, mas, 'mas-articulo')
  await page.setViewportSize({ width: 1280, height: 960 })
  await mas.click()
  const ventana = page.getByRole('dialog')
  await ventana.waitFor()
  await page.waitForTimeout(500)
  await foto(page, '03-articulo-nuevo', [
    { loc: ventana.getByLabel('Nombre del artículo'), n: 1, pos: 'izq' },
    { loc: ventana.getByRole('group', { name: 'Categoría' }), n: 2, pos: 'izq' },
    { loc: ventana.getByRole('group', { name: /Productos/ }), n: 3, pos: 'izq' },
    { loc: ventana.getByRole('button', { name: 'Guardar' }), n: 4, pos: 'izq' },
  ])
  await recorte(page, ventana.getByRole('button', { name: 'Ahora no' }), 'ahora-no')
  await ventana.getByRole('button', { name: 'Ahora no' }).click()
  await page.waitForTimeout(400)
  await page.setViewportSize({ width: 1280, height: 760 })

  // 4. Lista de compras: dos elegidas, con las páginas arriba
  await ir(page, '/compras')
  await page.waitForTimeout(600)
  await salirSinGuardar(page)
  await page.getByRole('table').waitFor()
  await page.waitForTimeout(800)
  await recorte(page, page.locator('#open-filter-btn'), 'filtrar')
  await recorte(page, page.getByRole('navigation', { name: 'Páginas de la lista' }), 'paginas')
  await recorte(page, page.getByRole('button', { name: 'Más acciones de Lista de compras' }), 'mas-acciones')
  const casillas = page.getByRole('checkbox')
  await casillas.nth(1).check()
  await casillas.nth(2).check()
  await page.waitForTimeout(300)
  const eliminar = page.getByRole('button', { name: /^Eliminar 2 compras/ })
  await recorte(page, eliminar, 'eliminar')
  await foto(page, '04-lista-compras', [
    { loc: casillas.nth(1), n: 1 },
    { loc: eliminar, n: 2, pos: 'abajo' },
    { loc: page.locator('#open-filter-btn'), n: 3, pos: 'abajo' },
    { loc: page.getByRole('navigation', { name: 'Páginas de la lista' }), n: 4, pos: 'abajo' },
    { loc: page.getByRole('button', { name: 'Más acciones de Lista de compras' }), n: 5, pos: 'abajo' },
  ])
  await casillas.nth(1).uncheck()
  await casillas.nth(2).uncheck()

  // Filtros abiertos
  await page.locator('#open-filter-btn').click()
  await page.waitForTimeout(600)
  await foto(page, '05-filtros', [{ loc: page.locator('#panel-filtros'), n: 1 }])
  await page.locator('#open-filter-btn').click()
  await page.waitForTimeout(400)

  // Detalle de una compra
  await page.getByRole('button', { name: /^Ver compra en/ }).first().click()
  const detalle = page.getByRole('dialog')
  await detalle.waitFor()
  await page.waitForTimeout(600)
  const editar = detalle.getByRole('button', { name: 'Editar' })
  await recorte(page, editar, 'editar')
  await foto(page, '06-detalle-compra', [
    { loc: editar, n: 1 },
    { loc: detalle.getByRole('button', { name: 'Eliminar' }), n: 2 },
  ])
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // 5. Catálogo: artículos
  await ir(page, '/catalogo/articulos')
  await page.getByRole('table').waitFor()
  await page.waitForTimeout(800)
  const agregarArticulo = page.getByRole('button', { name: 'Agregar artículo' })
  await recorte(page, agregarArticulo, 'agregar-catalogo')
  await recorte(page, page.getByRole('button', { name: /^Editar artículo / }).first(), 'lapiz-catalogo')
  await foto(page, '07-catalogo', [
    { loc: page.getByRole('navigation', { name: 'Secciones del catálogo' }), n: 1 },
    { loc: page.getByLabel('Buscar artículo'), n: 2, pos: 'abajo' },
    { loc: agregarArticulo, n: 3, pos: 'abajo' },
    { loc: page.getByRole('button', { name: /^Editar artículo / }).first(), n: 4 },
  ])

  // 6. Exportar
  await ir(page, '/exportar')
  await page.getByRole('heading', { name: 'Exportar datos' }).waitFor()
  await page.waitForTimeout(1000)
  const descargar = page.getByRole('button', { name: 'Descargar' })
  await recorte(page, descargar, 'descargar')
  await foto(page, '08-exportar', [
    { loc: page.getByRole('group', { name: 'Rangos rápidos' }), n: 1, pos: 'izq' },
    { loc: page.getByLabel('Desde'), n: 2, pos: 'izq' },
    { loc: page.getByRole('group', { name: 'Formato' }), n: 3, pos: 'izq' },
    { loc: descargar, n: 4 },
  ])

  // Cargar datos
  await ir(page, '/cargar')
  await page.getByRole('heading', { name: 'Cargar datos' }).waitFor()
  await page.waitForTimeout(800)
  const elegir = page.getByText('Elegir archivo', { exact: true })
  await recorte(page, elegir, 'elegir-archivo')
  await foto(page, '09-cargar', [{ loc: elegir, n: 1 }])

  // 7. Usuarios
  await ir(page, '/usuarios')
  await page.getByRole('heading', { name: 'Gestor de usuarios' }).waitFor()
  await page.waitForTimeout(1000)
  const agregarUsuario = page.getByRole('button', { name: 'Agregar usuario' })
  const editarMarta = page.getByRole('button', { name: 'Editar usuario Marta_02' })
  const requisitos = page.getByRole('button', { name: 'Editar requisitos' })
  await recorte(page, agregarUsuario, 'agregar-usuario')
  await recorte(page, editarMarta, 'lapiz-usuario')
  await recorte(page, requisitos, 'editar-requisitos')
  await foto(page, '10-usuarios', [
    { loc: agregarUsuario, n: 1 },
    { loc: editarMarta, n: 2 },
    { loc: requisitos, n: 3 },
  ])

  // 8. Quién ve qué: el editor de Marta con sus pantallas y funciones
  await page.setViewportSize({ width: 1280, height: 960 })
  await editarMarta.click()
  const editor = page.getByRole('dialog')
  await editor.waitFor()
  await page.waitForTimeout(600)
  await foto(page, '11-permisos', [
    { loc: editor.getByRole('group', { name: 'Rol' }), n: 1, pos: 'izq' },
    { loc: editor.getByRole('group', { name: 'Pantallas y funciones' }), n: 2, pos: 'izq' },
  ])
  await page.keyboard.press('Escape')

  await browser.close()
  console.log('listo')
})().catch(e => { console.error(e); process.exit(1) })
