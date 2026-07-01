import { useState } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { syncOp } from '../lib/offlineSync'

const EQUIPES = [
  { id: 'verde', nome: 'Equipe Verde', lideres: 'Jhony e Linda', membros: ['Emanuel','Hellen Borges','Isabely Matos','Joel Marcos','Jerônimo','Lívia Andréa'], offset: 0, cor: 'var(--accent-light)', grad: 'linear-gradient(135deg,#4C1D95,#7C3AED)', emoji: '🟢' },
  { id: 'amarelo', nome: 'Equipe Amarelo', lideres: 'Gustavo Massay e Taiwa', membros: ['Hugo Lacroix','Lorena','Maria Clara','Matheus Almeida','Stephany'], offset: 1, cor: '#FCD34D', grad: 'linear-gradient(135deg,#78350F,#F59E0B)', emoji: '🟡' },
  { id: 'azul', nome: 'Equipe Azul', lideres: 'Walterley e Maria Júlia', membros: ['Ludmyla','Mariana Gabrielle','Maurício','Rafael Chaves','Ryan Guedes'], offset: 2, cor: '#60A5FA', grad: 'linear-gradient(135deg,#0C4A6E,#0EA5E9)', emoji: '🔵' },
  { id: 'vermelho', nome: 'Equipe Vermelho', lideres: 'Francisco e Clara Cunha', membros: ['Gabriel Gomes','Gabriel Mendes','Letícia','Nicoly','Rennan','Victória'], offset: 3, cor: '#F87171', grad: 'linear-gradient(135deg,#7F1D1D,#EF4444)', emoji: '🔴' },
]

const CICLO = ['M','T','N','F']
const TURNO_KEY = { M:'manha', T:'tarde', N:'noite', F:'folga' }
const TAREFAS_TURNO = {
  M: ['servirCafe', 'lavarLoucas', 'limpezaRefeitorio', 'retiradaLixo'],
  T: ['servirAlmoco', 'lavarLoucas', 'limpezaRefeitorio', 'limpezaTemplo'],
  N: ['servirJantar', 'lavarLoucas', 'limpezaRefeitorio', 'limpezaTemplo'],
}
const TURNO_ICON = { M: '🌅', T: '☀️', N: '🌙', F: '😴' }
const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const INICIO = new Date(2026,6,15)
const FIM = new Date(2026,6,25)

const LIDERES_CHAMADA = [
  { nome: 'Alvarães', senha: '1932', equipeId: '' },
  { nome: 'Jhony', senha: '7780', equipeId: 'verde' },
  { nome: 'Gustavo Massay', senha: '1121', equipeId: 'amarelo' },
  { nome: 'Walterley', senha: '3123', equipeId: 'azul' },
  { nome: 'Francisco', senha: '6689', equipeId: 'vermelho' },
]

function getTurno(eq, data) {
  const diff = Math.round((data.getTime() - INICIO.getTime()) / 86400000)
  if (diff < 0 || diff > 10) return null
  if (eq.id === 'vermelho' && diff === 0) return 'N'
  if (diff === 0) return null
  return CICLO[(diff - 1 + eq.offset) % 4]
}

const dias = Array.from({ length: 11 }, (_, i) => new Date(INICIO.getTime() + i * 86400000))

function BackBtn({ onVoltar, titulo }) {
  return (
    <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
    </div>
  )
}

export default function Apoio({ onVoltar, sessao }) {
  const tx = useTexto()
  const [aba, setAba] = useState('times')
  const [lider] = useState(() => LIDERES_CHAMADA.find(l => l.nome === sessao?.nome) || null)
  const [diaSel, setDiaSel] = useState('')
  const [turnoSel, setTurnoSel] = useState('')
  const [chamadaData, setChamadaData] = useState({})
  const [erroSalvar, setErroSalvar] = useState(false)
  const hj = new Date(); hj.setHours(0,0,0,0)
  const [diaEscala, setDiaEscala] = useState(() => {
    const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
    if (diff >= 0 && diff <= 10) return dias[diff]
    return dias[0]
  })

  async function carregarChamada(ts, turno) {
    if (!ts || !turno) return
    const prefix = ts + '_' + turno + '_'
    const { data } = await supabase.from('chamada').select('chave,status,obs').like('chave', prefix + '%')
    const cache = {}
    if (data) data.forEach(r => { cache[r.chave] = { status: r.status, obs: r.obs || '' } })
    setChamadaData(cache)
  }

  async function marcar(chave, status) {
    const atual = chamadaData[chave]?.status || ''
    const novo = atual === status ? '' : status
    const obs = chamadaData[chave]?.obs || ''
    setChamadaData(prev => ({ ...prev, [chave]: { status: novo, obs } }))
    const ok = await syncOp('upsert', 'chamada', { chave, status: novo, obs }, { onConflict: 'chave' })
    if (!ok) setErroSalvar(true)
  }

  async function salvarObs(chave, obs) {
    const status = chamadaData[chave]?.status || ''
    setChamadaData(prev => ({ ...prev, [chave]: { status, obs } }))
    const ok = await syncOp('upsert', 'chamada', { chave, status, obs }, { onConflict: 'chave' })
    if (!ok) setErroSalvar(true)
  }

  const equipesFiltradas = lider?.equipeId === '' ? EQUIPES : EQUIPES.filter(e => e.id === lider?.equipeId)

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <BackBtn onVoltar={onVoltar} titulo={tx.escalasDeServico} />
      <div style={{ display: 'flex', gap: 8, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[{id:'times',label:`👥 ${tx.times}`},{id:'escalas',label:`📅 ${tx.escalas}`},LIDERES_CHAMADA.some(l => l.nome === sessao?.nome) && {id:'chamada',label:`📋 ${tx.chamada}`}].filter(Boolean).map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border-strong)', background: aba === a.id ? 'var(--accent-glow)' : 'var(--bg-card)', color: aba === a.id ? 'var(--accent-light)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {a.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 22px 100px' }}>
        {aba === 'times' && EQUIPES.map(eq => (
          <div key={eq.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: eq.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{eq.emoji}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: eq.cor }}>{eq.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>👑 {eq.lideres}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{tx.membros}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {eq.membros.map(m => <span key={m} style={{ fontSize: 11, background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 20, padding: '4px 10px', color: 'var(--text-secondary)' }}>{m}</span>)}
            </div>
          </div>
        ))}
        {aba === 'escalas' && (
            <>
              <div onClick={() => setDiaEscala(hj >= INICIO && hj <= FIM ? hj : dias[0])} style={{
                background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
                borderRadius: 16, padding: '14px 18px', marginBottom: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(96,165,250,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{tx.hoje}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#60A5FA' }}>
                    {hj.getDate()} de {MESES[hj.getMonth()]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][hj.getDay()]}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(96,165,250,0.6)', fontWeight: 600 }}>{tx.verEscala}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{tx.calendario}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                {dias.map(dia => { const isSel = dia.getTime() === diaEscala.getTime(); const isHoje = dia.getTime() === hj.getTime(); return (
                  <div key={dia.getTime()} onClick={() => setDiaEscala(dia)} style={{ background: isSel ? 'var(--accent-bg)' : 'var(--bg-card)', border: isSel ? '1px solid var(--accent-border)' : isHoje ? '1px solid rgba(96,165,250,0.4)' : '1px solid var(--border)', borderRadius: 14, padding: '10px 4px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>{DIAS_C[dia.getDay()]}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: isSel ? 'var(--accent-light)' : isHoje ? '#60A5FA' : 'white' }}>{dia.getDate()}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 1 }}>Jul</div>
                  </div>
                )})}
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{diaEscala.getDate()} de {MESES[diaEscala.getMonth()]}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][diaEscala.getDay()]}</div>

              {['M', 'T', 'N'].map(turnoId => {
                const equipe = EQUIPES.find(eq => getTurno(eq, diaEscala) === turnoId)
                if (!equipe) return null
                return (
                  <div key={turnoId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{TURNO_ICON[turnoId]}</span>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>{tx[TURNO_KEY[turnoId]]}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: equipe.cor, fontWeight: 600 }}>{equipe.emoji} {equipe.nome}</span>
                      </div>
                    </div>
                    {TAREFAS_TURNO[turnoId].map((tarefa, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: equipe.cor, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tx[tarefa]}</span>
                      </div>
                    ))}
                  </div>
                )
              })}

              {EQUIPES.filter(eq => getTurno(eq, diaEscala) === 'F').map(eq => (
                <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{eq.emoji}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{eq.nome}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>😴 Folga</span>
                </div>
              ))}

              {EQUIPES.every(eq => !getTurno(eq, diaEscala)) && (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 12 }}>{tx.nenhumaEscala}</div>
              )}
            </>
        )}
        {aba === 'chamada' && lider && (
          <>
            {erroSalvar && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#F87171' }}>
                ⚠️ Não foi possível salvar agora. Verifique sua internet — a marcação ficará pendente até sincronizar.
              </div>
            )}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Logado: <strong style={{ color: 'var(--text)' }}>{lider.nome}</strong></span>
              <button onClick={() => { setLider(null); setAba('times') }} style={{ background: 'none', border: 'none', color: '#F87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{tx.sair}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <select value={diaSel} onChange={e => { setDiaSel(e.target.value); carregarChamada(e.target.value, turnoSel) }} style={{ flex: 1, padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 13, color: 'var(--text)', outline: 'none' }}>
                <option value="">Selecione o dia</option>
                {dias.map(d => <option key={d.getTime()} value={String(d.getTime())}>{d.getDate()} de julho ({DIAS_C[d.getDay()]})</option>)}
              </select>
              <select value={turnoSel} onChange={e => { setTurnoSel(e.target.value); carregarChamada(diaSel, e.target.value) }} style={{ flex: 1, padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 13, color: 'var(--text)', outline: 'none' }}>
                <option value="">Turno</option>
                <option value="M">Manhã</option>
                <option value="T">Tarde</option>
                <option value="N">Noite</option>
              </select>
            </div>
            {diaSel && turnoSel && equipesFiltradas.map(eq => {
              const t = getTurno(eq, new Date(parseInt(diaSel)))
              if (t !== turnoSel) return null
              const todosMembros = [...eq.lideres.split(' e ').map(l => ({ nome: l.trim(), lider: true })), ...eq.membros.map(m => ({ nome: m, lider: false }))]
              return (
                <div key={eq.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: eq.cor, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>{eq.emoji} {eq.nome}</div>
                  {todosMembros.map(({ nome, lider: isLider }) => {
                    const chKey = diaSel + '_' + turnoSel + '_' + nome
                    const st = chamadaData[chKey]?.status || ''
                    const obs = chamadaData[chKey]?.obs || ''
                    return (
                      <div key={nome} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{nome}{isLider ? ' 👑' : ''}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => marcar(chKey, 'presente')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: st === 'presente' ? 'rgba(16,185,129,0.3)' : 'var(--input-bg)', color: st === 'presente' ? '#6EE7B7' : 'var(--text-muted)' }}>✓</button>
                            <button onClick={() => marcar(chKey, 'ausente')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: st === 'ausente' ? 'rgba(239,68,68,0.3)' : 'var(--input-bg)', color: st === 'ausente' ? '#F87171' : 'var(--text-muted)' }}>✗</button>
                          </div>
                        </div>
                        <textarea defaultValue={obs} onBlur={e => salvarObs(chKey, e.target.value)} placeholder={tx.observacao} rows={1} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, resize: 'none', outline: 'none', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {(!diaSel || !turnoSel) && <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 20 }}>{tx.selecioneDiaTurno}</p>}
          </>
        )}
      </div>
    </div>
  )
}