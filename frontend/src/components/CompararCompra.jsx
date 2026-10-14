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

/** Materiales como tarjetas: se ven todos sus atributos sin scroll horizontal */
function TablaMateriales({ materiales, lado, seleccion, cambiar, disabled }) {
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
          return (
            <tr key={i} className={elegido ? estilos.elegido : undefined}>
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
              <td className={estilos.nombre}>{m.material}</td>
              {ATRIBUTOS.map(([clave, valor]) => (
                <td key={clave} className={clave === 'monto' ? estilos.monto : undefined}>
                  <span className={estilos.etiqueta}>{CARGAR[clave]}</span>
                  {valor(m)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Resumen({ compra }) {
  return (
    <p className={estilos.resumen}>
      <span>{compra.proveedor} · {formatearFecha(compra.fecha)}</span>
      <span className={estilos.total}>{formatearPrecio(totalLista(compra))}</span>
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
        <p className={estilos.ayuda}>{CARGAR.compararAyuda}</p>

        <div className={estilos.lados}>
          {['existente', 'entrante'].map(lado => {
            const compra = comparacion[lado]
            const etiqueta = CARGAR[lado]
            const clave = lado === 'existente' ? 'existentes' : 'entrantes'
            return (
              <section key={lado} className={estilos.lado} aria-label={`${etiqueta}: ${compra.proveedor}`}>
                <h3 className={estilos.ladoTitulo}>
                  <Insignia tono={lado === 'existente' ? 'neutro' : 'aviso'}>{etiqueta}</Insignia>
                </h3>
                <Resumen compra={compra} />
                <TablaMateriales
                  materiales={compra.materiales}
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
                    <span className={estilos.opcionValor}>{valor}</span>
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
