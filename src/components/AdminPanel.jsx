import { useState, useEffect } from 'react'
import { PINOS } from '../lib/pinos'
import { supabase } from '../lib/supabase'

const NIVEL_COR = {
  maximo: { bg: 'rgba(124,58,237,0.18)', border: 'rgba(124,58,237,0.4)', text: '#A78BFA', label: 'Máximo' },
  alto:   { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: '#60A5FA', label: 'Alto' },
  medio:  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#34D399', label: 'Médio' },
  basico: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#FCD34D', label: 'Básico' },
  staff:  { bg: 'var(--bg-card)', border: 'var(--border)', text: 'var(--text-secondary)', label: 'Staff' },
}
const ORDEM = ['maximo', 'alto', 'medio', 'basico', 'staff']

export default function AdminPanel({ onVoltar }) {
  const [convidados, setConvidados] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('convidados').select('nome, pin').order('nome').then(({ data }) => {
      setConvidados(data || [])
      setLoading(false)
    })

    const channel = supabase
      .channel('admin_convidados')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'convidados' }, ({ new: novo }) => {
        setConvidados(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const grupos = ORDEM.map(nivel => ({
    nivel,
    membros: Object.entries(PINOS)
      .filter(([, d]) => d.nivel === nivel)
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }))

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>Bloco de Senhas</h2>
        <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-faint)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Acesso restrito</div>
      </div>

      <div style={{ padding: '20px 22px 100px' }}>
        {grupos.map(({ nivel, membros }) => {
          if (membros.length === 0) return null
          const cor = NIVEL_COR[nivel]
          return (
            <div key={nivel} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: cor.text, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                {cor.label}
                <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 400, letterSpacing: 0 }}>({membros.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {membros.map(([nome, dados]) => (
                  <div key={nome} style={{
                    background: cor.bg, border: `1px solid ${cor.border}`,
                    borderRadius: 14, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{nome}</span>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
                      color: cor.text, letterSpacing: '0.15em',
                      background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '3px 10px'
                    }}>{dados.pin}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#F87171', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            Convidados
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 400, letterSpacing: 0 }}>({convidados.length})</span>
          </div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '12px 0' }}>Carregando...</div>
          ) : convidados.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '12px 0' }}>Nenhum convidado cadastrado ainda.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {convidados.map(c => (
                <div key={c.nome} style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                  borderRadius: 14, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.nome}</span>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
                    color: '#F87171', letterSpacing: '0.15em',
                    background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '3px 10px'
                  }}>{c.pin}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
