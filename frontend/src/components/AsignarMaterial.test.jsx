import { render, screen } from '@testing-library/react'
import AsignarMaterial from './AsignarMaterial'
import { ASIGNACION } from '../utils/mensajes'

const articulo = (modo, datos = {}) => ({
  nombre: 'Harina', existe: modo !== 'nuevo', categoria: '', producto: '', productos: [], modo, pedido: true, ...datos,
})

function montar(material) {
  render(<AsignarMaterial material={material} alGuardar={vi.fn()} alOmitir={vi.fn()} alCerrar={vi.fn()} />)
}

describe('AsignarMaterial: ayuda del buscador', () => {
  it('se muestra al crear un artículo', async () => {
    montar(articulo('nuevo'))
    expect(await screen.findByText(ASIGNACION.ayudaBuscador)).toBeInTheDocument()
  })

  it('se muestra si solo falta el producto', async () => {
    montar(articulo('completar', { categoria: 'Materia Prima' }))
    expect(await screen.findByText(ASIGNACION.ayudaBuscador)).toBeInTheDocument()
  })

  it('no se muestra si no hay nada que buscar', async () => {
    montar(articulo('completar', { categoria: 'Materia Prima', producto: 'Arepas', productos: ['Arepas'] }))
    await screen.findByRole('dialog')
    expect(screen.queryByText(ASIGNACION.ayudaBuscador)).not.toBeInTheDocument()
  })
})
