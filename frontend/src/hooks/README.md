# hooks/

Hooks reutilizables sin UI propia. Lo que dibuja algo va en `components/`.

| Hook                         | Uso                                                                 |
| ---------------------------- | ------------------------------------------------------------------- |
| `useFocoAtrapado(activo, alCerrar, focoInicialRef)` | Devuelve un ref para el contenedor: atrapa Tab/Shift+Tab, cierra con Escape y devuelve el foco al cerrar. Lo usa `Modal`. |
| `useScrollDetectado()`       | Devuelve `[centinelaRef, hayScroll]` con `IntersectionObserver` (sin listener de scroll). Lo usa `Header`. |
| `useConsultaMedia(consulta)` | `true` mientras se cumpla la media query. Lo usa `ToastContext` para elegir el borde de entrada. |

```jsx
const contenedorRef = useFocoAtrapado(true, cerrar, botonCancelarRef)
return <div ref={contenedorRef} role="dialog">…</div>
```

**Convención:** el plugin `react-hooks` v7 rechaza `setState` síncrono dentro de `useEffect` y escribir refs durante el render. Actualiza estado en callbacks (observadores, eventos, promesas) y refs dentro de efectos.
