import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const INICIO = new Date(2026, 6, 15)
const INICIO_VISIVEL = new Date(2026, 6, 10)
const FIM = new Date(2026, 6, 25)

export default function Eventos({ onAbrirEscola }) {
  const [avisos, setAvisos] = useState([])
  const [diasRestantes, setDiasRestantes] = useState(0)
  const [status, setStatus] = useState('breve')

  useEffect(() => {
    const hj = new Date()
    hj.setHours(0, 0, 0, 0)
    const d = Math.ceil((INICIO.getTime() - hj.getTime()) / 86400000)
    setDiasRestantes(d)
    if (hj > FIM) setStatus('encerrado')
    else if (hj >= INICIO_VISIVEL) setStatus('disponivel')
    else setStatus('breve')

    supabase
      .from('avisos')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setAvisos(data)
      })
  }, [])

  return (
    <div style={{ padding: 16 }}>
      {avisos.length > 0 && (
        <div style={{
          background: '#eff6ff',
          border: '1.5px solid #bfdbfe',
          borderRadius: 16,
          padding: '14px 16px',
          marginBottom: 14
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#1e3a8a',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            marginBottom: 10
          }}>
            📢 Avisos
          </div>
          {avisos.map((a, i) => (
            <div
              key={a.id}
              style={{
                padding: '10px 0',
                borderBottom: i === avisos.length - 1 ? 'none' : '1px solid #e0effe',
                fontSize: 14,
                lineHeight: 1.5
              }}
            >
              {a.texto}
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {a.data} às {a.hora}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={onAbrirEscola}
        style={{
          background: '#fff',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1.5px solid #e2e8f0',
          cursor: 'pointer',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,.05)'
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6)',
          padding: '26px 20px 20px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,.18)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            padding: '4px 10px',
            borderRadius: 20,
            marginBottom: 12
          }}>
            🏫 Escola
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            Escola Impulse 2026
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
            15 a 25 de julho · Rancho Império
          </div>
        </div>
        <div style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {status === 'encerrado' && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Encerrado</span>
          )}
          {status === 'disponivel' && (
            <span style={{
              background: '#dcfce7',
              color: '#14532d',
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid #86efac'
            }}>
              ✓ Disponível
            </span>
          )}
          {status === 'breve' && (
            <span style={{
              background: '#fef9c3',
              color: '#854d0e',
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid #fde047'
            }}>
              ⏳ Em breve · {diasRestantes} dias
            </span>
          )}
          <span style={{ fontSize: 18, color: '#2563eb' }}>→</span>
        </div>
      </div>
    </div>
  )
}