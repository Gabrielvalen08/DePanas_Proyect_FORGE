import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TrendingUp, Package, Plus } from 'lucide-react'
import Header from '../components/Header'

export default function Inicio() {
  const navigate = useNavigate()

  return (
    <>
      <Header title="Inicio" badge="De Panas SV" />
      <main className="content" id="inicio-content">
        {/* Welcome */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--brown) 0%, var(--primary-dark) 100%)', color: 'var(--white)' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--white)', marginBottom: 8 }}>
                ¡Bienvenido a De Panas! 🍽️
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 420 }}>
                Sistema de gestión de compras e inventario para tu restaurante. Registra, consulta y analiza tus compras de forma fácil.
              </p>
            </div>
            <div style={{ fontSize: 64 }}>🧑‍🍳</div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/compras')}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52,
                background: 'var(--cream)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--black)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingCart size={24} color="var(--brown)" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Ver Compras</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>Pantalla maestra</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/agregar-compra')}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52,
                background: 'var(--primary)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--black)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-solid)',
              }}>
                <Plus size={24} color="var(--white)" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Agregar Compra</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>Registrar nueva compra</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
