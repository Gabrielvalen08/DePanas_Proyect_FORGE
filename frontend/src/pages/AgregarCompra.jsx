import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, Plus, Upload } from 'lucide-react'
import Header from '../components/Header'
import BloqueCompra from '../components/BloqueCompra'
import { Boton } from '../components/common'
import { exportarDB, guardarLista, importarDB } from '../services/api'
import { useToast } from '../context/ToastContext'
import { springSuave } from '../styles/movimiento'
import estilos from './AgregarCompra.module.css'

/**
 * Página principal. Cada bloque es una compra distinta (un proveedor y una
 * fecha) y se guarda por separado. "Nueva compra" agrega otro bloque debajo.
 *
 * En la esquina inferior derecha hay botones de Exportar/Importar para
 * sincronizar la base de datos entre dos dispositivos sin necesidad de internet.
 */
export default function AgregarCompra() {
  const { addToast } = useToast()
  const siguiente = useRef(2)
  const inputArchivoRef = useRef(null)
  const [bloques, setBloques] = useState([{ clave: 1, enfocar: false }])

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
      addToast('Error al guardar la compra', 'error')
      throw error
    }
  }

  function alGuardado(claveBloque, lista) {
    const n = lista.materiales.length
    addToast(`Compra en ${lista.proveedor} guardada (${n} material${n !== 1 ? 'es' : ''})`)
    retirarBloque(claveBloque)
  }

  // --- Exportar / Importar ---
  async function handleExportar() {
    try {
      await exportarDB()
      addToast('Base de datos exportada correctamente')
    } catch {
      addToast('Error al exportar la base de datos', 'error')
    }
  }

  async function handleImportar(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    try {
      await importarDB(archivo)
      addToast('Base de datos importada correctamente. Recarga para ver los cambios.')
    } catch {
      addToast('Error al importar el archivo. Verifica el formato (.db, .sqlite o .json).', 'error')
    } finally {
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      e.target.value = ''
    }
  }

  return (
    <>
      <Header title="Agregar compra" />

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
          <Boton
            variante="fantasma"
            icono={<Download size={16} />}
            onClick={handleExportar}
            title="Exportar base de datos (.db / .json)"
          >
            Exportar datos
          </Boton>
          <Boton
            variante="fantasma"
            icono={<Upload size={16} />}
            onClick={() => inputArchivoRef.current?.click()}
            title="Cargar base de datos (.db / .json)"
          >
            Cargar datos
          </Boton>
          {/* Input oculto para selección de archivo */}
          <input
            ref={inputArchivoRef}
            type="file"
            accept=".db,.sqlite,.json"
            style={{ display: 'none' }}
            onChange={handleImportar}
            aria-label="Seleccionar archivo de base de datos para importar"
          />
        </div>
      </main>
    </>
  )
}
