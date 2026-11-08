import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import AvisoSalida from '../components/AvisoSalida'

const Contexto = createContext(null)

/**
 * Vigila los formularios con datos sin guardar y avisa antes de perderlos. Va una sola vez,
 * en App, porque useBlocker (que exige un router de datos, ver main.jsx) admite uno solo.
 *
 * Qué dispara el aviso:
 *  - cambiar de pantalla, con cualquier formulario sucio (menú, Regresar, Atrás): useBlocker;
 *  - cerrar una ventana de edición (X, Esc, clic fuera): solo si esa ventana está sucia;
 *  - Cerrar sesión y Apagar, antes de su propia confirmación: usePedirSalida;
 *  - recargar o cerrar la pestaña: la ventana genérica del navegador (beforeunload).
 *
 * «Registrar» corre el flujo normal del formulario (validación y «¿Guardamos…?»). Si guarda
 * bien se sigue a donde iba, salvo que quede otro formulario sucio: entonces el aviso vuelve.
 */
export function DatosSinGuardarProvider({ children }) {
  const entradasRef = useRef(new Map()) // id → { sucio, registrar, soltada }
  const [sucias, setSucias] = useState([]) // copia para dibujar: [[id, entrada]]
  const [pedido, setPedido] = useState(null) // { continuar, soloId } fuera de la navegación
  const [registrando, setRegistrando] = useState(false)

  const leerSucias = useCallback(
    soloId => [...entradasRef.current].filter(([id, e]) => e.sucio && !e.soltada && (!soloId || id === soloId)),
    []
  )
  const actualizar = useCallback(() => setSucias(leerSucias()), [leerSucias])

  const anotar = useCallback((id, entrada) => {
    entradasRef.current.set(id, entrada)
    actualizar()
  }, [actualizar])

  const quitar = useCallback(id => {
    entradasRef.current.delete(id)
    actualizar()
  }, [actualizar])

  // Lo guardado o descartado ya no cuenta, aunque siga montado: AnimatePresence deja al
  // formulario en pantalla mientras termina su animación de salida
  const soltar = useCallback(id => {
    const entrada = entradasRef.current.get(id)
    if (entrada) entrada.soltada = true
    actualizar()
  }, [actualizar])

  /** Sigue con `continuar` si no hay nada que perder; si no, muestra el aviso (soloId: solo mira ese formulario) */
  const pedirSalida = useCallback((continuar, soloId) => {
    if (leerSucias(soloId).length === 0) continuar()
    else setPedido({ continuar, soloId })
  }, [leerSucias])

  const blocker = useBlocker(useCallback(
    ({ currentLocation: de, nextLocation: a }) =>
      (de.pathname !== a.pathname || de.search !== a.search) && leerSucias().length > 0,
    [leerSucias]
  ))

  const bloqueado = blocker.state === 'blocked'
  const activo = bloqueado ? { continuar: blocker.proceed, cancelar: blocker.reset } : pedido
  const relevantes = sucias.filter(([id]) => !activo?.soloId || id === activo.soloId)
  const paraRegistrar = relevantes.find(([, e]) => e.registrar)
  const haySucias = sucias.length > 0
  const proceder = blocker.proceed

  // Bloqueada y sin nada que perder (se guardó, o el formulario ya no está): sigue a donde iba.
  // Sin esto la navegación quedaría retenida, sin aviso, y el clic se perdería
  useEffect(() => {
    if (bloqueado && !haySucias && !registrando) proceder()
  }, [bloqueado, haySucias, registrando, proceder])

  function cancelar() {
    activo?.cancelar?.()
    setPedido(null)
  }

  function salirSinGuardar() {
    setPedido(null)
    activo?.continuar()
  }

  async function registrar() {
    const [, entrada] = paraRegistrar
    const { continuar, soloId } = activo
    const enNavegacion = bloqueado
    setRegistrando(true)
    const ok = await entrada.registrar()
    setRegistrando(false)
    if (!ok) {
      cancelar()
      return
    }
    // Si queda otro formulario con datos, el aviso vuelve. Una navegación la retoma el efecto de arriba
    if (leerSucias(soloId).length > 0 || enNavegacion) return
    setPedido(null)
    continuar()
  }

  // Recargar o cerrar la pestaña: el navegador no deja poner texto ni botones propios
  useEffect(() => {
    if (!haySucias) return undefined
    function avisar(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [haySucias])

  const valor = useMemo(() => ({ anotar, quitar, soltar, pedirSalida }), [anotar, quitar, soltar, pedirSalida])

  return (
    <Contexto.Provider value={valor}>
      {children}
      <AvisoSalida
        abierto={Boolean(activo) && relevantes.length > 0 && !registrando}
        conRegistrar={Boolean(paraRegistrar)}
        alSalir={salirSinGuardar}
        alRegistrar={registrar}
        alSeguir={cancelar}
      />
    </Contexto.Provider>
  )
}

/**
 * Un formulario avisa si tiene datos sin guardar. Sin provider no hace nada (pruebas de
 * una pantalla sola).
 *
 *  - sucio: hay cambios que se perderían.
 *  - registrar: arranca el flujo normal de guardar (p. ej. formRef.current.requestSubmit());
 *    sin ella, el aviso ofrece «Seguir aquí» en vez de «Registrar».
 *  - cierreRef: para una ventana. Su Modal llama a cierreRef.current(alCerrar) en la X, Esc y
 *    el clic fuera (ver useCierreConAviso).
 *
 * Devuelve cómo contar el resultado del flujo: terminar(ok) al guardar o fallar la validación,
 * aceptar() al confirmar «¿Guardamos…?» y cerrar() en el onClose de esa confirmación.
 * descartar() es para cuando la persona ya confirmó que desecha los datos. Tras terminar(true)
 * o descartar(), el formulario no vuelve a contar hasta que cambie `sucio`.
 */
export function useDatosSinGuardar({ sucio, registrar, cierreRef }) {
  const contexto = useContext(Contexto)
  const id = useId()
  const resolverRef = useRef(null)
  const aceptadaRef = useRef(false)
  const registrarRef = useRef(registrar)

  useEffect(() => {
    registrarRef.current = registrar
  }, [registrar])

  const soltar = contexto?.soltar
  const descartar = useCallback(() => soltar?.(id), [soltar, id])

  const terminar = useCallback(ok => {
    if (ok) descartar()
    resolverRef.current?.(ok)
    resolverRef.current = null
  }, [descartar])

  const aceptar = useCallback(() => {
    aceptadaRef.current = true
  }, [])

  // ConfirmDialog llama a onConfirm y después a onClose: sin aceptar, es que dijo que no
  const cerrar = useCallback(() => {
    if (!aceptadaRef.current) terminar(false)
    aceptadaRef.current = false
  }, [terminar])

  const conRegistrar = Boolean(registrar)
  const anotar = contexto?.anotar
  const quitar = contexto?.quitar
  const pedirSalida = contexto?.pedirSalida

  useEffect(() => {
    if (!anotar) return undefined
    const iniciar = () => new Promise(resolve => {
      resolverRef.current = resolve
      registrarRef.current?.()
    })
    anotar(id, { sucio, registrar: conRegistrar ? iniciar : null })
    return () => quitar(id)
  }, [anotar, quitar, id, sucio, conRegistrar])

  // Si el formulario desaparece a media operación (p. ej. venció la sesión), el aviso no queda esperando
  useEffect(() => () => {
    const pendiente = resolverRef.current
    if (pendiente) setTimeout(() => pendiente(false), 0)
  }, [])

  useEffect(() => {
    if (!cierreRef) return undefined
    cierreRef.current = continuar => (pedirSalida ? pedirSalida(continuar, id) : continuar())
    return () => { cierreRef.current = null }
  }, [cierreRef, pedirSalida, id])

  return useMemo(() => ({ terminar, aceptar, cerrar, descartar }), [terminar, aceptar, cerrar, descartar])
}

/** Para Cerrar sesión y Apagar: pedirSalida(continuar). Sin provider sigue de una vez */
export function usePedirSalida() {
  const pedirSalida = useContext(Contexto)?.pedirSalida
  return useCallback(continuar => (pedirSalida ? pedirSalida(continuar) : continuar()), [pedirSalida])
}

/**
 * Para una ventana cuyo formulario vive dentro de ella: devuelve el alCerrar de su Modal
 * (la X, Esc y el clic fuera pasan por el aviso) y el cierreRef para el formulario.
 */
export function useCierreConAviso(alCerrar) {
  const cierreRef = useRef(null)
  const intentarCerrar = useCallback(() => {
    if (cierreRef.current) cierreRef.current(alCerrar)
    else alCerrar()
  }, [alCerrar])
  return { intentarCerrar, cierreRef }
}
