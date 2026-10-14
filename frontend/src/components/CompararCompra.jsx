import { ArrowLeftRight, Check, Undo2, X } from 'lucide-react'
import { Boton, Insignia, Tarjeta } from './common'
import { totalLista } from '../services/api'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { CARGAR } from '../utils/mensajes'
import estilos from './CompararCompra.module.css'

const ATRIBUTOS = [
  ['cantidad', m => m.cantidad],
  ['unidad', m => m.unidad],
  ['monto', m => formatearPrecio(m.monto)],
  ['categoria', m => m.categoria || '—'],
  ['producto', m => m.producto || '—'],
]

const nombreNormal = texto => (texto ?? '').trim().toLowerCase()
const valorNormal = (m, clave) => m[clave] ?? ''
const huella = m => JSON.stringify(ATRIBUTOS.map(([clave]) => valorNormal(m, clave)).concat(nombreNormal(m.material)))

/**
 * Qué cambió en cada material frente a la otra compra:
 *  - null: hay uno idéntico del otro lado
 *  - { campos: [...] }: el mismo material, con esos atributos distintos
 *  - { solo: true }: el material no está del otro lado
 * Primero empareja los idénticos y luego por nombre, sin usar dos veces la misma fila.
 */
function diferenciasMateriales(propios, otros) {
  const usados = new Set()
  const libre = condicion => otros.findIndex((o, k) => !usados.has(k) && condicion(o))
  const resultado = propios.map(m => {
    const j = libre(o => huella(o) === huella(m))
    if (j < 0) return undefined
    usados.add(j)
    return null
  })
  return resultado.map((r, i) => {
    if (r !== undefined) return r
    const m = propios[i]
    const j = libre(o => nombreNormal(o.material) === nombreNormal(m.material))
    if (j < 0) return { solo: true }
    usados.add(j)
    return { campos: ATRIBUTOS.map(([clave]) => clave).filter(clave => valorNormal(m, clave) !== valorNormal(otros[j], clave)) }
  })
}

/** Materiales como tarjetas: se ven todos sus atributos sin scroll horizontal */
function TablaMateriales({ materiales, lado, seleccion, cambiar, disabled, diferencias }) {
  const conCasilla = Boolean(seleccion)
  return (
    <table className={[estilos.materiales, conCasilla && estilos.conCasilla].filter(Boolean).join(' ')} aria-label={lado}>
      <thead className="solo-lector">
        <tr>
          {conCasilla && <th scope="col">{CARGAR.final}</th>}
          <th scope="col">{CARGAR.material}</th>
          {ATRIBUTOS.map(([clave]) => <th scope="col" key={clave}>{CARGAR[clave]}</th>)}
        </tr>
      </thead>
      <tbody>
        {materiales.map((m, i) => {
          const elegido = seleccion?.includes(i)
          const diferencia = diferencias?.[i]
          return (
            <tr key={i} className={[elegido && estilos.elegido, diferencia?.solo && estilos.soloAqui].filter(Boolean).join(' ') || undefined}>
              {conCasilla && (
                <td className={estilos.casillaCelda}>
                  <input
                    type="checkbox"
                    className={estilos.casilla}
                    aria-label={CARGAR.conservar(lado, i + 1)}
                    checked={elegido}
                    disabled={disabled}
                    onChange={e => cambiar(e.target.checked ? [...seleccion, i] : seleccion.filter(n => n !== i))}
                  />
                </td>
              )}
              <td className={[estilos.nombre, diferencia?.solo && estilos.distinto].filter(Boolean).join(' ')}>
                {m.material}
                {diferencia?.solo && <Insignia tono="error" className={estilos.insigniaSolo}>{CARGAR.soloAqui}</Insignia>}
              </td>
              {ATRIBUTOS.map(([clave, valor]) => {
                const cambio = diferencia?.solo || diferencia?.campos?.includes(clave)
                return (
                  <td key={clave} className={clave === 'monto' ? estilos.monto : undefined}>
                    <span className={estilos.etiqueta}>{CARGAR[clave]}</span>
                    <span className={cambio && !diferencia?.solo ? estilos.valorDistinto : undefined}>{valor(m)}</span>
                    {cambio && !diferencia?.solo && <span className="solo-lector"> ({CARGAR.cambio})</span>}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** otra: la compra del otro lado; lo que no coincide se marca en Vinotinto */
function Resumen({ compra, otra }) {
  const marca = distinto => (otra && distinto ? estilos.valorDistinto : undefined)
  const total = totalLista(compra)
  return (
    <p className={estilos.resumen}>
      <span>
        <span className={marca(compra.proveedor !== otra?.proveedor)}>{compra.proveedor}</span>
        {' · '}
        <span className={marca(compra.fecha !== otra?.fecha)}>{formatearFecha(compra.fecha)}</span>
      </span>
      <span className={`${estilos.total} ${marca(otra && Math.abs(total - totalLista(otra)) > 0.004) ?? ''}`}>{formatearPrecio(total)}</span>
    </p>
  )
}

/**
 * Una compra que ya existe y llega con cambios: la guardada frente a la del
 * archivo. Se marcan las filas que se quedan y de dónde salen proveedor y fecha.
 */
export default function CompararCompra({ comparacion, decision, alCambiar, ocupado }) {
  const { existente, entrante, origen } = comparacion
  const descartada = decision.accion === 'omitir'
  const materiales = [...decision.existentes.map(i => existente.materiales[i]), ...decision.entrantes.map(i => entrante.materiales[i])]
  const final = { proveedor: comparacion[decision.proveedor].proveedor, fecha: comparacion[decision.fecha].fecha, materiales }

  return (
    <Tarjeta titulo={`${CARGAR.comparar}: ${existente.proveedor}`} icono={<ArrowLeftRight />} franja>
      <div className={estilos.cuerpo}>
        <div className={estilos.ayuda}>
          <p>{CARGAR.compararAyuda}</p>
          <p className={estilos.leyenda}>
            <span className={estilos.valorDistinto}>{CARGAR.leyendaMuestra}</span> {CARGAR.leyenda}
          </p>
        </div>

        <div className={estilos.lados}>
          {['existente', 'entrante'].map(lado => {
            const compra = comparacion[lado]
            const etiqueta = CARGAR[lado]
            const clave = lado === 'existente' ? 'existentes' : 'entrantes'
            const otra = comparacion[lado === 'existente' ? 'entrante' : 'existente']
            return (
              <section key={lado} className={estilos.lado} aria-label={`${etiqueta}: ${compra.proveedor}`}>
                <h3 className={estilos.ladoTitulo}>
                  <Insignia tono={lado === 'existente' ? 'neutro' : 'aviso'}>{etiqueta}</Insignia>
                </h3>
                <Resumen compra={compra} otra={otra} />
                <TablaMateriales
                  materiales={compra.materiales}
                  diferencias={diferenciasMateriales(compra.materiales, otra.materiales)}
                  lado={etiqueta}
                  seleccion={decision[clave]}
                  cambiar={indices => alCambiar({ [clave]: indices })}
                  disabled={ocupado || descartada}
                />
              </section>
            )
          })}
        </div>

        <div className={estilos.datos}>
          {['proveedor', 'fecha'].map(campo => (
            <fieldset key={campo} className={estilos.grupo} disabled={ocupado || descartada}>
              <legend className={estilos.legenda}>{CARGAR[campo]}</legend>
              {['existente', 'entrante'].map(lado => {
                const valor = campo === 'fecha' ? formatearFecha(comparacion[lado][campo]) : comparacion[lado][campo]
                const activa = decision[campo] === lado
                const distinto = comparacion.existente[campo] !== comparacion.entrante[campo]
                return (
                  <label key={lado} className={[estilos.opcion, activa && estilos.opcionActiva].filter(Boolean).join(' ')}>
                    <input
                      type="radio"
                      className={estilos.radio}
                      name={`${origen}-${campo}`}
                      value={lado}
                      checked={activa}
                      onChange={() => alCambiar({ [campo]: lado })}
                    />
                    <span className={estilos.opcionLado}>{CARGAR[lado]}:</span>{' '}
                    <span className={[estilos.opcionValor, distinto && estilos.valorDistinto].filter(Boolean).join(' ')}>{valor}</span>
                    {activa && <Check className={estilos.opcionCheck} aria-hidden="true" />}
                  </label>
                )
              })}
            </fieldset>
          ))}
        </div>

        {descartada ? (
          <p className={estilos.descartadaNota}>{CARGAR.descartadaNota}</p>
        ) : (
          <section className={estilos.final} aria-label={CARGAR.final}>
            <h3 className={estilos.finalTitulo}>{CARGAR.final}</h3>
            <Resumen compra={final} />
            <TablaMateriales materiales={materiales} lado={CARGAR.final} />
            {!materiales.length && <p role="alert" className={estilos.error}>{CARGAR.minimo}</p>}
          </section>
        )}

        <div className={estilos.pie}>
          {/* El texto dice lo que hará el botón: descartar o volver a traerla */}
          <Boton
            variante={descartada ? 'secundario' : 'fantasma'}
            icono={descartada ? <Undo2 /> : <X />}
            disabled={ocupado}
            onClick={() => alCambiar({ accion: descartada ? 'combinar' : 'omitir' })}
          >
            {descartada ? CARGAR.recuperar : CARGAR.descartar}
          </Boton>
        </div>
      </div>
    </Tarjeta>
  )
}
