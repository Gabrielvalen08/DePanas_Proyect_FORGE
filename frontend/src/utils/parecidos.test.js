import { nombreParecido } from './parecidos'

const ARTICULOS = ['Gatorade', 'Azúcar', 'Arroz', 'Harina Pan', 'Arepas', 'Ajo', 'Sal', 'Jamón de Pavo']

describe('nombreParecido', () => {
  it.each([
    ['Gatired', 'Gatorade', 'letras cambiadas'],
    ['Azucar', 'Azúcar', 'falta la tilde'],
    ['AZUCAR', 'Azúcar', 'mayúsculas y sin tilde'],
    ['Harina  Pan', 'Harina Pan', 'espacios de más'],
    ['Aorz', 'Arroz', 'letras invertidas'],
    ['Arrroz', 'Arroz', 'letra repetida'],
    ['Aroz', 'Arroz', 'letra faltante'],
    ['Arepa', 'Arepas', 'singular y plural'],
    ['Jamon de pavo', 'Jamón de Pavo', 'tilde y mayúscula en varias palabras'],
  ])('«%s» se parece a «%s» (%s)', (escrito, esperado) => {
    expect(nombreParecido(escrito, ARTICULOS)).toBe(esperado)
  })

  it('no avisa por nombres que no se parecen', () => {
    expect(nombreParecido('Tomate', ARTICULOS)).toBeNull()
    expect(nombreParecido('Servilletas', ARTICULOS)).toBeNull()
  })

  it('en los nombres muy cortos, una letra de diferencia no basta', () => {
    expect(nombreParecido('Ají', ARTICULOS)).toBeNull()
    expect(nombreParecido('Sol', ARTICULOS)).toBeNull()
  })

  it('no avisa si ya es un registro de la lista: ese caso es «ya existe»', () => {
    expect(nombreParecido('Gatorade', ARTICULOS)).toBeNull()
    expect(nombreParecido('  gatorade ', ARTICULOS)).toBeNull()
  })

  it('al editar, no se compara con su propio nombre', () => {
    expect(nombreParecido('Gatoradee', ['Gatorade'], { excluir: 'Gatorade' })).toBeNull()
    // Sin cambios no avisa, aunque se parezca a otro
    expect(nombreParecido('Gatorade', ['Gatorade', 'Gatorado'], { excluir: 'Gatorade' })).toBeNull()
    expect(nombreParecido('Gatoradee', ['Gatorade', 'Gatorado'], { excluir: 'Gatorado' })).toBe('Gatorade')
  })

  it('entre varios parecidos da el más cercano', () => {
    expect(nombreParecido('Arepas Rellenaz', ['Arepas', 'Arepas Rellenas'])).toBe('Arepas Rellenas')
  })

  it('sin texto o con muy poco no avisa', () => {
    expect(nombreParecido('', ARTICULOS)).toBeNull()
    expect(nombreParecido('Az', ARTICULOS)).toBeNull()
    expect(nombreParecido(undefined, ARTICULOS)).toBeNull()
  })
})
