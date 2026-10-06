import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { reiniciarModo } from '../services/api'
import { CONFIGURACION } from '../utils/mensajes'
import PantallaConfiguracion from './PantallaConfiguracion'

// Usa api.js real en modo local (sin servidor), sobre localStorage
function renderizar(ruta = '/configuracion') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ToastProvider>
        <Routes>
          <Route path="/configuracion" element={<PantallaConfiguracion />} />
          <Route path="/configuracion/:seccion" element={<PantallaConfiguracion />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PantallaConfiguracion', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarModo()
  })

  it('muestra las cuatro opciones y pide elegir una', async () => {
    renderizar()
    const secciones = screen.getByRole('navigation', { name: 'Secciones de configuración' })
    for (const nombre of ['Proveedores', 'Categorías', 'Materiales', 'Productos']) {
      expect(within(secciones).getByRole('link', { name: new RegExp(nombre) })).toBeInTheDocument()
    }
    expect(screen.getByText(CONFIGURACION.elegir.titulo)).toBeInTheDocument()
  })

  it('agrega un proveedor y avisa', async () => {
    const usuario = userEvent.setup()
    renderizar('/configuracion/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar proveedor' }))
    const ventana = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await usuario.type(within(ventana).getByLabelText('Nombre'), 'La Colonia Escalón')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('¡Listo, pana! Agregamos un proveedor: «La Colonia Escalón».')).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: 'La Colonia Escalón' })).toBeInTheDocument()
  })

  it('renombra un proveedor: avisa en cuántas compras se cambió', async () => {
    const usuario = userEvent.setup()
    renderizar('/configuracion/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Editar proveedor Súper Selectos' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar proveedor' })
    const nombre = within(ventana).getByLabelText('Nombre')
    expect(nombre).toHaveAccessibleDescription('Si cambias el nombre, también se cambia en 2 compras.')
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Selectos Centro')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('¡Chévere! «Súper Selectos» ahora se llama «Selectos Centro» y se actualizó en 2 compras.')).toBeInTheDocument()
  })

  it('un nombre repetido no se guarda y la ventana sigue abierta', async () => {
    const usuario = userEvent.setup()
    renderizar('/configuracion/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar proveedor' }))
    const ventana = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await usuario.type(within(ventana).getByLabelText('Nombre'), 'mmag')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/Ya existe un proveedor llamado «MMAG»/)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nuevo proveedor' })).toBeInTheDocument()
  })

  it('en Materiales se ven y se cambian la categoría y el producto de cada uno', async () => {
    const usuario = userEvent.setup()
    renderizar('/configuracion/materiales')
    const fila = (await screen.findByRole('rowheader', { name: 'Tocino La Rioja' })).closest('tr')
    expect(within(fila).getByText('Materia Prima')).toBeInTheDocument()
    expect(within(fila).getByText('Cachitos')).toBeInTheDocument()

    await usuario.click(within(fila).getByRole('button', { name: 'Editar material Tocino La Rioja' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar material' })
    expect(within(ventana).getByRole('button', { name: /Materia Prima/ })).toHaveAttribute('aria-pressed', 'true')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Buscar o agregar producto' }), 'Pastelitos{Enter}')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/Guardamos los cambios de «Tocino La Rioja»\. Y estrenamos el producto «Pastelitos»\./)).toBeInTheDocument()
    await waitFor(() => {
      const actualizada = screen.getByRole('rowheader', { name: 'Tocino La Rioja' }).closest('tr')
      expect(within(actualizada).getByText('Pastelitos')).toBeInTheDocument()
    })
  })

  it('elimina una categoría con confirmación y avisa qué materiales quedaron sin ella', async () => {
    const usuario = userEvent.setup()
    renderizar('/configuracion/categorias')
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar categoría Bebidas' }))
    const confirmacion = screen.getByRole('alertdialog', { name: '¿Eliminamos esta categoría?' })
    expect(within(confirmacion).getByText(/4 materiales quedarán sin categoría/)).toBeInTheDocument()
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText(/Eliminamos «Bebidas»\. 4 materiales quedaron sin categoría/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('rowheader', { name: 'Bebidas' })).not.toBeInTheDocument())
  })

  it('el buscador filtra sin distinguir tildes', async () => {
    const usuario = userEvent.setup()
    renderizar('/configuracion/materiales')
    await usuario.type(await screen.findByLabelText('Buscar material'), 'jamon')
    const nombres = screen.getAllByRole('rowheader').map(c => c.textContent)
    expect(nombres).toEqual(['Jamón de Pavo', 'Jamon Picnic', 'Jamon Virginia'])
  })
})
