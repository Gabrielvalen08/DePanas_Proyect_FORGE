import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, Plus, Upload } from 'lucide-react'
import Header from '../components/Header'
import BloqueCompra from '../components/BloqueCompra'
import ConfirmModal from '../components/ConfirmModal'
import { Boton } from '../components/common'
import { detectarModo, exportarDB, guardarLista, importarDB } from '../services/api'
import { useToast } from '../context/ToastContext'
import { springSuave } from '../styles/movimiento'
import estilos from './AgregarCompra.module.css'

/**
 * Página principal. Cada bloque es una compra distinta (un proveedor y una
 * fecha) y se guarda por separado. "Nueva compra" agrega otro bloque debajo.
 *
 * Al final hay botones de Exportar/Cargar datos para llevar la base de datos
 * de un dispositivo a otro sin internet. Cargar un .db reemplaza la base
 * (con confirmación y respaldo); cargar un .json agrega las compras nuevas.
 */
export default function AgregarCompra() {
  const { addToast } = useToast()
  const siguiente = useRef(2)
  const inputArchivoRef = useRef(null)
  const [bloques, setBloques] = useState([{ clave: 1, enfocar: false }])
  const [modo, setModo] = useState(null) // 'servidor' | 'local'
  const [archivoPorReemplazar, setArchivoPorReemplazar] = useState(null)

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
      addToast('Datos exportados correctamente')
    } catch (error) {
      addToast(`No se pudo exportar: ${error.message}`, 'error')
    }
  }

  async function importar(archivo) {
    try {
      const resultado = await importarDB(archivo)
      addToast(
        resultado?.nuevas !== undefined
          ? `Datos cargados: ${resultado.nuevas} compra${resultado.nuevas !== 1 ? 's' : ''} nueva${resultado.nuevas !== 1 ? 's' : ''}`
          : 'Base de datos reemplazada. Se guardó un respaldo de la anterior en el servidor.'
      )
    } catch (error) {
      addToast(`No se pudo cargar el archivo: ${error.message}`, 'error')
    }
  }

  function handleArchivo(e) {
    const archivo = e.target.files?.[0]
    // Limpiar el input para permitir elegir el mismo archivo de nuevo
    e.target.value = ''
    if (!archivo) return
    // Un .db reemplaza TODA la base: se confirma antes. Un .json solo agrega compras.
    if (/\.(db|sqlite)$/i.test(archivo.name)) setArchivoPorReemplazar(archivo)
    else importar(archivo)
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
            hidden
            onChange={handleArchivo}
            aria-label="Seleccionar archivo de base de datos para importar"
          />
          {modo && (
            <p className={estilos.modo}>
              {modo === 'servidor'
                ? 'Las compras se guardan en la base de datos del servidor.'
                : 'Servidor no disponible: las compras se guardan solo en este navegador.'}
            </p>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={archivoPorReemplazar !== null}
        onClose={() => setArchivoPorReemplazar(null)}
        onConfirm={() => importar(archivoPorReemplazar)}
        title="Reemplazar la base de datos"
        message={`Se reemplazarán todas las compras de este equipo por las de "${archivoPorReemplazar?.name ?? ''}". Se guardará un respaldo de la base actual en el servidor.`}
        confirmLabel="Reemplazar"
        danger
      />
    </>
  )
}
