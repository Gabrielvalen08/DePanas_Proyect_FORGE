import { test, expect, entrar, confirmar, CESAR } from './ayudantes.js'
import { ARCHIVO, LISTA_COMPRAS } from '../src/utils/mensajes.js'

/**
 * Archivo de compras: una compra de más de 3 meses pasa sola al Archivo; desde la lista se
 * eligen compras con su casilla (como en el correo) para archivarlas o eliminarlas, y desde el
 * Archivo se devuelven. Cada prueba crea sus compras por la API y las borra al terminar.
 */

let token
const cabeceras = () => ({ Authorization: `Bearer ${token}` })

async function crearCompra(request, proveedor, fecha) {
  const res = await request.post('/api/compras', {
    headers: cabeceras(),
    data: { proveedor, fecha, materiales: [{ material: 'Azucar', cantidad: 1, unidad: 'lb', monto: 2.5, categoria: 'Materia Prima', producto: 'Todos' }] },
  })
  return (await res.json()).id
}

/** Fecha ISO de hace `dias` días */
function haceDias(dias) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fechaLatina = iso => iso.split('-').reverse().join('/')

test.describe('Archivo de compras', () => {
  const creadas = []

  test.beforeEach(async ({ request, page }) => {
    token = (await (await request.post('/api/sesion', { data: { usuario: CESAR.usuario, contrasena: CESAR.contrasena } })).json()).token
    await entrar(page, CESAR)
  })

  test.afterEach(async ({ request }) => {
    if (creadas.length) await request.post('/api/compras/eliminar', { headers: cabeceras(), data: { ids: creadas.splice(0) } })
  })

  test('una compra vieja va sola al Archivo, se devuelve a la lista y se vuelve a archivar con su casilla', async ({ page, request }, info) => {
    const proveedor = `Archivo e2e ${info.project.name}`
    const fecha = haceDias(150)
    creadas.push(await crearCompra(request, proveedor, fecha))
    const casilla = page.getByRole('checkbox', { name: LISTA_COMPRAS.elegirUna(proveedor, fechaLatina(fecha)) })

    // En la lista no está: tiene más de 3 meses
    await page.goto('/compras')
    await expect(page.getByRole('heading', { name: LISTA_COMPRAS.titulo })).toBeVisible()
    await expect(casilla).toHaveCount(0)

    // El ⋮ lleva al Archivo, donde sí está
    await page.getByRole('button', { name: LISTA_COMPRAS.masAcciones }).click()
    await page.getByRole('menuitem', { name: LISTA_COMPRAS.irArchivo }).click()
    await expect(page.getByRole('heading', { name: 'Archivo de compras', level: 1 })).toBeVisible()
    await expect(page.getByText(ARCHIVO.nota)).toBeVisible()
    await casilla.check()
    await expect(casilla.locator('xpath=ancestor::tr')).toHaveClass(/filaElegida/)
    await page.getByRole('button', { name: ARCHIVO.devolverElegidas(1) }).click()
    await confirmar(page, ARCHIVO.confirmarDevolver.confirmar)
    await expect(page.getByText(ARCHIVO.devueltas(1))).toBeVisible()
    await expect(casilla).toHaveCount(0)

    // Regresar: ahora está en la lista; se archiva con su casilla
    await page.getByRole('button', { name: 'Regresar' }).click()
    await expect(casilla).toBeVisible()
    await casilla.check()
    await page.getByRole('button', { name: LISTA_COMPRAS.archivarElegidas(1) }).click()
    await confirmar(page, LISTA_COMPRAS.confirmarArchivar.confirmar)
    await expect(page.getByText(LISTA_COMPRAS.archivadas(1))).toBeVisible()
    await expect(casilla).toHaveCount(0)
  })

  test('elegir varias y eliminarlas de una vez', async ({ page, request }, info) => {
    const proveedor = `Eliminar e2e ${info.project.name}`
    const fechas = [haceDias(1), haceDias(2)]
    for (const fecha of fechas) creadas.push(await crearCompra(request, proveedor, fecha))

    await page.goto('/compras')
    for (const fecha of fechas) {
      await page.getByRole('checkbox', { name: LISTA_COMPRAS.elegirUna(proveedor, fechaLatina(fecha)) }).check()
    }
    await page.getByRole('button', { name: LISTA_COMPRAS.eliminarElegidas(2) }).click()
    await confirmar(page, LISTA_COMPRAS.confirmarEliminarVarias.confirmar)
    await expect(page.getByText(LISTA_COMPRAS.eliminadas(2))).toBeVisible()
    await expect(page.getByRole('checkbox', { name: new RegExp(proveedor) })).toHaveCount(0)
    creadas.splice(0)
  })
})
