import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PantallaCargar from './PantallaCargar'
import { ToastProvider } from '../context/ToastContext'
import { analizarCarga, contenidoCompra } from '../../../shared/carga-compras.js'
import { analizarCompras, importarCompras } from '../services/api'
import { CARGAR } from '../utils/mensajes'

vi.mock('../services/api', async importar => {
  const real = await importar()
  return { ...real, analizarCompras: vi.fn(async compras => compras.map(entrante => ({ entrante, origen: String(entrante.id), estado: 'nueva' }))), importarCompras: vi.fn() }
})
const compra = { id: 1, proveedor: 'Marta', fecha: '2026-10-13', categoria: '', materiales: [
  { material: 'Harina', cantidad: 2, unidad: 'kg', monto: 6.5, categoria: 'Materia Prima', producto: 'Arepas' },
  { material: 'Jabón', cantidad: 1, unidad: 'botella', monto: 2.5, categoria: 'Limpieza', producto: '' },
] }
function montar() { render(<MemoryRouter><ToastProvider><PantallaCargar /></ToastProvider></MemoryRouter>) }
function archivo(datos, nombre = 'compras.json') {
  const f = new File([JSON.stringify(datos)], nombre, { type: 'application/json' })
  f.text = async () => JSON.stringify(datos)
  return f
}
beforeEach(() => {
  vi.mocked(importarCompras).mockReset()
  vi.mocked(analizarCompras).mockImplementation(async compras => analizarCarga(compras, []))
})
it('muestra proveedor, fecha y total y carga únicamente la compra elegida completa', async () => {
  const usuario = userEvent.setup()
  montar()
  const otra = { ...compra, id: 2, proveedor: 'César' }
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([compra, otra]))
  expect(await screen.findByText('Marta')).toBeInTheDocument()
  expect(screen.getAllByText('13/10/2026')).toHaveLength(2)
  expect(screen.getAllByText('$9.00')).toHaveLength(2)
  expect(screen.getByRole('button', { name: CARGAR.importar })).toBeDisabled()
  await usuario.click(screen.getByRole('checkbox', { name: CARGAR.elegir(2) }))
  vi.mocked(importarCompras).mockResolvedValue({ ok: true, nuevas: 1 })
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  await waitFor(() => expect(importarCompras).toHaveBeenCalledWith([otra], []))
  expect(await within(screen.getByRole('main')).findByRole('status')).toHaveTextContent(CARGAR.resultado({ nuevas: 1 }))
})
it('rechaza estructura inválida y borra la selección del archivo anterior', async () => {
  const usuario = userEvent.setup()
  montar()
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([compra]))
  await usuario.click(await screen.findByRole('checkbox'))
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([{ ...compra, materiales: [] }]))
  expect(await within(screen.getByRole('main')).findByRole('alert')).toHaveTextContent('necesita materiales')
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(importarCompras).not.toHaveBeenCalled()
})
it('muestra error de guardado y permite reintentar', async () => {
  const usuario = userEvent.setup()
  montar()
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([compra]))
  await usuario.click(await screen.findByRole('checkbox'))
  vi.mocked(importarCompras).mockRejectedValue(new Error('Sin espacio'))
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  expect(await within(screen.getByRole('main')).findByRole('alert')).toHaveTextContent(CARGAR.error('Sin espacio'))
  expect(screen.getByRole('checkbox')).toBeChecked()
  expect(screen.getByRole('button', { name: CARGAR.importar })).toBeEnabled()
})







it('compara ambas compras, conserva filas completas elegidas y permite elegir proveedor y fecha', async () => {
  const usuario = userEvent.setup()
  montar()
  const entrante = { ...compra, proveedor: 'César', fecha: '2026-10-14', materiales: [{ ...compra.materiales[0], cantidad: 4, monto: 12 }] }
  vi.mocked(analizarCompras).mockImplementation(async compras => analizarCarga(compras, [compra]))
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([entrante]))
  await usuario.click(await screen.findByRole('checkbox'))
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  const guardada = await screen.findByRole('table', { name: CARGAR.existente })
  const delArchivo = screen.getByRole('table', { name: CARGAR.entrante })
  expect(within(guardada).getByText('Jabón')).toBeInTheDocument()
  expect(within(guardada).getByText('botella')).toBeInTheDocument()
  expect(within(delArchivo).getByText('Arepas')).toBeInTheDocument()
  expect(within(delArchivo).getByText('Materia Prima')).toBeInTheDocument()
  expect(within(guardada).getAllByRole('checkbox').every(c => c.checked)).toBe(true)
  expect(within(delArchivo).getByRole('checkbox')).not.toBeChecked()
  expect(importarCompras).not.toHaveBeenCalled()
  await usuario.click(within(guardada).getByRole('checkbox', { name: CARGAR.conservar(CARGAR.existente, 1) }))
  await usuario.click(within(delArchivo).getByRole('checkbox'))
  await usuario.click(screen.getByRole('radio', { name: 'Compra del archivo: César' }))
  await usuario.click(screen.getByRole('radio', { name: 'Compra del archivo: 14/10/2026' }))
  vi.mocked(importarCompras).mockResolvedValue({ nuevas: 0, actualizadas: 1, omitidas: 0, descartadas: 0 })
  await usuario.click(screen.getByRole('button', { name: CARGAR.aplicar }))
  expect(importarCompras).toHaveBeenCalledWith([entrante], [{
    origen: '1', base: contenidoCompra(compra), accion: 'combinar', existentes: [1], entrantes: [0], proveedor: 'entrante', fecha: 'entrante',
  }])
  expect(await within(screen.getByRole('main')).findByRole('status')).toHaveTextContent(CARGAR.resultado({ actualizadas: 1 }))
})
it('no permite dejar una compra vacía y permite descartarla sin seleccionar materiales', async () => {
  const usuario = userEvent.setup()
  montar()
  const entrante = { ...compra, proveedor: 'Otro proveedor' }
  vi.mocked(analizarCompras).mockImplementation(async compras => analizarCarga(compras, [compra]))
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([entrante]))
  await usuario.click(await screen.findByRole('checkbox'))
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  const guardada = await screen.findByRole('table', { name: CARGAR.existente })
  for (const casilla of within(guardada).getAllByRole('checkbox')) await usuario.click(casilla)
  expect(screen.getByRole('button', { name: CARGAR.aplicar })).toBeDisabled()
  expect(screen.getByText(CARGAR.minimo)).toBeInTheDocument()
  await usuario.click(screen.getByRole('button', { name: CARGAR.descartar }))
  expect(screen.getByRole('button', { name: CARGAR.aplicar })).toBeEnabled()
  vi.mocked(importarCompras).mockResolvedValue({ descartadas: 1 })
  await usuario.click(screen.getByRole('button', { name: CARGAR.aplicar }))
  expect(importarCompras.mock.calls[0][1][0].accion).toBe('omitir')
})
it('omite compras idénticas sin abrir comparación y muestra el recuento', async () => {
  const usuario = userEvent.setup()
  montar()
  vi.mocked(analizarCompras).mockImplementation(async compras => analizarCarga(compras, [compra]))
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([compra]))
  await usuario.click(await screen.findByRole('checkbox'))
  vi.mocked(importarCompras).mockResolvedValue({ nuevas: 0, omitidas: 1 })
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  expect(await within(screen.getByRole('main')).findByRole('status')).toHaveTextContent(CARGAR.resultado({ omitidas: 1 }))
  expect(screen.queryByRole('table', { name: CARGAR.existente })).not.toBeInTheDocument()
})
it('cambiar de archivo abandona la comparación anterior sin guardar', async () => {
  const usuario = userEvent.setup()
  montar()
  vi.mocked(analizarCompras).mockImplementation(async compras => analizarCarga(compras, [compra]))
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([{ ...compra, proveedor: 'Otro' }]))
  await usuario.click(await screen.findByRole('checkbox'))
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  expect(await screen.findByRole('table', { name: CARGAR.existente })).toBeInTheDocument()
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([compra], 'nuevo.json'))
  expect(await screen.findByText(CARGAR.estado.identica)).toBeInTheDocument()
  expect(screen.queryByRole('table', { name: CARGAR.existente })).not.toBeInTheDocument()
  expect(importarCompras).not.toHaveBeenCalled()
})
it('después de cargar o de un error se puede volver a elegir el mismo archivo', async () => {
  const usuario = userEvent.setup()
  montar()
  const selector = screen.getByLabelText(CARGAR.archivo)
  const mismo = archivo([compra])
  await usuario.upload(selector, mismo)
  await usuario.click(await screen.findByRole('checkbox'))
  vi.mocked(importarCompras).mockResolvedValue({ ok: true, nuevas: 1 })
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  await within(screen.getByRole('main')).findByRole('status')
  expect(selector.value).toBe('')
  // Sin vaciar el selector, elegir el mismo archivo no dispara change
  await usuario.upload(selector, mismo)
  expect(await screen.findByRole('checkbox')).toBeInTheDocument()

  await usuario.upload(selector, archivo([{ ...compra, materiales: [] }]))
  await within(screen.getByRole('main')).findByRole('alert')
  expect(selector.value).toBe('')
})
it('marca en la comparación lo que cambió y lo que solo trae una compra', async () => {
  const usuario = userEvent.setup()
  montar()
  // Harina cambia de cantidad y monto; Jabón no viene en el archivo; Agua solo viene en el archivo
  const entrante = { ...compra, materiales: [
    { ...compra.materiales[0], cantidad: 4, monto: 12 },
    { material: 'Agua', cantidad: 1, unidad: 'litro', monto: 1, categoria: 'Bebidas', producto: 'Todos' },
  ] }
  vi.mocked(analizarCompras).mockImplementation(async compras => analizarCarga(compras, [compra]))
  await usuario.upload(screen.getByLabelText(CARGAR.archivo), archivo([entrante]))
  await usuario.click(await screen.findByRole('checkbox'))
  await usuario.click(screen.getByRole('button', { name: CARGAR.importar }))
  const guardada = await screen.findByRole('table', { name: CARGAR.existente })
  const delArchivo = screen.getByRole('table', { name: CARGAR.entrante })
  const [harinaGuardada, jabon] = within(guardada).getAllByRole('row').slice(1)
  expect(within(harinaGuardada).getAllByText(`(${CARGAR.cambio})`, { exact: false })).toHaveLength(2)
  expect(within(harinaGuardada).queryByText(CARGAR.soloAqui)).not.toBeInTheDocument()
  expect(within(jabon).getByText(CARGAR.soloAqui)).toBeInTheDocument()
  const [harinaArchivo, agua] = within(delArchivo).getAllByRole('row').slice(1)
  expect(within(harinaArchivo).getAllByText(`(${CARGAR.cambio})`, { exact: false })).toHaveLength(2)
  expect(within(agua).getByText(CARGAR.soloAqui)).toBeInTheDocument()
  // La compra final no lleva marcas: es el resultado
  expect(within(screen.getByRole('table', { name: CARGAR.final })).queryByText(CARGAR.soloAqui)).not.toBeInTheDocument()
})
