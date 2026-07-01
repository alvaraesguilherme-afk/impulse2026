import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function CartaoAdv({ adv, onToggle }) {
  const hora = new Date(adv.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const data = new Date(adv.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 16, marginBottom: 8,
      background: adv.pago ? 'var(--bg-card)' : 'rgba(239,68,68,0.08)',
      border: adv.pago ? '1px solid var(--border)' : '1px solid rgba(239,68,68,0.28)',
      transition: 'opacity 0.2s', opacity: adv.pago ? 0.45 : 1
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: 'var(--text)',
          fontFamily: 'Syne, sans-serif',
          textDecoration: adv.pago ? 'line-through' : 'none'
        }}>{adv.aluno}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          {data} às {hora}
        </div>
      </div>
      <button onClick={() => onToggle(adv)} title={adv.pago ? 'Desfazer' : 'Marcar como paga'} style={{
        width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
        border: adv.pago ? '1px solid var(--border)' : '1px solid rgba(34,197,94,0.4)',
        background: adv.pago ? 'var(--bg-card)' : 'rgba(34,197,94,0.12)',
        color: adv.pago ? 'var(--text-faint)' : '#4ADE80',
        fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {adv.pago ? '↩' : '✓'}
      </button>
    </div>
  )
}

export default function Advertencias({ onVoltar }) {
  const [alunos, setAlunos] = useState([])
  const [advertencias, setAdvertencias] = useState([])
  const [alunoSel, setAlunoSel] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const [{ data: al }, { data: adv }] = await Promise.all([
      supabase.from('alunos').select('*').order('nome'),
      supabase.from('advertencias').select('*').order('created_at', { ascending: false })
    ])
    setAlunos(al || [])
    setAdvertencias(adv || [])
    setLoading(false)
  }

  async function salvarNovoAluno() {
    const nome = novoNome.trim()
    if (!nome) return
    const { data, error } = await supabase.from('alunos').insert({ nome }).select().single()
    if (!error && data) {
      setAlunos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setAlunoSel(nome)
    }
    setNovoNome('')
    setShowInput(false)
  }

  async function registrarAdvertencia() {
    if (!alunoSel || salvando) return
    setSalvando(true)
    const { data, error } = await supabase.from('advertencias').insert({ aluno: alunoSel, pago: false }).select().single()
    if (!error && data) setAdvertencias(prev => [data, ...prev])
    setAlunoSel(null)
    setSalvando(false)
  }

  async function togglePago(adv) {
    const novoPago = !adv.pago
    setAdvertencias(prev => prev.map(a => a.id === adv.id ? { ...a, pago: novoPago } : a))
    await supabase.from('advertencias').update({ pago: novoPago }).eq('id', adv.id)
  }

  const pendentes = advertencias.filter(a => !a.pago)
  const pagas = advertencias.filter(a => a.pago)

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-tela)', zIndex: 10 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--bg-card)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: '1px solid var(--border)', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Advertências</h2>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          {pendentes.length > 0 && <span style={{ color: '#F87171' }}>{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      <div style={{ padding: '20px 22px 0' }}>

        {/* Label seção */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
          Registrar advertência
        </div>

        {/* Chips de alunos */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {alunos.map(a => (
            <button key={a.id} onClick={() => setAlunoSel(alunoSel === a.nome ? null : a.nome)} style={{
              padding: '9px 18px', borderRadius: 22,
              border: alunoSel === a.nome ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
              background: alunoSel === a.nome ? 'var(--accent-bg)' : 'var(--bg-card)',
              color: alunoSel === a.nome ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s ease'
            }}>{a.nome}</button>
          ))}

          {!showInput ? (
            <button onClick={() => setShowInput(true)} style={{
              padding: '9px 18px', borderRadius: 22,
              border: '1.5px dashed var(--border-strong)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}>+ novo aluno</button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 4 }}>
              <input
                autoFocus
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') salvarNovoAluno()
                  if (e.key === 'Escape') { setShowInput(false); setNovoNome('') }
                }}
                placeholder="Nome do aluno..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12,
                  background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
                  color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif'
                }}
              />
              <button onClick={salvarNovoAluno} style={{
                padding: '10px 16px', borderRadius: 12, border: 'none',
                background: 'var(--accent)', color: 'white',
                fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}>OK</button>
              <button onClick={() => { setShowInput(false); setNovoNome('') }} style={{
                padding: '10px 12px', borderRadius: 12,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer'
              }}>✕</button>
            </div>
          )}
        </div>

        {/* Botão registrar — aparece ao selecionar aluno */}
        {alunoSel && (
          <button onClick={registrarAdvertencia} disabled={salvando} style={{
            width: '100%', padding: '15px', borderRadius: 16, border: 'none',
            background: salvando ? 'rgba(239,68,68,0.5)' : '#DC2626',
            color: 'white', fontSize: 15, fontWeight: 700,
            cursor: salvando ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne, sans-serif', marginBottom: 4,
            boxShadow: '0 4px 20px rgba(220,38,38,0.35)'
          }}>
            ⚠️ Registrar advertência para {alunoSel}
          </button>
        )}
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 0' }} />

      {/* Lista */}
      <div style={{ padding: '20px 22px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
        ) : advertencias.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma advertência registrada</div>
          </div>
        ) : (
          <>
            {pendentes.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#F87171', marginBottom: 12 }}>
                  Pendentes · {pendentes.length}
                </div>
                {pendentes.map(adv => <CartaoAdv key={adv.id} adv={adv} onToggle={togglePago} />)}
              </>
            )}

            {pagas.length > 0 && (
              <div style={{ marginTop: pendentes.length > 0 ? 24 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Penalidade cumprida · {pagas.length}
                </div>
                {pagas.map(adv => <CartaoAdv key={adv.id} adv={adv} onToggle={togglePago} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
