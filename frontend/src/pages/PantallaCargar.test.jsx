import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PantallaCargar from './PantallaCargar'
import { ToastProvider } from '../context/ToastContext'
import { importarCompras } from '../services/api'
import { CARGAR } from '../utils/mensajes'

vi.mock('../services/api', async importar => {
  const real = await importar()
  return { ...real, importarCompras: vi.fn() }
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
beforeEach(() => { vi.mocked(importarCompras).mockReset() })
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
  await waitFor(() => expect(importarCompras).toHaveBeenCalledWith([otra]))
  expect(await within(screen.getByRole('main')).findByRole('status')).toHaveTextContent(CARGAR.exito(1))
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




