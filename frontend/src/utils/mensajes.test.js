import { ASIGNACION, COMPRA, CONFIGURACION, EXPORTAR, FRASES_ENCABEZADO, FRASES_MARCA, fraseDelDia } from './mensajes'

describe('mensajes (voz de marca)', () => {
  it('la frase del encabezado es la misma todo el día y cambia al día siguiente', () => {
    const manana = fraseDelDia('/', new Date(2026, 9, 5, 8, 0))
    expect(fraseDelDia('/', new Date(2026, 9, 5, 22, 30))).toBe(manana)
    expect(fraseDelDia('/', new Date(2026, 9, 6, 8, 0))).not.toBe(manana)
    expect(FRASES_ENCABEZADO['/compras']).toContain(fraseDelDia('/compras', new Date(2026, 9, 5)))
  })

  it('las frases del brandbook están presentes en los encabezados', () => {
    const todas = Object.values(FRASES_ENCABEZADO).flat().join(' ')
    expect(todas).toMatch(/Hoy toca arepita/)
    expect(todas).toMatch(/Aquí se viene a comer rico/)
    expect(todas).toMatch(/Tu antojo venezolano en El Salvador/)
    expect(FRASES_MARCA).toHaveLength(4)
  })

  it('confirma con singular y plural correctos', () => {
    expect(COMPRA.guardada('Selectos', 1)).toBe('¡Listo, pana! La compra en Selectos quedó guardada (1 material).')
    expect(COMPRA.guardada('Selectos', 3)).toMatch(/\(3 materiales\)/)
    expect(EXPORTAR.descargado(1)).toMatch(/^¡Listo! Descargamos 1 compra\./)
    expect(EXPORTAR.resumen(2, '$9.77')).toBe('2 compras en el rango · $9.77 en total')
  })

  it('los errores dicen qué pasó y qué hacer, con el detalle del servidor si lo hay', () => {
    expect(COMPRA.errorGuardar('Fila 1: el monto debe ser mayor a 0'))
      .toBe('No pudimos guardar la compra: Fila 1: el monto debe ser mayor a 0. Revisa los datos e inténtalo de nuevo.')
    expect(COMPRA.errorGuardar()).toBe('No pudimos guardar la compra. Revisa los datos e inténtalo de nuevo.')
  })

  it('al asignar un material avisa qué se creó', () => {
    const material = { nombre: 'Queso', categoria: 'Lácteos', producto: 'Tequeños' }
    expect(ASIGNACION.asignado({ material, materialNuevo: false, categoriaNueva: true, productoNuevo: false }))
      .toBe('¡Anotado! «Queso» va a Lácteos · Tequeños. Y estrenamos la categoría «Lácteos».')
    expect(ASIGNACION.asignado({ material, materialNuevo: false, categoriaNueva: false, productoNuevo: false }))
      .toBe('¡Anotado! «Queso» va a Lácteos · Tequeños.')
  })

  it('configuración: género y plural correctos en títulos y confirmaciones', () => {
    expect(CONFIGURACION.tituloNuevo('categoria')).toBe('Nueva categoría')
    expect(CONFIGURACION.tituloNuevo('proveedor')).toBe('Nuevo proveedor')
    expect(CONFIGURACION.confirmarEliminar.titulo('categoria')).toBe('¿Eliminamos esta categoría?')
    expect(CONFIGURACION.uso('proveedor', 1)).toBe('1 compra')
    expect(CONFIGURACION.uso('producto', 3)).toBe('3 materiales')
    expect(CONFIGURACION.editado('proveedor', { anterior: 'Selectos', nombre: 'Súper Selectos', compras: 2 }))
      .toBe('¡Chévere! «Selectos» ahora se llama «Súper Selectos» y se actualizó en 2 compras.')
    expect(CONFIGURACION.eliminado('producto', { nombre: 'Cachitos', materiales: 1 }))
      .toBe('Eliminamos «Cachitos». 1 material quedó sin producto; se pedirá al registrar una compra.')
  })
})
