import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import { reiniciarModo } from '../services/api'
import { PANTALLA_CATALOGO, CONFIRMAR } from '../utils/mensajes'
import PantallaCatalogo from './PantallaCatalogo'

// Usa api.js real en modo local (sin servidor), sobre localStorage
function renderizar(ruta = '/catalogo') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ToastProvider>
        <Routes>
          <Route path="/catalogo" element={<PantallaCatalogo />} />
          <Route path="/catalogo/:seccion" element={<PantallaCatalogo />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PantallaCatalogo', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarModo()
  })

  it('muestra las cuatro opciones y pide elegir una', async () => {
    renderizar()
    const secciones = screen.getByRole('navigation', { name: 'Secciones del catálogo' })
    for (const nombre of ['Proveedores', 'Categorías', 'Artículos', 'Productos']) {
      expect(within(secciones).getByRole('link', { name: new RegExp(nombre) })).toBeInTheDocument()
    }
    expect(screen.getByText(PANTALLA_CATALOGO.elegir.titulo)).toBeInTheDocument()
  })

  it('agrega un proveedor y avisa', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar proveedor' }))
    const ventana = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await usuario.type(within(ventana).getByLabelText('Nombre'), 'La Colonia Escalón')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

    expect(await screen.findByText('¡Listo, pana! Agregamos un proveedor: «La Colonia Escalón».')).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: 'La Colonia Escalón' })).toBeInTheDocument()
  })

  it('en Categorías la columna y el campo del nombre dicen «Categoría» y se habla de artículos', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/categorias')
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByRole('columnheader', { name: 'Categoría' })).toBeInTheDocument()
    expect(within(tabla).getByRole('columnheader', { name: 'Artículos' })).toBeInTheDocument()
    expect(within(tabla).queryByRole('columnheader', { name: 'Nombre' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Agregar categoría' }))
    const ventana = screen.getByRole('dialog', { name: 'Nueva categoría' })
    expect(within(ventana).getByLabelText('Categoría')).toBeInTheDocument()
    expect(within(ventana).getByText('Artículos de esta categoría')).toBeInTheDocument()
  })

  it('el editor pide confirmar al guardar y, si hay cambios, al cancelar; sin cambios se cierra solo', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Editar proveedor Súper Selectos' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar proveedor' })

    // Sin cambios: Cancelar cierra sin preguntar
    await usuario.click(within(ventana).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar proveedor' })).not.toBeInTheDocument())

    // Con cambios: pregunta; «Seguir editando» conserva el texto y «Sí, descartar» cierra
    await usuario.click(await screen.findByRole('button', { name: 'Editar proveedor Súper Selectos' }))
    const editor = screen.getByRole('dialog', { name: 'Editar proveedor' })
    await usuario.type(within(editor).getByLabelText('Nombre'), ' Centro')
    await usuario.click(within(editor).getByRole('button', { name: 'Cancelar' }))
    const descartar = await screen.findByRole('alertdialog', { name: CONFIRMAR.descartar.titulo })
    await usuario.click(within(descartar).getByRole('button', { name: CONFIRMAR.descartar.volver }))
    expect(within(editor).getByLabelText('Nombre')).toHaveValue('Súper Selectos Centro')

    await usuario.click(within(editor).getByRole('button', { name: 'Cancelar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.descartar.confirmar }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar proveedor' })).not.toBeInTheDocument())

    // Guardar pide confirmar; «Cancelar» de la confirmación no guarda
    await usuario.click(await screen.findByRole('button', { name: 'Editar proveedor Súper Selectos' }))
    const otro = screen.getByRole('dialog', { name: 'Editar proveedor' })
    await usuario.type(within(otro).getByLabelText('Nombre'), ' Centro')
    await usuario.click(within(otro).getByRole('button', { name: 'Guardar' }))
    const guardar = await screen.findByRole('alertdialog', { name: CONFIRMAR.guardarCambios.titulo })
    await usuario.click(within(guardar).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(/ahora se llama/)).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar proveedor' })).toBeInTheDocument()
  })

  it('la ficha del proveedor guarda ubicación, varios teléfonos y contactos, y la tabla los muestra', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar proveedor' }))
    const ventana = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    const T = PANTALLA_CATALOGO.ficha

    await usuario.type(within(ventana).getByLabelText('Nombre'), 'La Pulpería')
    await usuario.type(within(ventana).getByLabelText(T.ubicacion), 'Santa Tecla')
    await usuario.type(within(ventana).getByLabelText(T.telefono(1)), '7123-4567')
    await usuario.click(within(ventana).getByRole('button', { name: T.agregarTelefono }))
    await usuario.type(within(ventana).getByLabelText(T.telefono(2)), 'hola')
    await usuario.click(within(ventana).getByRole('button', { name: T.agregarContacto }))
    await usuario.type(within(ventana).getByLabelText(T.contactoNombre(1)), 'Ana')

    // Un teléfono inválido se marca antes de pedir la confirmación
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(within(ventana).getByLabelText(T.telefono(2))).toHaveAttribute('aria-invalid', 'true')

    await usuario.clear(within(ventana).getByLabelText(T.telefono(2)))
    await usuario.type(within(ventana).getByLabelText(T.telefono(2)), '2222-3333')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

    const fila = (await screen.findByRole('rowheader', { name: 'La Pulpería' })).closest('tr')
    expect(within(fila).getByText('Santa Tecla')).toBeInTheDocument()
    expect(within(fila).getByText(/7123-4567/)).toBeInTheDocument()
    expect(within(fila).getByText(T.otros(1))).toBeInTheDocument()
    expect(within(fila).getByText('Ana')).toBeInTheDocument()
  })

  it('cada sección tiene su menú ⋮ para exportar y cargar; cargar un respaldo pide confirmar y lo aplica', async () => {
    const usuario = userEvent.setup()
    const A = PANTALLA_CATALOGO.archivo
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: A.masAcciones('proveedor') }))
    expect(screen.getAllByRole('menuitem').map(o => o.textContent)).toEqual([A.exportarCsv, A.exportarJson, A.cargar])
    await usuario.keyboard('{Escape}')

    const respaldo = { tipo: 'proveedor', version: 1, filas: [{ nombre: 'La Pulpería', ubicacion: 'Santa Tecla', telefonos: [], contactos: [] }] }
    const archivo = new File([JSON.stringify(respaldo)], 'proveedores.json', { type: 'application/json' })
    await usuario.upload(screen.getByLabelText(A.elegirArchivo('proveedor')), archivo)

    const confirmacion = await screen.findByRole('alertdialog', { name: A.confirmarCargar.titulo('proveedor') })
    expect(within(confirmacion).getByText(A.confirmarCargar.mensaje('proveedor', 1, 'proveedores.json'))).toBeInTheDocument()
    await usuario.click(within(confirmacion).getByRole('button', { name: A.confirmarCargar.confirmar }))

    expect(await screen.findByText(A.cargado('proveedor', { nuevos: 1, actualizados: 0, omitidos: 0 }))).toBeInTheDocument()
    const fila = (await screen.findByRole('rowheader', { name: 'La Pulpería' })).closest('tr')
    expect(within(fila).getByText('Santa Tecla')).toBeInTheDocument()
  })

  it('un respaldo de otra sección no se carga y avisa por qué', async () => {
    const usuario = userEvent.setup()
    const A = PANTALLA_CATALOGO.archivo
    renderizar('/catalogo/proveedores')
    await screen.findByRole('button', { name: A.masAcciones('proveedor') })
    const archivo = new File([JSON.stringify({ tipo: 'categoria', version: 1, filas: [{ nombre: 'X', articulos: [] }] })], 'cat.json', { type: 'application/json' })
    await usuario.upload(screen.getByLabelText(A.elegirArchivo('proveedor')), archivo)
    expect(await screen.findByText(/Este archivo trae categorías, no proveedores/)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renombra un proveedor: avisa en cuántas compras se cambió', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Editar proveedor Súper Selectos' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar proveedor' })
    const nombre = within(ventana).getByLabelText('Nombre')
    expect(nombre).toHaveAccessibleDescription('Si cambias el nombre, también se cambia en 2 compras.')
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Selectos Centro')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

    expect(await screen.findByText('¡Chévere! «Súper Selectos» ahora se llama «Selectos Centro» y se actualizó en 2 compras.')).toBeInTheDocument()
  })

  it('un nombre repetido no se guarda y la ventana sigue abierta', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Agregar proveedor' }))
    const ventana = screen.getByRole('dialog', { name: 'Nuevo proveedor' })
    await usuario.type(within(ventana).getByLabelText('Nombre'), 'mmag')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))
    expect(await screen.findByText(/Ya existe un proveedor llamado «MMAG»/)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nuevo proveedor' })).toBeInTheDocument()
  })

  it('en Artículos se ven y se cambian la categoría y los productos de cada uno (un producto nuevo se suma a los que tenía)', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/articulos')
    const fila = (await screen.findByRole('rowheader', { name: 'Tocino La Rioja' })).closest('tr')
    expect(within(fila).getByText('Materia Prima')).toBeInTheDocument()
    expect(within(fila).getByText('Cachitos')).toBeInTheDocument()

    await usuario.click(within(fila).getByRole('button', { name: 'Editar artículo Tocino La Rioja' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar artículo' })
    expect(within(ventana).getByRole('button', { name: /Materia Prima/ })).toHaveAttribute('aria-pressed', 'true')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Buscar o agregar producto' }), 'Pastelitos{Enter}')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

    expect(await screen.findByText(/Guardamos los cambios de «Tocino La Rioja»\. Y estrenamos el producto «Pastelitos»\./)).toBeInTheDocument()
    await waitFor(() => {
      const actualizada = screen.getByRole('rowheader', { name: 'Tocino La Rioja' }).closest('tr')
      expect(within(actualizada).getByText('Cachitos, Pastelitos')).toBeInTheDocument()
    })
  })

  it('elimina una categoría con confirmación y avisa qué materiales quedaron sin ella', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/categorias')
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar categoría Bebidas' }))
    const confirmacion = screen.getByRole('alertdialog', { name: '¿Eliminamos esta categoría?' })
    expect(within(confirmacion).getByText(/4 artículos quedarán sin categoría/)).toBeInTheDocument()
    await usuario.click(within(confirmacion).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText(/Eliminamos «Bebidas»\. 4 artículos quedaron sin categoría/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('rowheader', { name: 'Bebidas' })).not.toBeInTheDocument())
  })

  it('una categoría muestra sus materiales y desde su ventana se eligen cuáles lleva', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/categorias')
    const fila = (await screen.findByRole('rowheader', { name: 'Bebidas' })).closest('tr')
    expect(within(fila).getByText('Agua, Gatorade, Lipton, Pepsi')).toBeInTheDocument()

    await usuario.click(within(fila).getByRole('button', { name: 'Editar categoría Bebidas' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar categoría' })
    expect(within(ventana).getByText(PANTALLA_CATALOGO.materiales.elegidos(4))).toBeInTheDocument()
    expect(within(ventana).getByRole('checkbox', { name: 'Pepsi' })).toBeChecked()

    // Quita Lipton y suma Arroz, que hoy está en otra categoría
    await usuario.click(within(ventana).getByRole('checkbox', { name: 'Lipton' }))
    await usuario.type(within(ventana).getByLabelText(PANTALLA_CATALOGO.materiales.buscar), 'arroz')
    const arroz = within(ventana).getByRole('checkbox', { name: /^Arroz/ })
    expect(arroz.closest('label')).toHaveTextContent('Ahora en «Materia Prima»')
    await usuario.click(arroz)
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

    expect(await screen.findByText(/Actualizamos 2 artículos\./)).toBeInTheDocument()
    await waitFor(() => {
      const actualizada = screen.getByRole('rowheader', { name: 'Bebidas' }).closest('tr')
      expect(within(actualizada).getByText('Agua, Arroz, Gatorade, Pepsi')).toBeInTheDocument()
    })
  })

  it('el buscador filtra sin distinguir tildes', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/articulos')
    await usuario.type(await screen.findByLabelText('Buscar artículo'), 'jamon')
    const nombres = screen.getAllByRole('rowheader').map(c => c.textContent)
    expect(nombres).toEqual(['Jamón de Pavo', 'Jamon Picnic', 'Jamon Virginia'])
  })
})
