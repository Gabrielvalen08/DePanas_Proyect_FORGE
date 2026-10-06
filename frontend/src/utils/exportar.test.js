import { comprasACsv, comprasAJson, nombreArchivo, rangoRapido } from './exportar'

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
  it('CSV: BOM, encabezados del Excel, una fila por material ordenada por fecha y comillas escapadas', () => {
    const csv = comprasACsv(COMPRAS)
    expect(csv.startsWith('﻿')).toBe(true)
    const lineas = csv.slice(1).trim().split('\r\n')
    expect(lineas[0]).toBe('Fecha,Proveedor,Material,Cantidad,Unidad,Monto,Categoría,Producto')
    expect(lineas).toHaveLength(4)
    expect(lineas[1]).toBe('2026-08-04,Selectos,Tocino La Rioja,1,lb,2.69,Materia Prima,Cachitos')
    expect(lineas[2]).toBe('2026-08-04,Selectos,"Bolsa al Vacio 8*12, ""grande""",1,unidad,17.00,Desechables,Tequeños')
    expect(lineas[3]).toMatch(/^2026-08-27,Pepsi,Agua/)
  })

  it('JSON: compras completas sin campos internos, listas para importar', () => {
    const datos = JSON.parse(comprasAJson(COMPRAS))
    expect(datos.map(c => c.id)).toEqual(['a', 'b'])
    expect(datos[1]).not.toHaveProperty('productos')
    expect(datos[1].materiales[0]).toEqual({ material: 'Agua', cantidad: 2, unidad: 'caja', monto: 7.08, categoria: 'Bebidas', producto: 'Hidratantes' })
  })

  it('nombre del archivo con el rango', () => {
    expect(nombreArchivo('2026-08-01', '2026-08-31', 'csv')).toBe('depanas_compras_2026-08-01_2026-08-31.csv')
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
