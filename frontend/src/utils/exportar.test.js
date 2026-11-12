import readExcelFile, { readSheet } from 'read-excel-file/universal'
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
    expect(filas[0]).toEqual(['Fecha', 'Proveedor', 'Artículo', 'Cantidad', 'Unidad', 'Monto', 'IVA', 'Categoría', 'Producto'])
    expect(filas).toHaveLength(4)
    // Cantidad y monto son números (se pueden sumar en Excel); las comas y comillas del texto no parten la celda
    expect(filas[1]).toEqual(['2026-08-04', 'Selectos', 'Tocino La Rioja', 1, 'lb', 2.69, 0, 'Materia Prima', 'Cachitos'])
    expect(filas[2]).toEqual(['2026-08-04', 'Selectos', 'Bolsa al Vacio 8*12, "grande"', 1, 'unidad', 17, null, 'Desechables', 'Tequeños'])
    expect(filas[3].slice(0, 3)).toEqual(['2026-08-27', 'Pepsi', 'Agua'])
  })

  it('Excel: el IVA va solo en la primera fila de cada compra, para que sumar la columna dé el IVA real', async () => {
    const compra = (id, fecha, iva) => ({
      id, proveedor: 'Selectos', fecha, categoria: '', iva,
      materiales: [
        { material: 'Arroz', cantidad: 1, unidad: 'lb', monto: 50, categoria: '', producto: '' },
        { material: 'Sal', cantidad: 1, unidad: 'lb', monto: 50, categoria: '', producto: '' },
      ],
    })
    const filas = await readSheet(await comprasAXlsx([compra('a', '2026-10-01', 13), compra('b', '2026-10-02', 6.5)]))
    const columna = filas[0].indexOf('IVA')
    expect(filas.slice(1).map(f => f[columna])).toEqual([13, null, 6.5, null])
  })

  it('Excel: la hoja «Resumen» trae el reporte de gastos del rango (totales, por proveedor, por categoría y por mes)', async () => {
    const conIva = [{ ...COMPRAS[0], iva: 0.92 }, COMPRAS[1]]
    const hojas = await readExcelFile(await comprasAXlsx(conIva))
    expect(hojas.map(h => h.sheet)).toEqual(['Compras', 'Resumen'])
    const filas = hojas[1].data
    const valor = etiqueta => filas.find(f => f[0] === etiqueta)?.[1]
    expect(filas[0][0]).toBe('Resumen de gastos')
    expect(valor('Desde')).toBe('2026-08-04')
    expect(valor('Hasta')).toBe('2026-08-27')
    expect(valor('Compras')).toBe(2)
    expect(valor('Artículos')).toBe(3)
    expect(valor('Subtotal')).toBe(26.77) // 2.69 + 17 + 7.08
    expect(valor('IVA')).toBe(0.92)
    expect(valor('Total')).toBe(27.69)
    // Proveedores de mayor a menor gasto
    const inicio = filas.findIndex(f => f[0] === 'Por proveedor')
    expect(filas.slice(inicio + 1, inicio + 3)).toEqual([['Selectos', 1, 19.69, 0, 19.69], ['Pepsi', 1, 7.08, 0.92, 8]])
    const meses = filas.findIndex(f => f[0] === 'Por mes')
    expect(filas[meses + 1]).toEqual(['2026-08', 2, 26.77, 0.92, 27.69])
  })

  it('JSON: lleva el IVA de cada compra', () => {
    const datos = JSON.parse(comprasAJson([{ ...COMPRAS[0], iva: 13 }, COMPRAS[1]]))
    expect(datos.find(c => c.id === COMPRAS[0].id).iva).toBe(13)
    expect(datos.find(c => c.id === COMPRAS[1].id).iva).toBe(0)
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
