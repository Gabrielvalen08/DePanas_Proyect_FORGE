import { Boton, Tarjeta } from './common'
import { totalLista } from '../services/api'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { CARGAR } from '../utils/mensajes'
import estilos from '../pages/PantallaCargar.module.css'

function TablaMateriales({ materiales, lado, seleccion, cambiar, disabled }) {
  return (
    <div className={estilos.tablaContenedor}>
      <table className={`${estilos.tabla} ${estilos.tablaComparacion}`} aria-label={lado}>
        <thead className="solo-lector"><tr>
          {seleccion && <th scope="col"><span className="solo-lector">{CARGAR.final}</span></th>}
          {[CARGAR.material, CARGAR.cantidad, CARGAR.unidad, CARGAR.monto, CARGAR.categoria, CARGAR.producto].map(t => <th scope="col" key={t}>{t}</th>)}
        </tr></thead>
        <tbody>{materiales.map((m, i) => <tr key={i} className={seleccion?.includes(i) ? estilos.materialElegido : undefined}>
          {seleccion && <td className={estilos.casillaMaterial}><input type="checkbox" aria-label={CARGAR.conservar(lado, i + 1)} checked={seleccion.includes(i)} disabled={disabled}
            onChange={e => cambiar(e.target.checked ? [...seleccion, i] : seleccion.filter(n => n !== i))} /></td>}
          <td className={estilos.nombreMaterial}>{m.material}</td>
          <td><span className={estilos.etiquetaCelda}>{CARGAR.cantidad}</span>{m.cantidad}</td>
          <td><span className={estilos.etiquetaCelda}>{CARGAR.unidad}</span>{m.unidad}</td>
          <td><span className={estilos.etiquetaCelda}>{CARGAR.monto}</span>{formatearPrecio(m.monto)}</td>
          <td><span className={estilos.etiquetaCelda}>{CARGAR.categoria}</span>{m.categoria || '—'}</td>
          <td className={estilos.productoMaterial}><span className={estilos.etiquetaCelda}>{CARGAR.producto}</span>{m.producto || '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  )
}

export default function CompararCompra({ comparacion, decision, alCambiar, ocupado }) {
  const { existente, entrante, origen } = comparacion
  const descartada = decision.accion === 'omitir'
  const materiales = [...decision.existentes.map(i => existente.materiales[i]), ...decision.entrantes.map(i => entrante.materiales[i])]
  const final = { proveedor: comparacion[decision.proveedor].proveedor, fecha: comparacion[decision.fecha].fecha, materiales }
  return (
    <Tarjeta titulo={`${CARGAR.comparar}: ${existente.proveedor}`}>
      <div className={estilos.cuerpo}>
        <p>{CARGAR.compararAyuda}</p>
        <div className={estilos.comparacion}>
          {['existente', 'entrante'].map(lado => {
            const compra = comparacion[lado]
            const etiqueta = CARGAR[lado]
            return <section key={lado} className={estilos.lado} aria-label={`${etiqueta}: ${compra.proveedor}`}>
              <h3>{etiqueta}</h3>
              <p>{compra.proveedor} · {formatearFecha(compra.fecha)} · {formatearPrecio(totalLista(compra))}</p>
              <TablaMateriales materiales={compra.materiales} lado={etiqueta}
                seleccion={decision[lado === 'existente' ? 'existentes' : 'entrantes']}
                cambiar={indices => alCambiar({ [lado === 'existente' ? 'existentes' : 'entrantes']: indices })}
                disabled={ocupado || descartada} />
            </section>
          })}
        </div>
        <div className={estilos.datosFinales}>
          {['proveedor', 'fecha'].map(campo => <fieldset key={campo} className={estilos.opciones} disabled={ocupado || descartada}>
            <legend>{CARGAR[campo]}</legend>
            {['existente', 'entrante'].map(lado => <label key={lado}>
              <input type="radio" name={`${origen}-${campo}`} value={lado} checked={decision[campo] === lado} onChange={() => alCambiar({ [campo]: lado })} />
              {CARGAR[lado]}: {campo === 'fecha' ? formatearFecha(comparacion[lado][campo]) : comparacion[lado][campo]}
            </label>)}
          </fieldset>)}
        </div>
        <Boton variante={descartada ? 'secundario' : 'fantasma'} aria-pressed={descartada} disabled={ocupado}
          onClick={() => alCambiar({ accion: descartada ? 'combinar' : 'omitir' })}>{CARGAR.descartar}</Boton>
        {!descartada && <div className={estilos.final}>
          <h3>{CARGAR.final}</h3>
          <p>{final.proveedor} · {formatearFecha(final.fecha)} · {formatearPrecio(totalLista(final))}</p>
          <TablaMateriales materiales={materiales} lado={CARGAR.final} />
          {!materiales.length && <p role="alert" className={estilos.error}>{CARGAR.minimo}</p>}
        </div>}
      </div>
    </Tarjeta>
  )
}
