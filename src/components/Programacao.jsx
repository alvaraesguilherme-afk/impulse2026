import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const INICIO = new Date(2026, 6, 15)
const TOTAL_DIAS = 11
const DIAS = Array.from({ length: TOTAL_DIAS }, (_, i) => {
  const d = new Date(INICIO.getTime() + i * 86400000)
  return { num: i + 1, data: d, label: `${d.getDate()} Jul` }
})

const TURNOS = [
  { id: 'M', label: 'Manhã', icon: '🌅' },
  { id: 'N', label: 'Noite', icon: '🌙' },
]

const SENHAS_COORD = ['1932', '1778', '9089']

function getDiaAtual() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  if (diff >= 0 && diff < TOTAL_DIAS) return diff
  return 0
}

export default function Programacao({ onVoltar }) {
  const [aba, setAba] = useState('louvor')
  const [diaSel, setDiaSel] = useState(getDiaAtual)
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)
  const [coordenador, setCoordenador] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [editando, setEditando] = useState(null)
  const [formTitulo, setFormTitulo] = useState('')
  const [formMembros, setFormMembros] = useState('')
  const [formTema, setFormTema] = useState('')

  useEffect(() => { carregar() }, [diaSel])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('programacao')
      .select('*')
      .eq('dia', DIAS[diaSel].num)
    setDados(data || [])
    setLoading(false)
  }

  function verificarSenha() {
    if (SENHAS_COORD.includes(senhaInput)) {
      setCoordenador(true)
      setShowLogin(false)
    } else {
      setSenhaErro('Senha incorreta.')
    }
  }

  function getDado(turnoId, tipo) {
    return dados.find(d => d.turno === turnoId && d.tipo === tipo)
  }

  function abrirEdicao(turnoId, tipo) {
    const atual = getDado(turnoId, tipo)
    setEditando({ turno: turnoId, tipo })
    setFormTitulo(atual?.titulo || '')
    setFormMembros(atual?.membros || '')
    setFormTema(atual?.tema || '')
  }

  async function salvar() {
    if (!editando) return
    const { turno, tipo } = editando
    const payload = {
      dia: DIAS[diaSel].num,
      turno,
      tipo,
      titulo: formTitulo.trim() || null,
      membros: tipo === 'louvor' ? (formMembros.trim() || null) : null,
      tema: tipo === 'ministro' ? (formTema.trim() || null) : null,
    }
    await supabase.from('programacao').upsert(payload, { onConflict: 'dia,turno,tipo' })
    setEditando(null)
    carregar()
  }

  async function limpar(turnoId, tipo) {
    await supabase.from('programacao').delete().eq('dia', DIAS[diaSel].num).eq('turno', turnoId).eq('tipo', tipo)
    setEditando(null)
    carregar()
  }

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>Programação</h2>
        <div style={{ marginLeft: 'auto' }}>
          {!coordenador ? (
            <button onClick={() => { setShowLogin(true); setSenhaInput(''); setSenhaErro('') }} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-strong)',
              background: 'var(--bg-card)', color: 'var(--text-muted)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}>🔒 Coordenador</button>
          ) : (
            <button onClick={() => { setCoordenador(false); setEditando(null) }} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(124,58,237,0.4)',
              background: 'rgba(124,58,237,0.15)', color: '#C4B5FD',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}>✓ Editando</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '16px 22px' }}>
        {[{ id: 'louvor', label: '🎵 Equipes de Louvor' }, { id: 'ministro', label: '🎤 Ministros' }].map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setEditando(null) }} style={{
            flexShrink: 0, padding: '8px 16px', borderRadius: 20,
            border: '1px solid var(--border-strong)',
            background: aba === a.id ? 'rgba(124,58,237,0.3)' : 'var(--bg-card)',
            color: aba === a.id ? '#C4B5FD' : 'var(--text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'Inter, sans-serif'
          }}>{a.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 22px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {DIAS.map((d, i) => (
          <button key={i} onClick={() => { setDiaSel(i); setEditando(null) }} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 16,
            border: diaSel === i ? '1px solid rgba(124,58,237,0.5)' : '1px solid var(--border-strong)',
            background: diaSel === i ? 'rgba(124,58,237,0.25)' : 'var(--bg-card)',
            color: diaSel === i ? '#C4B5FD' : 'var(--text-muted)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Dia {d.num}</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{d.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '0 22px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>
          Dia {DIAS[diaSel].num} <span style={{ color: 'var(--text-faint)', fontWeight: 500, fontSize: 14 }}>· {DIAS[diaSel].label}</span>
        </div>
      </div>

      <div style={{ padding: '0 22px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)', fontSize: 13 }}>Carregando...</div>
        ) : (
          TURNOS.map(turno => {
            const dado = getDado(turno.id, aba)
            const estaEditando = editando?.turno === turno.id && editando?.tipo === aba

            if (estaEditando) {
              return (
                <div key={turno.id} style={{
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 16, padding: 16, marginBottom: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>{turno.icon}</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700 }}>{turno.label}</span>
                    <span style={{ fontSize: 10, color: '#C4B5FD', marginLeft: 4 }}>editando</span>
                  </div>
                  <input
                    value={formTitulo}
                    onChange={e => setFormTitulo(e.target.value)}
                    placeholder={aba === 'louvor' ? 'Nome da equipe...' : 'Nome do ministro...'}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                      border: '1px solid var(--border-strong)', borderRadius: 12,
                      fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                  {aba === 'louvor' && (
                    <input
                      value={formMembros}
                      onChange={e => setFormMembros(e.target.value)}
                      placeholder="Membros (separados por vírgula)..."
                      style={{
                        width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                        border: '1px solid var(--border-strong)', borderRadius: 12,
                        fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8,
                        fontFamily: 'Inter, sans-serif'
                      }}
                    />
                  )}
                  {aba === 'ministro' && (
                    <input
                      value={formTema}
                      onChange={e => setFormTema(e.target.value)}
                      placeholder="Tema da ministração (opcional)..."
                      style={{
                        width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                        border: '1px solid var(--border-strong)', borderRadius: 12,
                        fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8,
                        fontFamily: 'Inter, sans-serif'
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={salvar} style={{
                      flex: 1, padding: 12, borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg,#7C3AED,#60A5FA)', color: 'var(--text)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                    }}>Salvar</button>
                    {dado && (
                      <button onClick={() => limpar(turno.id, aba)} style={{
                        padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)', color: '#F87171',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                      }}>Limpar</button>
                    )}
                    <button onClick={() => setEditando(null)} style={{
                      padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-strong)',
                      background: 'var(--bg-card)', color: 'var(--text-muted)',
                      fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                    }}>✕</button>
                  </div>
                </div>
              )
            }

            if (!dado || !dado.titulo) {
              return (
                <div key={turno.id} onClick={() => coordenador && abrirEdicao(turno.id, aba)} style={{
                  background: 'var(--bg-card)', border: '1px dashed var(--border-strong)',
                  borderRadius: 16, padding: '16px 14px', marginBottom: 8,
                  cursor: coordenador ? 'pointer' : 'default'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{turno.icon}</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700 }}>{turno.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', paddingLeft: 24 }}>
                    {coordenador ? 'Toque para definir' : 'A definir'}
                  </div>
                </div>
              )
            }

            const membrosArr = aba === 'louvor' && dado.membros
              ? dado.membros.split(',').map(m => m.trim()).filter(Boolean)
              : []

            return (
              <div key={turno.id} onClick={() => coordenador && abrirEdicao(turno.id, aba)} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '16px 14px', marginBottom: 8,
                cursor: coordenador ? 'pointer' : 'default'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{turno.icon}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700 }}>{turno.label}</span>
                  {coordenador && <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto' }}>toque para editar</span>}
                </div>
                <div style={{ paddingLeft: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: membrosArr.length > 0 ? 8 : 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      background: aba === 'louvor' ? 'linear-gradient(135deg,#1E1B4B,#6366F1)' : 'linear-gradient(135deg,#7F1D1D,#EF4444)'
                    }}>{aba === 'louvor' ? '🎵' : '🎤'}</div>
                    <div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700 }}>{dado.titulo}</div>
                      {aba === 'ministro' && dado.tema && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{dado.tema}</div>}
                    </div>
                  </div>
                  {membrosArr.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {membrosArr.map(m => (
                        <span key={m} style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '4px 10px', color: '#A5B4FC', fontWeight: 500 }}>{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Coordenador</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Digite sua senha para editar a programação</p>
            <input
              type="password" value={senhaInput}
              onChange={e => { setSenhaInput(e.target.value); setSenhaErro('') }}
              onKeyDown={e => e.key === 'Enter' && verificarSenha()}
              placeholder="••••" maxLength={10} autoFocus
              style={{ width: '100%', padding: '14px 16px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: '.3em', outline: 'none', color: 'var(--text)', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}
            />
            {senhaErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{senhaErro}</p>}
            <button onClick={verificarSenha} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#7C3AED,#60A5FA)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'var(--text)', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>Entrar</button>
            <button onClick={() => setShowLogin(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
