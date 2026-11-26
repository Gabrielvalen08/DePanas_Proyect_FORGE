import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AsignarMaterial from './AsignarMaterial'
import { ASIGNACION } from '../utils/mensajes'
import { UNIDADES } from '../../../shared/unidades.js'

const articulo = (modo, datos = {}) => ({
  nombre: 'Harina', existe: modo !== 'nuevo', categoria: '', producto: '', productos: [], unidad: '', modo, pedido: true, ...datos,
})

function montar(material, props = {}) {
  render(<AsignarMaterial material={material} proveedor="Selectos" alGuardar={vi.fn()} alOmitir={vi.fn()} alCerrar={vi.fn()} {...props} />)
  return screen.findByRole('dialog')
}

describe('AsignarMaterial: compacto, con la unidad a la derecha del nombre', () => {
  it('sin «Proveedor: …» ni la ayuda del buscador', async () => {
    const ventana = await montar(articulo('nuevo'))
    expect(within(ventana).queryByText(/Proveedor:/)).not.toBeInTheDocument()
    expect(within(ventana).queryByText(/¿No aparece la categoría/)).not.toBeInTheDocument()
  })

  it('la unidad va junto al nombre, con «gr» y «otros» entre las opciones', async () => {
    const ventana = await montar(articulo('nuevo'))
    const grupo = within(ventana).getByRole('group', { name: ASIGNACION.etiquetaArticuloYUnidad })
    const unidad = within(grupo).getByRole('combobox', { name: ASIGNACION.etiquetaUnidad })
    expect(within(grupo).getByRole('textbox', { name: ASIGNACION.nombreArticulo })).toBeInTheDocument()
    const opciones = within(unidad).getAllByRole('option').map(o => o.value)
    expect(opciones).toEqual(['', ...UNIDADES])
    expect(opciones).toContain('gr')
    expect(opciones).toContain('otros')
    expect(opciones).not.toContain('g')
  })

  it('al editar, la unidad viene elegida; sin unidad no se guarda', async () => {
    const usuario = userEvent.setup()
    const alGuardar = vi.fn()
    const ventana = await montar(articulo('editar', { categoria: 'Materia Prima', unidad: 'lb' }), { alGuardar })
    const unidad = within(ventana).getByRole('combobox', { name: ASIGNACION.etiquetaUnidad })
    expect(unidad).toHaveValue('lb')

    await usuario.selectOptions(unidad, '')
    await usuario.click(within(ventana).getByRole('button', { name: ASIGNACION.guardar }))
    expect(unidad).toHaveAccessibleDescription(ASIGNACION.faltaUnidad)
    expect(alGuardar).not.toHaveBeenCalled()
  })

  it('sin permiso de editar: si ya tiene unidad se muestra y no se cambia; si le falta, se pide', async () => {
    const primera = await montar(articulo('completar', { categoria: 'Materia Prima', unidad: 'kg' }))
    expect(within(primera).queryByRole('combobox', { name: ASIGNACION.etiquetaUnidad })).not.toBeInTheDocument()
    expect(within(primera).getByText('kg')).toBeInTheDocument()
  })

  it('sin permiso de editar y sin unidad, se pide', async () => {
    const ventana = await montar(articulo('completar', { categoria: 'Materia Prima' }))
    expect(within(ventana).getByRole('combobox', { name: ASIGNACION.etiquetaUnidad })).toHaveValue('')
  })
})
