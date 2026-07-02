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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function getDiaAtual() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  if (diff >= 0 && diff < TOTAL_DIAS) return diff
  return 0
}

const MEMBROS_FIXOS = ['Alyson', 'Caetano', 'Daniel', 'Joyce', 'Juliana']
const MEMBROS_EXTRAS = ['Stephany', 'Victória', 'Maria Clara']

const FUNCOES_PADRAO = ['Stories', 'Fotografia', 'Gravação de vídeo']
const TURNOS = [
  { id: 'M', label: 'Manhã', icon: '🌅', temFixas: true },
  { id: 'T', label: 'Tarde', icon: '☀️', temFixas: false },
  { id: 'N', label: 'Noite', icon: '🌙', temFixas: true },
]

const SENHAS_COORD = { '0404': 'Caetano', '2121': 'Alyson', '2306': 'Alvarães', '5050': 'Pr. Júnior', '4780': 'Pra. Stephanie' }

const CICLO_APOIO = ['M', 'T', 'N', 'F']
const TURNO_NOME = { M: 'Manhã', T: 'Tarde', N: 'Noite', F: 'Folga' }
const EQUIPE_MEMBRO = {
  'Stephany': { equipeId: 'azul', offset: 2 },
  'Maria Clara': { equipeId: 'verde', offset: 0 },
  'Victória': { equipeId: 'amarelo', offset: 1 },
}

function getTurnoApoio(nome, diaNum) {
  const eq = EQUIPE_MEMBRO[nome]
  if (!eq) return null
  const diff = diaNum - 1
  if (diff < 0 || diff > 10) return null
  if (eq.equipeId === 'vermelho' && diff === 0) return 'N'
  if (diff === 0) return null
  return CICLO_APOIO[(diff - 1 + eq.offset) % 4]
}

function checarDisponibilidade(nome, diaNum, turnoMidia) {
  if (MEMBROS_FIXOS.includes(nome)) return { livre: true }
  const turnoApoio = getTurnoApoio(nome, diaNum)
  if (!turnoApoio || turnoApoio === 'F') return { livre: true }
  if (turnoApoio === turnoMidia) return { livre: false, motivo: `Apoio (${TURNO_NOME[turnoApoio]})` }
  return { livre: true }
}

export default function Midia({ onVoltar, sessao, onAjuda }) {
  const tx = useTexto()
  const hj = new Date(); hj.setHours(0, 0, 0, 0)
  const [diaSel, setDiaSel] = useState(getDiaAtual)
  const [escalas, setEscalas] = useState([])
  const [loading, setLoading] = useState(false)
  const [coordenador, setCoordenador] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [novaFuncao, setNovaFuncao] = useState('')
  const [funcaoSelecionada, setFuncaoSelecionada] = useState('')

  useEffect(() => { carregarEscalas() }, [diaSel])

  async function carregarEscalas() {
    setLoading(true)
    const { data } = await supabase
      .from('midia_escalas')
      .select('*')
      .eq('dia', DIAS[diaSel].num)
      .order('created_at', { ascending: true })
    setEscalas(data || [])
    setLoading(false)
  }

  async function atribuirPessoa(turno, funcao, pessoa) {
    const existing = escalas.find(e => e.turno === turno && e.funcao === funcao)
    if (existing) {
      await syncOp('update', 'midia_escalas', { values: { pessoa: pessoa || null }, filters: { id: existing.id } })
    } else {
      await syncOp('insert', 'midia_escalas', {
        dia: DIAS[diaSel].num, turno, funcao, pessoa: pessoa || null, fixo: true
      })
    }
    carregarEscalas()
  }

  async function adicionarFuncao(turno) {
    const nome = funcaoSelecionada === 'outra' ? novaFuncao.trim() : funcaoSelecionada
    if (!nome) return
    await syncOp('insert', 'midia_escalas', {
      dia: DIAS[diaSel].num, turno, funcao: nome, pessoa: null, fixo: FUNCOES_PADRAO.includes(nome)
    })
    setNovaFuncao('')
    setFuncaoSelecionada('')
    setAddingTo(null)
    carregarEscalas()
  }

  async function removerFuncao(id) {
    await syncOp('delete', 'midia_escalas', { id })
    carregarEscalas()
  }

  function getEscalasTurno(turnoId) {
    const turno = TURNOS.find(t => t.id === turnoId)
    const registros = escalas.filter(e => e.turno === turnoId)
    const resultado = []

    if (turno.temFixas) {
      for (const funcao of FUNCOES_PADRAO) {
        const reg = registros.find(e => e.funcao === funcao)
        resultado.push({ id: reg?.id, funcao, pessoa: reg?.pessoa || '', fixo: true, removivel: false })
      }
      for (const e of registros) {
        if (!FUNCOES_PADRAO.includes(e.funcao)) {
          resultado.push({ id: e.id, funcao: e.funcao, pessoa: e.pessoa || '', fixo: false, removivel: true })
        }
      }
    } else {
      for (const e of registros) {
        resultado.push({ id: e.id, funcao: e.funcao, pessoa: e.pessoa || '', fixo: FUNCOES_PADRAO.includes(e.funcao), removivel: true })
      }
    }

    return resultado
  }

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{tx.midia}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {Object.values(SENHAS_COORD).includes(sessao?.nome) && (
            !coordenador ? (
              <button onClick={() => setCoordenador(sessao?.nome)} style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-strong)',
                background: 'var(--bg-card)', color: 'var(--text-muted)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>🔒 Coordenador</button>
            ) : (
              <button onClick={() => setCoordenador(null)} style={{
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

      <div style={{ padding: '12px 22px 0' }}>
        <div onClick={() => setDiaSel(getDiaAtual())} style={{
          background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
          borderRadius: 16, padding: '14px 18px', marginBottom: 4, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(96,165,250,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Hoje</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#60A5FA' }}>
              {hj.getDate()} de {MESES[hj.getMonth()]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {DIAS_SEMANA[hj.getDay()]}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(96,165,250,0.6)', fontWeight: 600 }}>Ver escala</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '12px 22px', marginBottom: 4 }}>
        {DIAS.map((d, i) => {
          const isSel = diaSel === i
          const isHoje = d.data.getTime() === hj.getTime()
          return (
            <div key={i} onClick={() => setDiaSel(i)} style={{
              background: isSel ? 'var(--accent-bg)' : 'var(--bg-card)',
              border: isSel ? '1px solid var(--accent-border)' : isHoje ? '1px solid rgba(96,165,250,0.4)' : '1px solid var(--border)',
              borderRadius: 14, padding: '10px 4px', textAlign: 'center', cursor: 'pointer'
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>{DIAS_C[d.data.getDay()]}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: isSel ? 'var(--accent-light)' : isHoje ? '#60A5FA' : 'white' }}>{d.data.getDate()}</div>
              <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 1 }}>Jul</div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '0 22px 100px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
            {DIAS[diaSel].data.getDate()} de {MESES[DIAS[diaSel].data.getMonth()]}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {DIAS_SEMANA[DIAS[diaSel].data.getDay()]}
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)', fontSize: 13 }}>{tx.carregando}</div>
        ) : (
          TURNOS.filter(turno => !(DIAS[diaSel].num === 1 && turno.id !== 'N')).map(turno => {
            const itens = getEscalasTurno(turno.id)
            return (
              <div key={turno.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{turno.icon}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>{turno.label}</span>
                  {!turno.temFixas && itens.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic', marginLeft: 4 }}>{tx.semEscala}</span>
                  )}
                </div>

                {itens.map((item, idx) => {
                  const pessoaIndisponivel = item.pessoa && MEMBROS_EXTRAS.includes(item.pessoa)
                    ? checarDisponibilidade(item.pessoa, DIAS[diaSel].num, turno.id)
                    : null

                  return (
                    <div key={item.id || `fixed-${idx}`} style={{
                      background: item.pessoa === sessao?.nome ? 'rgba(250,204,21,0.04)' : 'var(--bg-card)',
                      border: item.pessoa === sessao?.nome ? '1.5px solid rgba(250,204,21,0.5)' : '1px solid var(--border)',
                      borderRadius: 16, padding: '12px 14px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.funcao}
                          {item.fixo && <span style={{ fontSize: 9, background: 'var(--accent-bg)', color: 'var(--accent-light)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>FIXA</span>}
                        </div>
                        {coordenador ? (
                          <>
                            <select
                              value={item.pessoa}
                              onChange={e => atribuirPessoa(turno.id, item.funcao, e.target.value)}
                              style={{
                                width: '100%', padding: '8px 10px', background: 'var(--input-bg)',
                                border: '1px solid var(--border-strong)', borderRadius: 10,
                                fontSize: 12, color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif'
                              }}
                            >
                              <option value="">{tx.selecionarPessoa}</option>
                              <optgroup label={tx.equipeFixa}>
                                {MEMBROS_FIXOS.map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </optgroup>
                              <optgroup label={tx.esporadicos}>
                                {MEMBROS_EXTRAS.map(m => {
                                  const disp = checarDisponibilidade(m, DIAS[diaSel].num, turno.id)
                                  return (
                                    <option key={m} value={m}>
                                      {m} {disp.livre ? '— ' + tx.livre : `— ${disp.motivo}`}
                                    </option>
                                  )
                                })}
                              </optgroup>
                            </select>
                            {pessoaIndisponivel && !pessoaIndisponivel.livre && (
                              <div style={{
                                marginTop: 6, padding: '6px 10px', borderRadius: 8,
                                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                                fontSize: 11, color: '#FBBF24', fontWeight: 500
                              }}>
                                ⚠️ {item.pessoa} está no {pessoaIndisponivel.motivo} neste turno
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: item.pessoa ? 'var(--text-secondary)' : 'var(--text-faint)', fontStyle: item.pessoa ? 'normal' : 'italic' }}>
                              {item.pessoa || tx.naoAtribuido}
                            </span>
                            {item.pessoa && MEMBROS_EXTRAS.includes(item.pessoa) && pessoaIndisponivel && !pessoaIndisponivel.livre && (
                              <span style={{ fontSize: 9, background: 'rgba(245,158,11,0.2)', color: '#FBBF24', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>APOIO</span>
                            )}
                          </div>
                        )}
                      </div>
                      {coordenador && item.removivel && (
                        <button onClick={() => removerFuncao(item.id)} style={{
                          width: 32, height: 32, borderRadius: 10, border: 'none',
                          background: 'rgba(239,68,68,0.15)', color: '#F87171',
                          fontSize: 14, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>✕</button>
                      )}
                    </div>
                  )
                })}

                {coordenador && (
                  addingTo === turno.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      <select
                        value={funcaoSelecionada}
                        onChange={e => setFuncaoSelecionada(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                          border: '1px solid var(--border-strong)', borderRadius: 12,
                          fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        <option value="">Selecione a função...</option>
                        {FUNCOES_PADRAO.filter(f => !itens.some(i => i.funcao === f)).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                        <option value="outra">+ Outra função...</option>
                      </select>
                      {funcaoSelecionada === 'outra' && (
                        <input
                          value={novaFuncao}
                          onChange={e => setNovaFuncao(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && adicionarFuncao(turno.id)}
                          placeholder={tx.nomeFuncao}
                          autoFocus
                          style={{
                            width: '100%', padding: '10px 14px', background: 'var(--input-bg)',
                            border: '1px solid var(--border-strong)', borderRadius: 12,
                            fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif'
                          }}
                        />
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => adicionarFuncao(turno.id)}
                          disabled={!funcaoSelecionada || (funcaoSelecionada === 'outra' && !novaFuncao.trim())}
                          style={{
                            flex: 1, padding: 10, borderRadius: 12, border: 'none',
                            background: (!funcaoSelecionada || (funcaoSelecionada === 'outra' && !novaFuncao.trim())) ? 'var(--input-bg)' : 'var(--gradient)',
                            color: (!funcaoSelecionada || (funcaoSelecionada === 'outra' && !novaFuncao.trim())) ? 'var(--text-faint)' : 'var(--text)',
                            fontSize: 13, fontWeight: 700,
                            cursor: (!funcaoSelecionada || (funcaoSelecionada === 'outra' && !novaFuncao.trim())) ? 'not-allowed' : 'pointer',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >+ Adicionar</button>
                        <button onClick={() => { setAddingTo(null); setNovaFuncao(''); setFuncaoSelecionada('') }} style={{
                          padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-strong)',
                          background: 'var(--bg-card)', color: 'var(--text-muted)',
                          fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                        }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTo(turno.id); setNovaFuncao(''); setFuncaoSelecionada('') }} style={{
                      width: '100%', padding: '10px', borderRadius: 12,
                      border: '1px dashed var(--border-strong)', background: 'transparent',
                      color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', marginTop: 4, fontFamily: 'Inter, sans-serif'
                    }}>{tx.adicionarFuncao}</button>
                  )
                )}
              </div>
            )
          })
        )}

        <div style={{
          marginTop: 16, background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 16
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{tx.equipeMidia}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MEMBROS_FIXOS.map(m => (
              <span key={m} style={{ fontSize: 11, background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', borderRadius: 20, padding: '4px 10px', color: 'var(--accent-light)', fontWeight: 500 }}>{m}</span>
            ))}
            {MEMBROS_EXTRAS.map(m => {
              const turnoApoio = getTurnoApoio(m, DIAS[diaSel].num)
              const ocupado = turnoApoio && turnoApoio !== 'F'
              return (
                <span key={m} style={{
                  fontSize: 11, borderRadius: 20, padding: '4px 10px', fontWeight: 500,
                  background: ocupado ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  border: ocupado ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(16,185,129,0.25)',
                  color: ocupado ? '#FBBF24' : '#6EE7B7'
                }}>
                  {m} — {!turnoApoio || turnoApoio === 'F' ? tx.livreODiaTodo : `Apoio ${TURNO_NOME[turnoApoio]}`}
                </span>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
