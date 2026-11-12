import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import BloqueCompra from '../components/BloqueCompra'
import { fetchListas, guardarLista, reiniciarModo } from '../services/api'
import { COMPRA, IVA } from '../utils/mensajes'
import { TASA_IVA } from '../../../shared/iva.js'

// api.js real en modo local, sobre localStorage
const fila = [{ material: 'Arroz', cantidad: 2, unidad: 'lb', monto: 100, categoria: 'Materia Prima', producto: 'Todos' }]
const comprar = (proveedor, fecha, iva) => guardarLista({ proveedor, fecha, categoria: '', iva, materiales: fila })

const casilla = () => screen.getByRole('checkbox', { name: IVA.etiqueta(TASA_IVA) })
const proveedor = () => screen.getByRole('combobox', { name: 'Proveedor' })

function montar(props = {}) {
  const alGuardar = props.alGuardar ?? vi.fn(lista => guardarLista(lista))
  render(
    <MemoryRouter>
      <ToastProvider>
        <BloqueCompra alGuardar={alGuardar} {...props} />
      </ToastProvider>
    </MemoryRouter>
  )
  return alGuardar
}

async function llenarFila(usuario) {
  await usuario.type(screen.getByRole('combobox', { name: 'Artículo, fila 1' }), 'Tocino La Rioja')
  await usuario.type(screen.getByLabelText('Cantidad, fila 1'), '2')
  await usuario.selectOptions(screen.getByLabelText('Unidad, fila 1'), 'lb')
  await usuario.type(screen.getByLabelText('Precio unitario, fila 1'), '5000') // cajero: $50.00
}

async function guardar(usuario) {
  await usuario.click(screen.getByRole('button', { name: /guardar compra/i }))
  await usuario.click(await screen.findByRole('button', { name: COMPRA.confirmarGuardar.confirmar }))
}

describe('IVA en la compra', () => {
  beforeEach(async () => {
    localStorage.clear()
    reiniciarModo()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sin servidor')))
    await fetchListas()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('subtotal $100.00 con la casilla marcada muestra $113.00 y guarda IVA 13.00', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.type(proveedor(), 'Tienda Nueva')
    await llenarFila(usuario) // la casilla aparece con la fila completa (formulario por pasos)
    expect(casilla()).not.toBeChecked()
    expect(screen.getAllByText('$100.00')).toHaveLength(2) // sin IVA, subtotal y total coinciden

    await usuario.click(casilla())
    expect(screen.getByText('$13.00')).toBeInTheDocument()
    expect(screen.getByText('$113.00')).toBeInTheDocument()

    await guardar(usuario)
    await waitFor(async () => {
      const [guardada] = await fetchListas({ proveedor: 'Tienda Nueva' })
      expect(guardada.iva).toBe(13)
    })
  })

  it('sin marcar, el IVA es $0.00 y la compra se guarda sin IVA', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.type(proveedor(), 'Tienda Nueva')
    await llenarFila(usuario)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    await guardar(usuario)
    await waitFor(async () => {
      const [guardada] = await fetchListas({ proveedor: 'Tienda Nueva' })
      expect(guardada.iva).toBe(0)
    })
  })

  it('en una compra nueva la casilla toma el IVA de la última compra del proveedor y lo sigue', async () => {
    await comprar('Con Iva', '2026-10-01', 13)
    await comprar('Sin Iva', '2026-10-01', 0)
    const usuario = userEvent.setup()
    montar()
    await usuario.type(proveedor(), 'con iva')
    await llenarFila(usuario)
    expect(casilla()).toBeChecked()

    await usuario.clear(proveedor())
    await usuario.type(proveedor(), 'Sin Iva')
    expect(casilla()).not.toBeChecked()
  })

  it('una vez tocada, la casilla queda como la dejaron aunque cambie el proveedor', async () => {
    await comprar('Con Iva', '2026-10-01', 13)
    const usuario = userEvent.setup()
    montar()
    await usuario.type(proveedor(), 'Con Iva')
    await llenarFila(usuario)
    expect(casilla()).toBeChecked()
    await usuario.click(casilla())
    expect(casilla()).not.toBeChecked()

    await usuario.clear(proveedor())
    await usuario.type(proveedor(), 'Con Iva')
    expect(casilla()).not.toBeChecked()
  })

  const guardadaCon = iva => ({ id: 7, proveedor: 'Sin Iva', fecha: '2026-10-01', categoria: '', iva, materiales: fila })

  it('al editar se muestra el IVA guardado, sin aplicar el automático', async () => {
    await comprar('Sin Iva', '2026-10-02', 0)
    montar({ inicial: guardadaCon(13), alGuardar: vi.fn() })
    expect(casilla()).toBeChecked()
    expect(screen.getByText('$13.00')).toBeInTheDocument()
    expect(screen.getByText('$113.00')).toBeInTheDocument()
  })

  it('al editar, cambiar de proveedor no marca la casilla, y quitar el IVA se guarda', async () => {
    await comprar('Con Iva', '2026-10-02', 13)
    const usuario = userEvent.setup()
    const alGuardar = vi.fn(async lista => lista)
    montar({ inicial: guardadaCon(0), alGuardar })
    await usuario.clear(proveedor())
    await usuario.type(proveedor(), 'Con Iva')
    expect(casilla()).not.toBeChecked()

    await usuario.click(casilla())
    await usuario.click(casilla())
    await guardar(usuario)
    await waitFor(() => expect(alGuardar).toHaveBeenCalledTimes(1))
    expect(alGuardar.mock.calls[0][0].iva).toBe(0)
  })
})
