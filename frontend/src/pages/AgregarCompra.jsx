import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import Header from '../components/Header'
import BloqueCompra from '../components/BloqueCompra'
import { Boton } from '../components/common'
import { guardarLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { springSuave } from '../styles/movimiento'
import { COMPRA } from '../utils/mensajes'
import estilos from './AgregarCompra.module.css'

/**
 * Página principal. Cada bloque es una compra distinta (un proveedor y una
 * fecha) y se guarda por separado. "Nueva compra" agrega otro bloque debajo; aparece
 * cuando alguna compra ya tiene una fila completa (formulario por pasos).
 * Props: puedeEditarArticulo (el usuario tiene catalogo.editar; activa el lápiz de cada artículo)
 */
export default function AgregarCompra({ puedeEditarArticulo = true }) {
  const { addToast } = useToast()
  const siguiente = useRef(2)
  const [bloques, setBloques] = useState([{ clave: 1, enfocar: false }])
  // Compras que ya tienen una fila completa: hasta entonces no se ofrece «Nueva compra»
  const [listos, setListos] = useState(() => new Set())
  const cambiarProgreso = useCallback((claveBloque, listo) => {
    setListos(prev => {
      if (prev.has(claveBloque) === listo) return prev
      const next = new Set(prev)
      if (listo) next.add(claveBloque)
      else next.delete(claveBloque)
      return next
    })
  }, [])
  const hayCompraLista = bloques.some(b => listos.has(b.clave))
  function nuevaCompra() {
    setBloques(prev => [...prev, { clave: siguiente.current++, enfocar: true }])
  }

  function retirarBloque(claveBloque) {
    setBloques(prev =>
      prev.length > 1
        ? prev.filter(b => b.clave !== claveBloque)
        : [{ clave: siguiente.current++, enfocar: false }]
    )
  }

  async function guardar(lista) {
    try {
      return await guardarLista(lista)
    } catch (error) {
      addToast(COMPRA.errorGuardar(error.message), 'error')
      throw error
    }
  }

  function alGuardado(claveBloque) {
    addToast(COMPRA.guardada)
    retirarBloque(claveBloque)
  }

  return (
    <>
      <Header title="Agregar compra" />

      <main id="contenido" tabIndex={-1} className={estilos.contenido}>
        {/* popLayout: la compra que sale no empuja a la que entra */}
        <AnimatePresence initial={false} mode="popLayout">
          {bloques.map((bloque, i) => (
            <motion.div
              key={bloque.clave}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={springSuave}
            >
              <BloqueCompra
                titulo={bloques.length > 1 ? `Detalle de compra ${i + 1}` : 'Detalle de compra'}
                alGuardar={guardar}
                alGuardado={() => alGuardado(bloque.clave)}
                alCancelar={() => retirarBloque(bloque.clave)}
                alCambiarProgreso={listo => cambiarProgreso(bloque.clave, listo)}
                enfocarAlMontar={bloque.enfocar}
                cancelarVacio={bloques.length > 1}
                puedeEditarArticulo={puedeEditarArticulo}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {hayCompraLista && (
          <div className={estilos.nuevaCompra}>
            <Boton variante="secundario" icono={<Plus />} onClick={nuevaCompra} className={estilos.botonNueva}>
              Nueva compra
            </Boton>
          </div>
        )}

      </main>

    </>
  )
}

