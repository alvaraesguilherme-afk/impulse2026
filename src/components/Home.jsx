import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const INICIO = new Date(2026, 6, 15)

export default function Home({ onNavegar }) {
  const [avisos, setAvisos] = useState([])
  const [diasRestantes, setDiasRestantes] = useState(0)

  useEffect(() => {
    const hj = new Date()
    hj.setHours(0, 0, 0, 0)
    const d = Math.ceil((INICIO.getTime() - hj.getTime()) / 86400000)
    setDiasRestantes(d)
    supabase.from('avisos').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAvisos(data)
    })
  }, [])

  const modulos = [
    { id: 'apoio', icon: '🙌', nome: 'Apoio', desc: 'Escalas e times', grad: 'linear-gradient(145deg,#4C1D95,#7C3AED)' },
    { id: 'checkin', icon: '✅', nome: 'Check-in', desc: 'Chegadas', grad: 'linear-gradient(145deg,#064E3B,#10B981)' },
    { id: 'staff', icon: '👤', nome: 'Staff', desc: 'Colaboradores', grad: 'linear-gradient(145deg,#0C4A6E,#0EA5E9)' },
    { id: 'alunos', icon: '🎒', nome: 'Alunos', desc: 'Dados e ID', grad: 'linear-gradient(145deg,#881337,#F43F5E)' },
    { id: 'midia', icon: '🎥', nome: 'Mídia', desc: 'Em breve', grad: 'linear-gradient(145deg,#78350F,#F59E0B)' },
    { id: 'louvor', icon: '🎵', nome: 'Louvor', desc: 'Em breve', grad: 'linear-gradient(145deg,#1E1B4B,#6366F1)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 300, height: 300, background: '#5B21B6', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, background: '#0EA5E9', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, bottom: 200, left: -60 }} />
        <div style={{ position: 'absolute', width: 150, height: 150, background: '#F59E0B', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, bottom: 300, right: -40 }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span>Escola Impulse</span>
        </div>
        <div style={{ padding: '24px 22px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 30, padding: '6px 14px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
            <div style={{ width: 7, height: 7, background: '#EF4444', borderRadius: '50%', boxShadow: '0 0 8px #EF4444', animation: 'blink 1.5s infinite' }} />
            {diasRestantes > 0 ? `${diasRestantes} dias para o evento` : 'Evento em andamento'}
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, marginBottom: 8 }}>
            Escola<br />
            <span style={{ background: 'linear-gradient(90deg,#A78BFA,#60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span><br />
            2026
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>15 a 25 de julho · Rancho Império</div>
        </div>
        <div style={{ display: 'flex', margin: '32px 22px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
          {[['15', 'Jul início'], ['10', 'Dias'], ['40+', 'Staff']].map(([n, l], i) => (
            <div key={i} style={{ flex: 1, padding: '16px 12px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800 }}>{n}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
        {avisos.length > 0 && (
          <div style={{ margin: '0 22px 24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => onNavegar('supervisor')}>
            <div style={{ fontSize: 20 }}>📢</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{avisos[0].texto}</p>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{avisos[0].data} às {avisos[0].hora}</span>
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>›</div>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', padding: '0 22px', marginBottom: 14 }}>Módulos</div>
        <div style={{ display: 'flex', gap: 10, padding: '0 22px 100px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {modulos.map(m => (
            <div key={m.id} onClick={() => onNavegar(m.id)}
              style={{ flexShrink: 0, width: 140, height: 160, borderRadius: 24, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', background: m.grad }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: 28 }}>{m.icon}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{m.nome}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}