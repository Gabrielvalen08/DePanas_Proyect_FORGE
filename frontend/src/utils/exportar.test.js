import { readSheet } from 'read-excel-file/universal'
import { comprasAXlsx, comprasAJson, nombreArchivo, rangoRapido, catalogoAXlsx, catalogoAJson } from './exportar'

const COMPRAS = [
  {
    id: 'b', proveedor: 'Pepsi', fecha: '2026-08-27', categoria: '', productos: [],
    materiales: [{ material: 'Agua', cantidad: 2, unidad: 'caja', monto: 7.08, precio: 7.08, categoria: 'Bebidas', producto: 'Hidratantes' }],
  },
  {
    id: 'a', proveedor: 'Selectos', fecha: '2026-08-04', categoria: '',
    materiales: [
      { material: 'Tocino La Rioja', cantidad: 1, unidad: 'lb', monto: 2.69, categoria: 'Materia Prima', producto: 'Cachitos' },
      { material: 'Bolsa al Vacio 8*12, "grande"', cantidad: 1, unidad: 'unidad', monto: 17, categoria: 'Desechables', producto: 'Tequeños' },
    ],
  },
]

describe('exportar', () => {
  it('Excel: encabezados del Excel del negocio, una fila por artículo ordenada por fecha, cada dato en su columna', async () => {
    const filas = await readSheet(await comprasAXlsx(COMPRAS))
    expect(filas[0]).toEqual(['Fecha', 'Proveedor', 'Artículo', 'Cantidad', 'Unidad', 'Monto', 'Categoría', 'Producto'])
    expect(filas).toHaveLength(4)
    // Cantidad y monto son números (se pueden sumar en Excel); las comas y comillas del texto no parten la celda
    expect(filas[1]).toEqual(['2026-08-04', 'Selectos', 'Tocino La Rioja', 1, 'lb', 2.69, 'Materia Prima', 'Cachitos'])
    expect(filas[2]).toEqual(['2026-08-04', 'Selectos', 'Bolsa al Vacio 8*12, "grande"', 1, 'unidad', 17, 'Desechables', 'Tequeños'])
    expect(filas[3].slice(0, 3)).toEqual(['2026-08-27', 'Pepsi', 'Agua'])
  })

  it('JSON: compras completas sin campos internos, listas para importar', () => {
    const datos = JSON.parse(comprasAJson(COMPRAS))
    expect(datos.map(c => c.id)).toEqual(['a', 'b'])
    expect(datos[1]).not.toHaveProperty('productos')
    expect(datos[1].materiales[0]).toEqual({ material: 'Agua', cantidad: 2, unidad: 'caja', monto: 7.08, categoria: 'Bebidas', producto: 'Hidratantes' })
  })

  it('nombre del archivo con el rango', () => {
    expect(nombreArchivo('2026-08-01', '2026-08-31', 'xlsx')).toBe('depanas_compras_2026-08-01_2026-08-31.xlsx')
    expect(nombreArchivo('', '2026-08-31', 'json')).toBe('depanas_compras_inicio_2026-08-31.json')
  })

  it('rangos rápidos en fecha local', () => {
    const hoy = new Date(2026, 9, 5)
    expect(rangoRapido('mes', hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' })
    expect(rangoRapido('mesAnterior', hoy)).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' })
    expect(rangoRapido('ano', hoy)).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' })
    expect(rangoRapido('mesAnterior', new Date(2026, 0, 15))).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' })
    expect(rangoRapido('todo', hoy)).toEqual({ desde: '', hasta: '' })
  })
})

describe('exportar: secciones del Catálogo', () => {
  it('Excel de proveedores con su ficha y de artículos con todos sus productos', async () => {
    const proveedores = await readSheet(await catalogoAXlsx('proveedor', [
      { nombre: 'La Pulpería', ubicacion: 'Santa Tecla, La Libertad', telefonos: ['7123-4567', '2222-3333'], contactos: [{ nombre: 'Ana', telefono: '7000-1111' }, { nombre: 'Luis', telefono: '' }] },
    ]))
    expect(proveedores).toEqual([
      ['Proveedor', 'Ubicación', 'Teléfonos', 'Contactos'],
      ['La Pulpería', 'Santa Tecla, La Libertad', '7123-4567; 2222-3333', 'Ana (7000-1111); Luis'],
    ])

    const articulos = await readSheet(await catalogoAXlsx('material', [{ nombre: 'Harina', categoria: 'Materia Prima', productos: ['Arepas', 'Empanadas'] }]))
    expect(articulos).toEqual([['Artículo', 'Categoría', 'Productos'], ['Harina', 'Materia Prima', 'Arepas, Empanadas']])
  })

  it('el respaldo .json lleva el tipo de la sección y sus filas', () => {
    expect(JSON.parse(catalogoAJson('categoria', [{ nombre: 'Bebidas', articulos: ['Agua'] }])))
      .toEqual({ tipo: 'categoria', version: 1, filas: [{ nombre: 'Bebidas', articulos: ['Agua'] }] })
  })
})
