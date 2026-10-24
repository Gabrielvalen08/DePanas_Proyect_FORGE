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

  it('cada sección tiene su menú ⋮; cargar un respaldo deja elegir qué traer (todo elegido), marca lo nuevo y confirma', async () => {
    const usuario = userEvent.setup()
    const A = PANTALLA_CATALOGO.archivo
    const S = A.seleccion
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: A.masAcciones('proveedor') }))
    expect(screen.getAllByRole('menuitem').map(o => o.textContent)).toEqual([A.exportarCsv, A.exportarJson, A.cargar])
    await usuario.keyboard('{Escape}')

    const respaldo = {
      tipo: 'proveedor', version: 1,
      filas: [
        { nombre: 'La Pulpería', ubicacion: 'Santa Tecla', telefonos: [], contactos: [] },
        { nombre: 'Selectos', ubicacion: 'San Salvador', telefonos: [], contactos: [] },
      ],
    }
    const archivo = new File([JSON.stringify(respaldo)], 'proveedores.json', { type: 'application/json' })
    await usuario.upload(screen.getByLabelText(A.elegirArchivo('proveedor')), archivo)

    const ventana = await screen.findByRole('dialog', { name: S.titulo('proveedor', 'cargar', 'proveedores.json') })
    expect(within(ventana).getByRole('checkbox', { name: /La Pulpería/ })).toBeChecked()
    expect(within(ventana).getByRole('checkbox', { name: /Selectos/ })).toBeChecked()
    expect(within(ventana).getByText(S.cuenta(2, 2))).toBeInTheDocument()
    // Insignias: lo que no está en el catálogo es nuevo; el detalle del proveedor es su ubicación
    expect(within(ventana).getByRole('checkbox', { name: /La Pulpería/ }).closest('label')).toHaveTextContent(`${S.nuevo}Santa Tecla`)
    expect(within(ventana).getByRole('checkbox', { name: /Selectos/ }).closest('label')).toHaveTextContent(S.yaExiste)

    // Solo se trae La Pulpería
    await usuario.click(within(ventana).getByRole('checkbox', { name: /Selectos/ }))
    await usuario.click(within(ventana).getByRole('button', { name: S.boton('cargar', 1) }))
    const confirmacion = await screen.findByRole('alertdialog', { name: A.confirmarCargar.titulo('proveedor') })
    expect(within(confirmacion).getByText(A.confirmarCargar.mensaje('proveedor', 1, 'proveedores.json'))).toBeInTheDocument()
    await usuario.click(within(confirmacion).getByRole('button', { name: A.confirmarCargar.confirmar }))

    expect(await screen.findByText(A.cargado('proveedor', { nuevos: 1, actualizados: 0, omitidos: 0 }))).toBeInTheDocument()
    const fila = (await screen.findByRole('rowheader', { name: 'La Pulpería' })).closest('tr')
    expect(within(fila).getByText('Santa Tecla')).toBeInTheDocument()
    // Selectos no se tocó: sigue sin ubicación
    const selectos = screen.getByRole('rowheader', { name: 'Selectos' }).closest('tr')
    expect(within(selectos).queryByText('San Salvador')).not.toBeInTheDocument()
  })

  it('exportar deja elegir qué entra: el buscador y «Quitar todos» actúan sobre lo visible y sin nada elegido no se descarga', async () => {
    const usuario = userEvent.setup()
    const A = PANTALLA_CATALOGO.archivo
    const S = A.seleccion
    const descargas = []
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(blob => { descargas.push(blob); return 'blob:x' }), revokeObjectURL: vi.fn() })
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: A.masAcciones('proveedor') }))
    await usuario.click(screen.getByRole('menuitem', { name: A.exportarJson }))
    const ventana = screen.getByRole('dialog', { name: S.titulo('proveedor', 'json') })
    const total = within(ventana).getAllByRole('checkbox').length
    expect(within(ventana).getAllByRole('checkbox').every(c => c.checked)).toBe(true)

    // «Quitar todos» con el buscador quita solo lo que se ve
    await usuario.type(within(ventana).getByLabelText(S.buscar('proveedor')), 'mmag')
    await usuario.click(within(ventana).getByRole('button', { name: S.quitarTodos }))
    expect(within(ventana).getByText(S.cuenta(total - 1, total))).toBeInTheDocument()

    // Sin nada elegido, el botón se apaga y lo explica
    await usuario.clear(within(ventana).getByLabelText(S.buscar('proveedor')))
    await usuario.click(within(ventana).getByRole('button', { name: S.quitarTodos }))
    expect(within(ventana).getByText(S.ninguno)).toBeInTheDocument()
    expect(within(ventana).getByRole('button', { name: S.boton('json', 0) })).toBeDisabled()

    // Elegir todos menos MMAG y descargar
    await usuario.click(within(ventana).getByRole('button', { name: S.elegirTodos }))
    await usuario.click(within(ventana).getByRole('checkbox', { name: /MMAG/ }))
    await usuario.click(within(ventana).getByRole('button', { name: S.boton('json', total - 1) }))
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: A.confirmarExportar.confirmar }))

    expect(await screen.findByText(A.exportado('proveedor', total - 1))).toBeInTheDocument()
    const nombres = JSON.parse(await descargas[0].text()).filas.map(f => f.nombre)
    expect(nombres).toHaveLength(total - 1)
    expect(nombres).not.toContain('MMAG')
    clic.mockRestore()
    vi.unstubAllGlobals()
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

  it('una categoría elige los proveedores que la surten (solo entre los que existen) y la tabla los muestra', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/categorias')
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByRole('columnheader', { name: PANTALLA_CATALOGO.columnaProveedores })).toBeInTheDocument()

    const fila = screen.getByRole('rowheader', { name: 'Servicios' }).closest('tr')
    await usuario.click(within(fila).getByRole('button', { name: 'Editar categoría Servicios' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar categoría' })
    const grupo = within(ventana).getByRole('group', { name: PANTALLA_CATALOGO.etiquetaProveedores })
    expect(within(grupo).getByText(PANTALLA_CATALOGO.ayudaProveedores)).toBeInTheDocument()

    // No se crean proveedores desde aquí
    await usuario.type(within(grupo).getByRole('textbox', { name: 'Buscar proveedor' }), 'Nadie')
    expect(within(grupo).queryByRole('button', { name: /Agregar «Nadie»/ })).not.toBeInTheDocument()
    await usuario.clear(within(grupo).getByRole('textbox', { name: 'Buscar proveedor' }))

    await usuario.click(within(grupo).getByRole('button', { name: 'MMAG' }))
    expect(within(grupo).getByRole('button', { name: /MMAG/ })).toHaveAttribute('aria-pressed', 'true')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

    await waitFor(() => {
      const actualizada = screen.getByRole('rowheader', { name: 'Servicios' }).closest('tr')
      expect(within(actualizada).getByText(/MMAG/)).toBeInTheDocument()
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
