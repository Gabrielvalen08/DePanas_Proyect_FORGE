import { textoBusqueda } from './formato'

/** Desde esta similitud (0 a 1) se avisa. Medida con el catálogo real: «Gatired»/«Gatorade» da 0.625 */
const SIMILITUD_MINIMA = 0.6
// Hasta este largo una letra de diferencia ya cambia mucho la similitud: se cuentan las diferencias
const LARGO_CORTO = 5

/** Sin tildes, sin mayúsculas y con un solo espacio entre palabras */
const normalizar = texto => textoBusqueda((texto ?? '').trim()).replace(/\s+/g, ' ')
/** Sin letras repetidas seguidas: «Arrroz» y «Arroz» cuentan igual */
const sinRepetidas = texto => texto.replace(/(.)\1+/g, '$1')
/** Como el catálogo: mismo registro si solo cambian mayúsculas o espacios en los extremos */
const mismoRegistro = (a, b) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

/** Damerau-Levenshtein: letras cambiadas, faltantes, sobrantes o invertidas */
function diferencias(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cambio = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cambio)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

const similitud = (a, b) => 1 - diferencias(a, b) / Math.max(a.length, b.length, 1)

/** Qué tan parecidos son dos textos ya normalizados; 0 si no alcanzan para avisar */
function parecido(a, b) {
  if (a === b) return 1
  const largo = Math.max(a.length, b.length)
  const puntos = Math.max(similitud(a, b), similitud(sinRepetidas(a), sinRepetidas(b)))
  if (sinRepetidas(a) === sinRepetidas(b)) return puntos
  // «Ajo» y «Ají» son cosas distintas: en un nombre muy corto no basta con una letra de diferencia
  if (largo <= 3) return 0
  if (largo <= LARGO_CORTO) return diferencias(sinRepetidas(a), sinRepetidas(b)) <= 1 ? puntos : 0
  return puntos >= SIMILITUD_MINIMA ? puntos : 0
}

/**
 * El nombre de `lista` al que más se parece `texto`, por si es un error de dedo (Gatired → Gatorade,
 * Azucar → Azúcar), o null. Es solo una sugerencia: no impide guardar.
 * No avisa si `texto` ya es un registro de la lista (ese caso es «ya existe») ni si es el
 * mismo nombre que `excluir` (lo que se está editando).
 */
export function nombreParecido(texto, lista = [], { excluir } = {}) {
  const buscado = normalizar(texto)
  if (buscado.length < 3 || (excluir && mismoRegistro(texto, excluir))) return null
  if (lista.some(n => mismoRegistro(n, texto))) return null

  let mejor = null
  let puntosMejor = 0
  for (const nombre of lista) {
    if (excluir && mismoRegistro(nombre, excluir)) continue
    const puntos = parecido(buscado, normalizar(nombre))
    if (puntos > puntosMejor) {
      mejor = nombre
      puntosMejor = puntos
    }
  }
  return mejor
}
