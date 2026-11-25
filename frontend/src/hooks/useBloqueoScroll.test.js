import { bloquearScroll } from './useBloqueoScroll'

describe('bloquearScroll', () => {
  afterEach(() => { document.body.style.overflow = '' })

  it('con dos ventanas, el scroll vuelve al cerrar la última, en cualquier orden', () => {
    const editor = bloquearScroll()
    const confirmacion = bloquearScroll()
    expect(document.body.style.overflow).toBe('hidden')

    // El editor se cierra primero: antes la confirmación dejaba 'hidden' para siempre
    editor()
    expect(document.body.style.overflow).toBe('hidden')
    confirmacion()
    expect(document.body.style.overflow).toBe('')
  })

  it('liberar dos veces no descuenta otra ventana abierta', () => {
    const una = bloquearScroll()
    const otra = bloquearScroll()
    una()
    una()
    expect(document.body.style.overflow).toBe('hidden')
    otra()
    expect(document.body.style.overflow).toBe('')
  })
})
