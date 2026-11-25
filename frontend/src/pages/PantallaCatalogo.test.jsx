import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import * as api from '../services/api'
import { PANTALLA_CATALOGO, CONFIRMAR, ASIGNACION } from '../utils/mensajes'
import PantallaCatalogo from './PantallaCatalogo'

const { fetchCatalogo, guardarLista, reiniciarModo } = api

// Usa api.js real en modo local (sin servidor), sobre localStorage
function renderizar(ruta = '/catalogo', acciones) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ToastProvider>
        <Routes>
          <Route path="/catalogo" element={<PantallaCatalogo acciones={acciones} />} />
          <Route path="/catalogo/:seccion" element={<PantallaCatalogo acciones={acciones} />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  )
}

async function editarCategoria(usuario, nombre) {
  await usuario.click(await screen.findByRole('button', { name: PANTALLA_CATALOGO.editar('categoria', nombre) }))
  return within(screen.getByRole('dialog', { name: PANTALLA_CATALOGO.tituloEditar('categoria') }))
}

async function guardarCategoria(usuario, ventana, titulo = PANTALLA_CATALOGO.tituloEditar('categoria')) {
  await usuario.click(ventana.getByRole('button', { name: PANTALLA_CATALOGO.guardar }))
  await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: titulo })).not.toBeInTheDocument())
}

function botonProveedor(ventana, nombre) {
  const grupo = ventana.getByRole('group', { name: PANTALLA_CATALOGO.etiquetaProveedores })
  return within(grupo).getByRole('button', { name: nombre, exact: true })
}

async function comprarAguaEnMercado() {
  await guardarLista({
    proveedor: 'Mercado', fecha: '2026-10-01',
    materiales: [{ material: 'Agua', categoria: 'Bebidas', cantidad: 1, monto: 2 }],
  })
}

describe('PantallaCatalogo', () => {
  beforeEach(() => {
    localStorage.clear()
    reiniciarModo()
  })

  afterEach(() => vi.restoreAllMocks())

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

  it('marca los artículos de los proveedores de la categoría y guarda los ajustes manuales', async () => {
    const usuario = userEvent.setup()
    await guardarLista({
      proveedor: 'Mercado', fecha: '2026-10-01',
      materiales: ['Agua', 'Té del mercado', 'Azucar'].map(material => ({
        material, categoria: 'Bebidas', cantidad: 1, monto: 2,
      })),
    })
    renderizar('/catalogo/categorias')
    await usuario.click(await screen.findByRole('button', { name: 'Editar categoría Bebidas' }))
    const ventana = within(screen.getByRole('dialog', { name: 'Editar categoría' }))
    const proveedores = within(ventana.getByRole('group', { name: PANTALLA_CATALOGO.etiquetaProveedores }))
    const proveedor = nombre => proveedores.getByRole('button', { name: nombre, exact: true })
    const articulo = nombre => ventana.getByRole('checkbox', { name: nombre })
    const marcados = () => ventana.queryAllByRole('checkbox', { checked: true })

    expect(proveedores.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(ventana.getByText(PANTALLA_CATALOGO.materiales.elegidos(0))).toBeInTheDocument()
    expect(marcados()).toHaveLength(0)
    expect(ventana.getAllByRole('checkbox')[0]).toBe(articulo('Agua'))
    await usuario.click(proveedor('Pepsi'))
    for (const nombre of ['Agua', 'Gatorade', 'Lipton', 'Pepsi']) {
      expect(articulo(nombre)).toBeChecked()
    }
    expect(marcados()).toHaveLength(4)
    expect(ventana.getAllByRole('checkbox').slice(0, 4)).toEqual(marcados())
    await usuario.click(proveedor('Pepsi'))
    expect(marcados()).toHaveLength(0)
    await usuario.click(proveedor('Pepsi'))
    await usuario.click(proveedor('Mercado'))
    expect(marcados()).toEqual(['Agua', 'Gatorade', 'Lipton', 'Pepsi', 'Té del mercado'].map(articulo))
    expect(articulo(/^Azucar/)).not.toBeChecked()

    await usuario.click(articulo(/^Agua/))
    expect(articulo(/^Agua/).closest('label')).toHaveTextContent(PANTALLA_CATALOGO.materiales.seQuitara)
    await usuario.click(articulo(/^Azucar/))
    await usuario.click(proveedor('Pepsi'))
    await usuario.click(proveedor('Mercado'))
    expect(marcados()).toEqual([articulo(/^Azucar/)])
    await usuario.click(proveedor('Pepsi'))
    await usuario.click(proveedor('Mercado'))
    expect(articulo(/^Agua/)).not.toBeChecked()
    expect(articulo(/^Azucar/)).toBeChecked()
    await usuario.click(ventana.getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))
    const bebidas = ['Azucar', 'Gatorade', 'Lipton', 'Pepsi', 'Té del mercado']
    await screen.findByRole('cell', { name: PANTALLA_CATALOGO.listaMateriales(bebidas) })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar categoría' })).not.toBeInTheDocument())

    const guardado = await fetchCatalogo()
    expect(guardado.proveedoresPorCategoria.bebidas).toEqual(['Mercado', 'Pepsi'])
    expect(guardado.materiales.filter(m => m.categoria === 'Bebidas').map(m => m.nombre))
      .toEqual(bebidas)
    expect(guardado.materiales.find(m => m.nombre === 'Agua').categoria).toBe('')

    await usuario.click(screen.getByRole('button', { name: 'Editar categoría Bebidas' }))
    const otra = within(screen.getByRole('dialog', { name: 'Editar categoría' }))
    await usuario.click(otra.getByRole('button', { name: 'Pepsi', exact: true }))
    expect(otra.getByRole('checkbox', { name: /^Agua/ })).not.toBeChecked()
    expect(otra.getAllByRole('checkbox', { checked: true })).toHaveLength(3)
  })

  it('conserva los proveedores sin tocarlos al guardar, renombrar o quitar un artículo', async () => {
    const usuario = userEvent.setup()
    await comprarAguaEnMercado()
    await api.agregarAlCatalogo('material', { nombre: 'Infusión casera', categoria: 'Bebidas' })
    renderizar('/catalogo/categorias')

    await guardarCategoria(usuario, await editarCategoria(usuario, 'Bebidas'))
    const inicial = await fetchCatalogo()
    expect(inicial.proveedoresPorCategoria.bebidas).toEqual(['Mercado', 'Pepsi'])

    const ventana = await editarCategoria(usuario, 'Bebidas')
    const articulo = () => ventana.getByRole('checkbox', { name: /^Infusión casera/ })
    expect(articulo()).not.toBeChecked()
    await usuario.click(articulo())
    expect(articulo()).toBeChecked()
    await usuario.click(articulo())
    expect(articulo()).not.toBeChecked()
    expect(ventana.getByText(PANTALLA_CATALOGO.materiales.seQuitara)).toBeInTheDocument()
    const nombre = ventana.getByLabelText(PANTALLA_CATALOGO.etiquetaNombre('categoria'))
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Refrescos')
    await guardarCategoria(usuario, ventana)
    expect(await screen.findByRole('rowheader', { name: 'Refrescos' })).toBeInTheDocument()

    const guardado = await fetchCatalogo()
    expect(guardado.proveedoresPorCategoria.refrescos).toEqual(['Mercado', 'Pepsi'])
    expect(guardado.materiales.find(m => m.nombre === 'Infusión casera').categoria).toBe('')
    expect(guardado.materiales.filter(m => m.categoria === 'Refrescos').map(m => m.nombre))
      .toEqual(['Agua', 'Gatorade', 'Lipton', 'Pepsi'])
  })

  it('guarda exactamente los proveedores elegidos, incluso ninguno, sin mover artículos', async () => {
    const usuario = userEvent.setup()
    await comprarAguaEnMercado()
    const inicial = await fetchCatalogo()
    renderizar('/catalogo/categorias')

    const ventana = await editarCategoria(usuario, 'Bebidas')
    await usuario.click(botonProveedor(ventana, 'Mercado'))
    await guardarCategoria(usuario, ventana)
    const conMercado = await fetchCatalogo()
    expect(conMercado.proveedoresPorCategoria.bebidas).toEqual(['Mercado'])
    expect(conMercado.materiales).toEqual(inicial.materiales)

    const otra = await editarCategoria(usuario, 'Bebidas')
    await usuario.click(botonProveedor(otra, 'Mercado'))
    await usuario.click(botonProveedor(otra, 'Mercado'))
    await guardarCategoria(usuario, otra)
    const sinProveedores = await fetchCatalogo()
    expect(sinProveedores.proveedoresPorCategoria.bebidas ?? []).toEqual([])
    expect(sinProveedores.materiales).toEqual(inicial.materiales)
  })

  it('solo pide descartar al cancelar si la selección difiere de los proveedores guardados', async () => {
    const usuario = userEvent.setup()
    await comprarAguaEnMercado()
    renderizar('/catalogo/categorias')
    const titulo = PANTALLA_CATALOGO.tituloEditar('categoria')
    const cancelar = ventana => usuario.click(ventana.getByRole('button', { name: PANTALLA_CATALOGO.cancelar }))
    const cerrada = () => waitFor(() => expect(screen.queryByRole('dialog', { name: titulo })).not.toBeInTheDocument())

    await cancelar(await editarCategoria(usuario, 'Bebidas'))
    expect(screen.queryByRole('alertdialog', { name: CONFIRMAR.descartar.titulo })).not.toBeInTheDocument()
    await cerrada()

    const igual = await editarCategoria(usuario, 'Bebidas')
    await usuario.click(botonProveedor(igual, 'Pepsi'))
    await usuario.click(botonProveedor(igual, 'Mercado'))
    await cancelar(igual)
    expect(screen.queryByRole('alertdialog', { name: CONFIRMAR.descartar.titulo })).not.toBeInTheDocument()
    await cerrada()

    const distinta = await editarCategoria(usuario, 'Bebidas')
    await usuario.click(botonProveedor(distinta, 'Pepsi'))
    await cancelar(distinta)
    const descartar = await screen.findByRole('alertdialog', { name: CONFIRMAR.descartar.titulo })
    await usuario.click(within(descartar).getByRole('button', { name: CONFIRMAR.descartar.confirmar }))
    await cerrada()
    expect((await fetchCatalogo()).proveedoresPorCategoria.bebidas).toEqual(['Mercado', 'Pepsi'])
  })

  it('crea una categoría con los artículos marcados y omite los proveedores sin tocar', async () => {
    const usuario = userEvent.setup()
    const agregar = vi.spyOn(api, 'agregarAlCatalogo')
    renderizar('/catalogo/categorias')
    await usuario.click(await screen.findByRole('button', { name: PANTALLA_CATALOGO.agregar('categoria') }))
    const titulo = PANTALLA_CATALOGO.tituloNuevo('categoria')
    const ventana = within(screen.getByRole('dialog', { name: titulo }))
    await usuario.type(ventana.getByLabelText(PANTALLA_CATALOGO.etiquetaNombre('categoria')), 'Granos')
    const arroz = ventana.getByRole('checkbox', { name: /^Arroz/ })
    expect(arroz).not.toBeChecked()
    await usuario.click(arroz)
    await guardarCategoria(usuario, ventana, titulo)

    expect(agregar).toHaveBeenCalledTimes(1)
    expect(agregar).toHaveBeenCalledWith('categoria', { nombre: 'Granos', materiales: ['Arroz'] })
    const guardado = await fetchCatalogo()
    expect(guardado.materiales.find(m => m.nombre === 'Arroz').categoria).toBe('Granos')
    expect(guardado.proveedoresPorCategoria.granos).toBeUndefined()
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
    expect(screen.getAllByRole('menuitem').map(o => o.textContent)).toEqual([A.exportarExcel, A.exportarJson, A.cargar])
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

  it('en Artículos, la ventana de exportar los lista por categoría y luego por nombre', async () => {
    const usuario = userEvent.setup()
    const A = PANTALLA_CATALOGO.archivo
    renderizar('/catalogo/articulos')
    await usuario.click(await screen.findByRole('button', { name: A.masAcciones('material') }))
    await usuario.click(screen.getByRole('menuitem', { name: A.exportarExcel }))
    const ventana = screen.getByRole('dialog', { name: A.seleccion.titulo('material', 'xlsx') })
    const nombres = within(ventana).getAllByRole('checkbox').map(c => c.closest('label').querySelector('span').textContent)
    // Bebidas va primero (Agua, Gatorade…) y lo que no tiene categoría, al final
    expect(nombres.slice(0, 2)).toEqual(['Agua', 'Gatorade'])
    expect(within(ventana).getAllByRole('checkbox').at(-1).closest('label')).toHaveTextContent(A.seleccion.sinCategoria)
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

  it('renombra un proveedor: el campo no lleva aviso y el toast dice en cuántas compras se cambió', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/proveedores')
    await usuario.click(await screen.findByRole('button', { name: 'Editar proveedor Súper Selectos' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar proveedor' })
    const nombre = within(ventana).getByLabelText('Nombre')
    expect(nombre).not.toHaveAccessibleDescription()
    expect(within(ventana).queryByText(/Si cambias el nombre/)).not.toBeInTheDocument()
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Selectos Centro')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    // La confirmación avisa que el nombre nuevo llega a todas las compras registradas
    const confirmacion = await screen.findByRole('alertdialog', { name: CONFIRMAR.guardarCambios.titulo })
    expect(within(confirmacion).getByText(CONFIRMAR.guardarCambios.renombre('Súper Selectos', 'Selectos Centro'))).toBeInTheDocument()
    await usuario.click(within(confirmacion).getByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

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
    expect(within(ventana).getByText(PANTALLA_CATALOGO.materiales.elegidos(0))).toBeInTheDocument()
    expect(within(ventana).getByRole('checkbox', { name: 'Pepsi' })).not.toBeChecked()

    // Quita Lipton y suma Arroz, que hoy está en otra categoría
    await usuario.click(within(ventana).getByRole('button', { name: 'Pepsi', exact: true }))
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

  it('una categoría elige los proveedores que la surten, puede crear uno nuevo con coma y la tabla los muestra', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/categorias')
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByRole('columnheader', { name: PANTALLA_CATALOGO.columnaProveedores })).toBeInTheDocument()

    const fila = screen.getByRole('rowheader', { name: 'Servicios' }).closest('tr')
    await usuario.click(within(fila).getByRole('button', { name: 'Editar categoría Servicios' }))
    const ventana = screen.getByRole('dialog', { name: 'Editar categoría' })
    const grupo = within(ventana).getByRole('group', { name: PANTALLA_CATALOGO.etiquetaProveedores })
    expect(within(ventana).queryByText(/Al elegir uno de estos proveedores en una compra/)).not.toBeInTheDocument()
    expect(within(ventana).queryByText(/Cada artículo va en una sola categoría/)).not.toBeInTheDocument()

    // Un proveedor nuevo se escribe aquí; a diferencia de un producto, su nombre puede llevar comas
    const buscador = within(grupo).getByRole('textbox', { name: 'Buscar o agregar proveedor' })
    expect(buscador).toHaveAttribute('placeholder', 'Buscar o escribir proveedor nuevo…')
    await usuario.type(buscador, 'Distribuidora X, S.A.')
    expect(within(grupo).getByText(ASIGNACION.noExiste('Distribuidora X, S.A.', false, true))).toBeInTheDocument()
    await usuario.click(within(grupo).getByRole('button', { name: 'Agregar «Distribuidora X, S.A.»' }))

    await usuario.click(within(grupo).getByRole('button', { name: 'MMAG' }))
    expect(within(grupo).getByRole('button', { name: /MMAG/ })).toHaveAttribute('aria-pressed', 'true')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    await usuario.click(await screen.findByRole('button', { name: CONFIRMAR.guardarCambios.confirmar }))

    await waitFor(() => {
      const actualizada = screen.getByRole('rowheader', { name: 'Servicios' }).closest('tr')
      expect(within(actualizada).getByText(/MMAG/)).toBeInTheDocument()
      expect(within(actualizada).getByText(/Distribuidora X, S\.A\./)).toBeInTheDocument()
    })
    await usuario.click(screen.getByRole('link', { name: /Proveedores/ }))
    expect(await screen.findByRole('rowheader', { name: 'Distribuidora X, S.A.' })).toBeInTheDocument()
  })

  it('sin resultados ofrece limpiar la búsqueda, y una sección vacía ofrece agregar', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/proveedores')
    await usuario.type(await screen.findByLabelText('Buscar proveedor'), 'zzzz')
    expect(screen.getByText(PANTALLA_CATALOGO.sinResultados)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: PANTALLA_CATALOGO.limpiarBusqueda }))
    expect(screen.getByLabelText('Buscar proveedor')).toHaveValue('')
    expect(screen.getAllByRole('rowheader').length).toBeGreaterThan(0)
  })

  it('una sección vacía ofrece agregar el primero (si el usuario puede agregar)', async () => {
    const usuario = userEvent.setup()
    localStorage.setItem('depanas_catalogo', JSON.stringify({
      version: 2, proveedores: [], categorias: [], materiales: [], productos: [], proveedoresPorCategoria: {}, fichas: {},
    }))
    renderizar('/catalogo/productos')
    expect(await screen.findByText(PANTALLA_CATALOGO.vacio('producto'))).toBeInTheDocument()
    // Está arriba (encabezado) y también en el estado vacío, que va después
    const botones = screen.getAllByRole('button', { name: PANTALLA_CATALOGO.agregar('producto') })
    expect(botones).toHaveLength(2)
    await usuario.click(botones[1])
    expect(await screen.findByRole('dialog', { name: PANTALLA_CATALOGO.tituloNuevo('producto') })).toBeInTheDocument()
  })

  it('el buscador filtra sin distinguir tildes', async () => {
    const usuario = userEvent.setup()
    renderizar('/catalogo/articulos')
    await usuario.type(await screen.findByLabelText('Buscar artículo'), 'jamon')
    const nombres = screen.getAllByRole('rowheader').map(c => c.textContent)
    expect(nombres).toEqual(['Jamón de Pavo', 'Jamon Picnic', 'Jamon Virginia'])
  })

  it('sin las funciones del usuario, no aparecen Agregar, editar, eliminar ni el menú ⋮', async () => {
    renderizar('/catalogo/proveedores', { agregar: false, editar: false, eliminar: false, exportar: false, cargar: false })
    expect(await screen.findByRole('rowheader', { name: 'MMAG' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PANTALLA_CATALOGO.agregar('proveedor') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PANTALLA_CATALOGO.editar('proveedor', 'MMAG') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PANTALLA_CATALOGO.eliminar('proveedor', 'MMAG') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PANTALLA_CATALOGO.archivo.masAcciones('proveedor') })).not.toBeInTheDocument()
  })

  it('con solo algunas funciones, aparecen solo esas', async () => {
    renderizar('/catalogo/proveedores', { agregar: true, editar: true, eliminar: false, exportar: false, cargar: false })
    expect(await screen.findByRole('button', { name: PANTALLA_CATALOGO.editar('proveedor', 'MMAG') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: PANTALLA_CATALOGO.agregar('proveedor') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PANTALLA_CATALOGO.eliminar('proveedor', 'MMAG') })).not.toBeInTheDocument()
  })
})
