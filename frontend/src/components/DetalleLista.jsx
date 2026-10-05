import { useState } from 'react'
import { Pencil, ShoppingCart, Trash2 } from 'lucide-react'
import BloqueCompra from './BloqueCompra'
import ConfirmModal from './ConfirmModal'
import { Boton, CuerpoModal, Modal, PieModal } from './common'
import { actualizarLista, eliminarLista, totalLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { formatearFechaTexto, formatearPrecio } from '../utils/formato'
import estilos from './DetalleLista.module.css'

/**
 * DetalleLista
 * Modal con los productos de una lista de compra. Permite editarla
 * (BloqueCompra dentro del modal) y eliminarla con confirmación.
 * Props: lista (null = cerrado), alCerrar, alCambio (tras editar o eliminar)
 */
export default function DetalleLista({ lista, alCerrar, alCambio }) {
  const { addToast } = useToast()
  const [modo, setModo] = useState('ver') // 'ver' | 'editar'
  const [confirmando, setConfirmando] = useState(false)

  function cerrar() {
    setModo('ver')
    alCerrar()
  }

  async function guardarCambios(datos) {
    try {
      return await actualizarLista(lista.id, datos)
    } catch (error) {
      addToast('Error al actualizar la compra', 'error')
      throw error
    }
  }

  function alGuardado() {
    addToast('Compra actualizada')
    cerrar()
    alCambio()
  }

  async function eliminar() {
    try {
      await eliminarLista(lista.id)
      addToast('Compra eliminada')
      cerrar()
      alCambio()
    } catch {
      addToast('Error al eliminar la compra', 'error')
    }
  }

  const n = lista?.materiales.length ?? 0

  return (
    <>
      <Modal
        abierto={lista !== null}
        alCerrar={cerrar}
        titulo={modo === 'editar' ? 'Editar compra' : `Compra en ${lista?.proveedor ?? ''}`}
        icono={<ShoppingCart />}
        anchoMax={modo === 'editar' ? 'lg' : 'md'}
      >
        {lista && modo === 'ver' && (
          <>
            <CuerpoModal>
              <dl className={estilos.datos}>
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatearFechaTexto(lista.fecha)}</dd>
                </div>
                <div>
                  <dt>Materiales</dt>
                  <dd>{n}</dd>
                </div>
              </dl>

              <table className={estilos.tabla}>
                <caption className="solo-lector">Materiales de la compra</caption>
                <thead>
                  <tr>
                    <th scope="col">Material</th>
                    <th scope="col">Cantidad</th>
                    <th scope="col" className={estilos.numerico}>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.materiales.map((m, i) => (
                    <tr key={`${m.material}-${i}`}>
                      <td className={estilos.producto}>{m.material}</td>
                      <td>{m.cantidad} {m.unidad}</td>
                      <td className={estilos.numerico}>{formatearPrecio(m.monto !== undefined ? m.monto : m.precio)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={2}>Gasto total</th>
                    <td className={`${estilos.numerico} ${estilos.total}`}>{formatearPrecio(totalLista(lista))}</td>
                  </tr>
                </tfoot>
              </table>
            </CuerpoModal>
            <PieModal>
              <Boton
                variante="fantasma"
                icono={<Trash2 />}
                onClick={() => setConfirmando(true)}
                className={estilos.eliminar}
              >
                Eliminar
              </Boton>
              <Boton variante="primario" icono={<Pencil />} onClick={() => setModo('editar')}>
                Editar
              </Boton>
            </PieModal>
          </>
        )}

        {lista && modo === 'editar' && (
          <div className={estilos.edicion}>
            <BloqueCompra
              plano
              inicial={lista}
              textoGuardar="Guardar cambios"
              alGuardar={guardarCambios}
              alGuardado={alGuardado}
              alCancelar={() => setModo('ver')}
              enfocarAlMontar
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={eliminar}
        title="Eliminar compra"
        message={`¿Seguro que deseas eliminar la compra en ${lista?.proveedor ?? ''} con ${n} material${n !== 1 ? 'es' : ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </>
  )
}
