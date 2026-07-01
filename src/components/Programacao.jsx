import { useState, useEffect } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { syncOp } from '../lib/offlineSync'

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

const SENHAS_COORD = { '1932': 'Alvarães', '1778': 'Eliel', '9089': 'Paula', '5050': 'Pr. Júnior', '4780': 'Pra. Stephanie' }

function getDiaAtual() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  if (diff >= 0 && diff < TOTAL_DIAS) return diff
  return 0
}

export default function Programacao({ onVoltar, sessao, onAjuda }) {
  const tx = useTexto()
  const [aba, setAba] = useState('louvor')
  const [diaSel, setDiaSel] = useState(getDiaAtual)
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)
  const [coordenador, setCoordenador] = useState(null)
  const [editando, setEditando] = useState(null)
  const [formSelecionado, setFormSelecionado] = useState('')
  const [formTema, setFormTema] = useState('')
  const [cadastros, setCadastros] = useState([])
  const [cadNome, setCadNome] = useState('')
  const [cadMembros, setCadMembros] = useState('')

  useEffect(() => { carregar(); carregarCadastros() }, [diaSel])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('programacao').select('*').eq('dia', DIAS[diaSel].num)
    setDados(data || [])
    setLoading(false)
  }

  async function carregarCadastros() {
    const { data } = await supabase.from('programacao_cadastro').select('*').order('nome')
    setCadastros(data || [])
  }

  function getDado(turnoId, tipo) {
    return dados.find(d => d.turno === turnoId && d.tipo === tipo)
  }

  function getCadastrosPorTipo(tipo) {
    return cadastros.filter(c => c.tipo === tipo)
  }

  function abrirEdicao(turnoId, tipo) {
    const atual = getDado(turnoId, tipo)
    setEditando({ turno: turnoId, tipo })
    setFormSelecionado(atual?.titulo || '')
    setFormTema(atual?.tema || '')
  }

  async function salvarEscala() {
    if (!editando || !formSelecionado) return
    const { turno, tipo } = editando
    const cadastro = cadastros.find(c => c.tipo === tipo && c.nome === formSelecionado)
    const payload = {
      dia: DIAS[diaSel].num, turno, tipo,
      titulo: formSelecionado,
      membros: tipo === 'louvor' ? (cadastro?.membros || null) : null,
      tema: tipo === 'ministro' ? (formTema.trim() || null) : null,
    }
    await syncOp('upsert', 'programacao', payload, { onConflict: 'dia,turno,tipo' })
    setEditando(null)
    carregar()
  }

  async function limpar(turnoId, tipo) {
    await syncOp('delete', 'programacao', { dia: DIAS[diaSel].num, turno: turnoId, tipo })
    setEditando(null)
    carregar()
  }

  async function adicionarCadastro(tipo) {
    if (tipo === 'ministro' && !cadNome.trim()) return
    if (tipo === 'louvor' && !cadNome.trim() && !cadMembros.trim()) return
    await syncOp('insert', 'programacao_cadastro', {
      tipo, nome: cadNome.trim() || 'Equipe sem nome', membros: tipo === 'louvor' ? (cadMembros.trim() || null) : null
    })
    setCadNome('')
    setCadMembros('')
    carregarCadastros()
  }

  async function removerCadastro(id) {
    await syncOp('delete', 'programacao_cadastro', { id })
    carregarCadastros()
  }

  const ABAS = [
    { id: 'louvor', label: '🎵 Louvor' },
    { id: 'ministro', label: '🎤 Preletores' },
    ...(coordenador ? [{ id: 'cadastro', label: '⚙️ Cadastro' }] : []),
  ]

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{tx.programacao}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {Object.values(SENHAS_COORD).includes(sessao?.nome) && (
            !coordenador ? (
              <button onClick={() => setCoordenador(sessao?.nome)} style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-strong)',
                background: 'var(--bg-card)', color: 'var(--text-muted)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>🔒 Coordenador</button>
            ) : (
              <button onClick={() => { setCoordenador(null); setEditando(null); setAba('louvor') }} style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--accent-border)',
                background: 'var(--accent-bg)', color: 'var(--accent-light)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>{coordenador} ✓</button>
            )
          )}
          {onAjuda && (
            <button onClick={onAjuda} style={{ width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>?</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setEditando(null) }} style={{
            flexShrink: 0, padding: '8px 16px', borderRadius: 20,
            border: '1px solid var(--border-strong)',
            background: aba === a.id ? 'var(--accent-glow)' : 'var(--bg-card)',
            color: aba === a.id ? 'var(--accent-light)' : 'var(--text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'Inter, sans-serif'
          }}>{a.label}</button>
        ))}
      </div>

      {aba === 'cadastro' && coordenador && (
        <div style={{ padding: '0 22px 100px' }}>
          {['louvor', 'ministro'].map(tipo => {
            const lista = getCadastrosPorTipo(tipo)
            return (
              <div key={tipo} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                  {tipo === 'louvor' ? '🎵 Equipes de Louvor' : '🎤 Preletores'}
                </div>

                {lista.map(c => (
                  <div key={c.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: '12px 14px', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                      {c.membros && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.membros}</div>
                      )}
                    </div>
                    <button onClick={() => removerCadastro(c.id)} style={{
                      width: 30, height: 30, borderRadius: 10, border: 'none',
                      background: 'rgba(239,68,68,0.15)', color: '#F87171',
                      fontSize: 13, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>✕</button>
                  </div>
                ))}

                {lista.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: 8 }}>
                    Nenhum{tipo === 'louvor' ? 'a equipe' : ' preletor'} cadastrad{tipo === 'louvor' ? 'a' : 'o'}
                  </div>
                )}

                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: 14
                }}>
                  <input
                    value={cadNome}
                    onChange={e => setCadNome(e.target.value)}
                    placeholder={tipo === 'louvor' ? tx.nomeDaEquipe : tx.nomeDoMinistro}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                      border: '1px solid var(--border-strong)', borderRadius: 12,
                      fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                  {tipo === 'louvor' && (
                    <input
                      value={cadMembros}
                      onChange={e => setCadMembros(e.target.value)}
                      placeholder={tx.membrosSeparados}
                      style={{
                        width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                        border: '1px solid var(--border-strong)', borderRadius: 12,
                        fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8,
                        fontFamily: 'Inter, sans-serif'
                      }}
                    />
                  )}
                  <button onClick={() => adicionarCadastro(tipo)} style={{
                    width: '100%', padding: 12, borderRadius: 12, border: 'none',
                    background: 'var(--gradient)', color: 'white',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                  }}>+ Adicionar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(aba === 'louvor' || aba === 'ministro') && (
        <>
          <div style={{ display: 'flex', gap: 6, padding: '0 22px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {DIAS.map((d, i) => (
              <button key={i} onClick={() => { setDiaSel(i); setEditando(null) }} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 16,
                border: diaSel === i ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
                background: diaSel === i ? 'var(--accent-bg)' : 'var(--bg-card)',
                color: diaSel === i ? 'var(--accent-light)' : 'var(--text-muted)',
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
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)', fontSize: 13 }}>{tx.carregando}</div>
            ) : (
              TURNOS.map(turno => {
                const dado = getDado(turno.id, aba)
                const estaEditando = editando?.turno === turno.id && editando?.tipo === aba
                const opcoes = getCadastrosPorTipo(aba)

                if (estaEditando) {
                  return (
                    <div key={turno.id} style={{
                      background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)',
                      borderRadius: 16, padding: 16, marginBottom: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>{turno.icon}</span>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700 }}>{turno.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--accent-light)', marginLeft: 4 }}>editando</span>
                      </div>

                      {opcoes.length > 0 ? (
                        <select
                          value={formSelecionado}
                          onChange={e => setFormSelecionado(e.target.value)}
                          style={{
                            width: '100%', padding: '12px 14px', background: 'var(--input-bg)',
                            border: '1px solid var(--border-strong)', borderRadius: 12,
                            fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8,
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          <option value="">{aba === 'louvor' ? tx.selecionarEquipe : tx.selecionarMinistro}</option>
                          {opcoes.map(o => (
                            <option key={o.id} value={o.nome}>{o.nome}{o.membros ? ` (${o.membros})` : ''}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{
                          padding: '12px 14px', background: 'rgba(245,158,11,0.08)',
                          border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12,
                          fontSize: 12, color: '#FBBF24', marginBottom: 8, textAlign: 'center'
                        }}>
                          Cadastre {aba === 'louvor' ? 'equipes' : 'preletores'} na aba Cadastro primeiro
                        </div>
                      )}

                      {aba === 'ministro' && formSelecionado && (
                        <input
                          value={formTema}
                          onChange={e => setFormTema(e.target.value)}
                          placeholder={tx.temaMinstracao}
                          style={{
                            width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                            border: '1px solid var(--border-strong)', borderRadius: 12,
                            fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8,
                            fontFamily: 'Inter, sans-serif'
                          }}
                        />
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={salvarEscala} disabled={!formSelecionado} style={{
                          flex: 1, padding: 12, borderRadius: 12, border: 'none',
                          background: formSelecionado ? 'var(--gradient)' : 'var(--input-bg)',
                          color: formSelecionado ? 'white' : 'var(--text-faint)',
                          fontSize: 13, fontWeight: 700, cursor: formSelecionado ? 'pointer' : 'not-allowed',
                          fontFamily: 'Inter, sans-serif'
                        }}>{tx.salvar}</button>
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
        </>
      )}

    </div>
  )
}
