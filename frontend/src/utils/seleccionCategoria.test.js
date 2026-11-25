import { alternarAjuste, articulosAlGuardar, articulosDeProveedores, estaMarcado, ordenarArticulos } from './seleccionCategoria'

const materiales = [
  { nombre: 'Arroz', proveedores: ['Mercado'] },
  { nombre: 'Café' },
  { nombre: 'Gatorade', proveedores: ['Pepsi'] },
  { nombre: 'Agua', proveedores: ['PEPSI', 'Mercado'] },
  { nombre: 'Té', proveedores: ['Mercado'] },
]
const miembros = new Set(['Agua', 'Café', 'Té', 'Gatorade'])

describe('selección de artículos de una categoría', () => {
  it('suma los artículos de ambos proveedores de la categoría sin distinguir mayúsculas', () => {
    expect(articulosDeProveedores(materiales, miembros, ['pepsi', 'MERCADO'])).toEqual(new Set(['Gatorade', 'Agua', 'Té']))
    expect(articulosDeProveedores(materiales, miembros, [])).toEqual(new Set())
  })

  it('ordena primero los de los proveedores, luego los demás miembros y después el resto', () => {
    const delProveedor = articulosDeProveedores(materiales, miembros, ['Pepsi'])
    expect(ordenarArticulos(materiales, miembros, delProveedor).map(m => m.nombre))
      .toEqual(['Gatorade', 'Agua', 'Café', 'Té', 'Arroz'])
  })

  it('quita un miembro sin proveedor con dos clics y lo restituye al marcarlo de nuevo', () => {
    const delProveedor = new Set()
    const inicial = new Map()
    const marcado = alternarAjuste(inicial, 'Café', delProveedor)
    expect(inicial.size).toBe(0)
    expect(estaMarcado('Café', delProveedor, marcado)).toBe(true)
    const quitado = alternarAjuste(marcado, 'Café', delProveedor)
    expect(estaMarcado('Café', delProveedor, quitado)).toBe(false)
    expect(articulosAlGuardar(materiales, miembros, quitado)).toEqual(['Gatorade', 'Agua', 'Té'])
    const restituido = alternarAjuste(quitado, 'Café', delProveedor)
    expect(articulosAlGuardar(materiales, miembros, restituido)).toEqual(['Café', 'Gatorade', 'Agua', 'Té'])
  })

  it('al marcar de nuevo un artículo del proveedor vuelve a la selección automática', () => {
    const delProveedor = new Set(['Agua'])
    const quitado = alternarAjuste(new Map(), 'Agua', delProveedor)
    expect(estaMarcado('Agua', delProveedor, quitado)).toBe(false)
    const restituido = alternarAjuste(quitado, 'Agua', delProveedor)
    expect(restituido.has('Agua')).toBe(false)
    expect(estaMarcado('Agua', delProveedor, restituido)).toBe(true)
  })

  it('guarda solo los ajustes efectivos y conserva los miembros en el orden del catálogo', () => {
    const delProveedor = new Set()
    const inicial = new Map()
    const marcado = alternarAjuste(inicial, 'Arroz', delProveedor)
    expect(articulosAlGuardar(materiales, miembros, marcado)).toEqual(['Arroz', 'Café', 'Gatorade', 'Agua', 'Té'])
    const quitado = alternarAjuste(marcado, 'Arroz', delProveedor)
    expect(articulosAlGuardar(materiales, miembros, quitado)).toEqual(articulosAlGuardar(materiales, miembros, inicial))
    expect(articulosAlGuardar(materiales, miembros, inicial)).toEqual(['Café', 'Gatorade', 'Agua', 'Té'])
  })
})
