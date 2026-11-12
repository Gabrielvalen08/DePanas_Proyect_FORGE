import { test, expect, entrar, CESAR } from './ayudantes.js'
import { CARGAR, EXPORTAR, PANTALLA_CATALOGO, USUARIOS } from '../src/utils/mensajes.js'

/**
 * La acción principal de cada pantalla se ve al abrirla, sin bajar (lo que en una página
 * web se llama «arriba del pliegue»), en una laptop (1280 × 720) y en un teléfono (390 × 844).
 * Además no la tapa nada: ni la barra inferior del teléfono ni el encabezado.
 */

const TAMANOS = [
  { nombre: 'laptop', width: 1280, height: 720 },
  { nombre: 'teléfono', width: 390, height: 844 },
]

const PANTALLAS = [
  { ruta: '/', accion: page => page.getByRole('combobox', { name: 'Proveedor' }).first() },
  { ruta: '/compras', accion: page => page.locator('#go-agregar-compra-btn') },
  { ruta: '/catalogo/proveedores', accion: page => page.getByRole('button', { name: PANTALLA_CATALOGO.agregar('proveedor') }) },
  { ruta: '/exportar', accion: page => page.getByRole('button', { name: EXPORTAR.descargar }) },
  { ruta: '/cargar', accion: page => page.getByText(CARGAR.archivo, { exact: true }) },
  { ruta: '/usuarios', accion: page => page.getByRole('button', { name: USUARIOS.agregar }) },
]

/** true si el centro del elemento está dentro de la ventana y no lo tapa otra cosa */
async function seVeSinBajar(locator) {
  return locator.evaluate(el => {
    const caja = el.getBoundingClientRect()
    const x = caja.left + caja.width / 2
    const y = caja.top + caja.height / 2
    if (caja.top < 0 || caja.bottom > window.innerHeight || x < 0 || x > window.innerWidth) return false
    const arriba = document.elementFromPoint(x, y)
    return Boolean(arriba && (el === arriba || el.contains(arriba) || arriba.contains(el) || el.control === arriba))
  })
}

for (const tamano of TAMANOS) {
  test.describe(`Acción principal visible sin bajar (${tamano.nombre})`, () => {
    test.use({ viewport: { width: tamano.width, height: tamano.height } })

    test.beforeEach(async ({ page }) => {
      await entrar(page, CESAR)
    })

    for (const { ruta, accion } of PANTALLAS) {
      test(`${ruta}`, async ({ page }) => {
        await page.goto(ruta)
        const elemento = accion(page)
        await expect(elemento).toBeVisible()
        // Deja terminar las animaciones de entrada
        await page.waitForTimeout(400)
        expect(await page.evaluate(() => window.scrollY), 'la pantalla abre arriba').toBe(0)
        expect(await seVeSinBajar(elemento), `la acción principal de ${ruta} se ve sin bajar`).toBe(true)
      })
    }
  })
}
