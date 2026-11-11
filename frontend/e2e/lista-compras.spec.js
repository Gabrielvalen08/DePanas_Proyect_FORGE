import { test, expect, entrar, confirmar, CESAR } from './ayudantes.js'
import { LISTA_COMPRAS } from '../src/utils/mensajes.js'

/**
 * Lista de compras: se eligen compras con su casilla (como en el correo) para eliminarlas de una
 * vez, y con más de 50 compras la lista va por páginas con las flechas de arriba. Cada prueba
 * crea sus compras por la API y las borra al terminar.
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

test.describe('Lista de compras', () => {
  const creadas = []

  test.beforeEach(async ({ request, page }) => {
    token = (await (await request.post('/api/sesion', { data: { usuario: CESAR.usuario, contrasena: CESAR.contrasena } })).json()).token
    await entrar(page, CESAR)
  })

  test.afterEach(async ({ request }) => {
    if (creadas.length) await request.post('/api/compras/eliminar', { headers: cabeceras(), data: { ids: creadas.splice(0) } })
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

  test('con más de 50 compras la lista va por páginas de 50 con las flechas de arriba', async ({ page, request }, info) => {
    const proveedor = `Paginas e2e ${info.project.name}`
    for (let i = 0; i < 55; i++) creadas.push(await crearCompra(request, proveedor, haceDias(i % 28)))

    await page.goto('/compras')
    const paginas = page.getByRole('navigation', { name: LISTA_COMPRAS.paginacion })
    await expect(paginas).toBeVisible()
    await expect(paginas.getByText(/^1–50 de \d+$/)).toBeVisible()
    await expect(page.locator('table tbody tr')).toHaveCount(50)
    await expect(paginas.getByRole('button', { name: LISTA_COMPRAS.anterior })).toBeDisabled()

    await paginas.getByRole('button', { name: LISTA_COMPRAS.siguiente }).click()
    await expect(paginas.getByText(/^51–\d+ de \d+$/)).toBeVisible()
    await expect(paginas.getByRole('button', { name: LISTA_COMPRAS.anterior })).toBeEnabled()
  })
})
