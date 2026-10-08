import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, Plus, Upload } from 'lucide-react'
import Header from '../components/Header'
import BloqueCompra from '../components/BloqueCompra'
import { Boton } from '../components/common'
import { detectarModo, guardarLista } from '../services/api'
import { useToast } from '../context/ToastContext'
import { springSuave } from '../styles/movimiento'
import { COMPRA, DATOS, fraseDelDia } from '../utils/mensajes'
import estilos from './AgregarCompra.module.css'

/**
 * Página principal. Cada bloque es una compra distinta (un proveedor y una
 * fecha) y se guarda por separado. "Nueva compra" agrega otro bloque debajo.
 *
 * Al final, Exportar datos y Cargar datos abren sus propias pantallas
 * (/exportar y /cargar); cada botón se ve solo si el usuario puede entrar a esa pantalla.
 */
export default function AgregarCompra({ puedeExportar = true, puedeCargar = true }) {
  const { addToast } = useToast()
  const siguiente = useRef(2)
  const [bloques, setBloques] = useState([{ clave: 1, enfocar: false }])
  const [modo, setModo] = useState(null) // 'servidor' | 'local'

  useEffect(() => {
    let vigente = true
    detectarModo().then(m => { if (vigente) setModo(m) })
    return () => { vigente = false }
  }, [])

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

  function alGuardado(claveBloque, lista) {
    addToast(COMPRA.guardada(lista.proveedor, lista.materiales.length))
    retirarBloque(claveBloque)
  }

  return (
    <>
      <Header title="Agregar compra" frase={fraseDelDia('/')} />

      <main id="contenido" tabIndex={-1}>
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
                alGuardado={lista => alGuardado(bloque.clave, lista)}
                alCancelar={() => retirarBloque(bloque.clave)}
                enfocarAlMontar={bloque.enfocar}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <div className={estilos.nuevaCompra}>
          <Boton variante="secundario" icono={<Plus />} onClick={nuevaCompra} className={estilos.botonNueva}>
            Nueva compra
          </Boton>
        </div>

        {/* Botones de portabilidad de base de datos */}
        <div className={estilos.portabilidad}>
          {puedeExportar && (
            <Boton variante="fantasma" icono={<Download size={16} />} a="/exportar">
              Exportar datos
            </Boton>
          )}
          {puedeCargar && (
            <Boton variante="fantasma" icono={<Upload size={16} />} a="/cargar">
              Cargar datos
            </Boton>
          )}
          {modo && (
            <p className={estilos.modo}>
              {modo === 'servidor' ? DATOS.modoServidor : DATOS.modoLocal}
            </p>
          )}
        </div>
      </main>

    </>
  )
}
