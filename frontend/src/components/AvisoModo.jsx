import { useEffect, useState } from 'react'
import { HardDrive, Server } from 'lucide-react'
import { detectarModo } from '../services/api'
import { DATOS } from '../utils/mensajes'
import estilos from './AvisoModo.module.css'

/** Dice si los datos van al servidor o se quedan en este navegador (Exportar y Cargar) */
export default function AvisoModo() {
  const [modo, setModo] = useState(null) // 'servidor' | 'local'

  useEffect(() => {
    let vigente = true
    detectarModo().then(m => { if (vigente) setModo(m) })
    return () => { vigente = false }
  }, [])

  if (!modo) return null
  const Icono = modo === 'servidor' ? Server : HardDrive
  return (
    <p className={estilos.aviso}>
      <Icono size={16} aria-hidden="true" />
      {modo === 'servidor' ? DATOS.modoServidor : DATOS.modoLocal}
    </p>
  )
}
