import { Plus, ShoppingCart } from 'lucide-react'
import Header from '../components/Header'
import { Tarjeta } from '../components/common'
import estilos from './Inicio.module.css'

const ACCIONES = [
  {
    a: '/compras',
    Icono: ShoppingCart,
    titulo: 'Ver compras',
    texto: 'Consulta y filtra el registro',
    destacada: false,
  },
  {
    a: '/agregar-compra',
    Icono: Plus,
    titulo: 'Agregar compra',
    texto: 'Registra lo que compraste hoy',
    destacada: true,
  },
]

export default function Inicio() {
  return (
    <>
      <Header title="Inicio" badge="De Panas SV" />
      <main id="contenido" tabIndex={-1}>
        <Tarjeta franja className={estilos.bienvenida}>
          <div className={estilos.texto}>
            <h2>¡Epa! Bienvenido a De Panas</h2>
            <p className={estilos.descripcion}>
              Hoy toca registrar las compras. Consulta, agrega y lleva el control de lo que entra a la cocina.
            </p>
            <p className={estilos.lema}>La verdadera sazón venezolana</p>
          </div>
          <div className={estilos.badgeCaja}>
            <img
              src="/brand/logo-badge.png"
              alt="Logotipo De Panas: Auténtico sabor venezolano"
              width="160"
              height="160"
              className={estilos.badge}
            />
          </div>
        </Tarjeta>

        <nav aria-label="Acciones rápidas" className={estilos.acciones}>
          {ACCIONES.map(({ a, Icono, titulo, texto, destacada }) => (
            <Tarjeta key={a} interactiva a={a} sombra={destacada} className={estilos.accion}>
              <span className={[estilos.circulo, destacada && estilos.circuloDestacado].filter(Boolean).join(' ')}>
                <Icono size={24} aria-hidden="true" />
              </span>
              <span className={estilos.accionTexto}>
                <span className={estilos.accionTitulo}>{titulo}</span>
                <span className={estilos.accionDescripcion}>{texto}</span>
              </span>
            </Tarjeta>
          ))}
        </nav>
      </main>
    </>
  )
}
