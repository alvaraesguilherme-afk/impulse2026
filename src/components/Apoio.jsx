import { useState } from 'react'
import { supabase } from '../lib/supabase'

const EQUIPES = [
  { id: 'verde', nome: 'Equipe Verde', lideres: 'Jhony e Linda', membros: ['Emanuel','Hellen Borges','Isabely Matos','Joel Marcos','Jeronimo','Livia Andrea'], offset: 0, cor: '#A78BFA', grad: 'linear-gradient(135deg,#4C1D95,#7C3AED)', emoji: '🟢' },
  { id: 'amarelo', nome: 'Equipe Amarelo', lideres: 'Gustavo e Taiwa', membros: ['Hugo Lacroix','Lorena','Maria Clara','Matheus Almeida','Stephany'], offset: 1, cor: '#FCD34D', grad: 'linear-gradient(135deg,#78350F,#F59E0B)', emoji: '🟡' },
  { id: 'azul', nome: 'Equipe Azul', lideres: 'Walterley e Maria Julia', membros: ['Ludymila','Mariana Gabrielle','Mauricio','Rafael','Ryan Guedes'], offset: 2, cor: '#60A5FA', grad: 'linear-gradient(135deg,#0C4A6E,#0EA5E9)', emoji: '🔵' },
  { id: 'vermelho', nome: 'Equipe Vermelho', lideres: 'Francisco e Clara Cunha', membros: ['Gabriel Mendes','Leticia Nascimento','Nicoly','Rennan','Vic'], offset: 3, cor: '#F87171', grad: 'linear-gradient(135deg,#7F1D1D,#EF4444)', emoji: '🔴' },
]

const CICLO = ['M','T','N','F']
const TURNO_LABEL = { M:'Manhã', T:'Tarde', N:'Noite', F:'Folga' }
const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const INICIO = new Date(2026,6,15)
const INICIO_VISIVEL = new Date(2026,6,10)
const FIM = new Date(2026,6,25)

const LIDERES_CHAMADA = [
  { nome: 'Alvarães', senha: '1932', equipeId: '' },
  { nome: 'Jhony', senha: '7780', equipeId: 'verde' },
  { nome: 'Gustavo', senha: '1121', equipeId: 'amarelo' },
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
      <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'white' }}>‹</button>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
    </div>
  )
}

export default function Apoio({ onVoltar }) {
  const [aba, setAba] = useState('times')
  const [lider, setLider] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [diaSel, setDiaSel] = useState('')
  const [turnoSel, setTurnoSel] = useState('')
  const [chamadaData, setChamadaData] = useState({})
  const hj = new Date(); hj.setHours(0,0,0,0)

  function abrirChamada() {
    if (lider) { setAba('chamada'); return }
    setShowLogin(true); setSenhaInput(''); setSenhaErro('')
  }

  function verificarSenha() {
    const encontrado = LIDERES_CHAMADA.find(l => l.senha === senhaInput)
    if (encontrado) { setLider(encontrado); setShowLogin(false); setAba('chamada') }
    else setSenhaErro('Senha incorreta.')
  }

  async function carregarChamada(ts, turno) {
    if (!ts || !turno) return
    const { data } = await supabase.from('chamada').select('*')
    const prefix = ts + '_' + turno + '_'
    const cache = {}
    if (data) data.forEach(r => { if (r.chave?.startsWith(prefix)) cache[r.chave] = { status: r.status, obs: r.obs || '' } })
    setChamadaData(cache)
  }

  async function marcar(chave, status) {
    const atual = chamadaData[chave]?.status || ''
    const novo = atual === status ? '' : status
    const obs = chamadaData[chave]?.obs || ''
    setChamadaData(prev => ({ ...prev, [chave]: { status: novo, obs } }))
    await supabase.from('chamada').upsert({ chave, status: novo, obs }, { onConflict: 'chave' })
  }

  async function salvarObs(chave, obs) {
    const status = chamadaData[chave]?.status || ''
    setChamadaData(prev => ({ ...prev, [chave]: { status, obs } }))
    await supabase.from('chamada').upsert({ chave, status, obs }, { onConflict: 'chave' })
  }

  const equipesFiltradas = lider?.equipeId === '' ? EQUIPES : EQUIPES.filter(e => e.id === lider?.equipeId)

  const abas = [
    { id: 'times', label: '👥 Times' },
    { id: 'escalas', label: '📅 Escalas' },
    { id: 'chamada', label: '📋 Chamada' },
  ]

  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <BackBtn onVoltar={onVoltar} titulo="Escala de Serviço" />

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => a.id === 'chamada' ? abrirChamada() : setAba(a.id)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: aba === a.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', color: aba === a.id ? '#C4B5FD' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {a.label}{a.id === 'chamada' ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 22px 100px' }}>

        {/* TIMES */}
        {aba === 'times' && EQUIPES.map(eq => (
          <div key={eq.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: eq.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{eq.emoji}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: eq.cor }}>{eq.nome}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>👑 {eq.lideres}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Membros</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {eq.membros.map(m => (
                <span key={m} style={{ fontSize: 11, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 10px', color: 'rgba(255,255,255,0.7)' }}>{m}</span>
              ))}
            </div>
          </div>
        ))}

        {/* ESCALAS */}
        {aba === 'escalas' && (
          hj < INICIO_VISIVEL ? (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Em breve</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, background: 'linear-gradient(90deg,#A78BFA,#60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {Math.ceil((INICIO.getTime() - hj.getTime()) / 86400000)} dias
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>O evento começa em 15 de julho</div>
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginBottom: 16 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 2 }}>
                  {hj.getDate()} de {MESES[hj.getMonth()]}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
                  {hj >= INICIO && hj <= FIM ? ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][hj.getDay()] : 'Fora do período'}
                </div>
                {EQUIPES.map(eq => {
                  const t = getTurno(eq, hj)
                  if (!t) return null
                  return (
                    <div key={eq.id} style={{ borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: eq.cor }}>{eq.nome}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{eq.lideres}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(124,58,237,0.3)', color: '#C4B5FD' }}>{TURNO_LABEL[t]}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Calendário</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {dias.map(dia => {
                  const isHoje = dia.getTime() === hj.getTime()
                  return (
                    <div key={dia.getTime()} style={{ background: isHoje ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', border: isHoje ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 4px', textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 2 }}>{DIAS_C[dia.getDay()]}</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: isHoje ? '#A78BFA' : 'white' }}>{dia.getDate()}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Jul</div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        )}

        {/* CHAMADA */}
        {aba === 'chamada' && lider && (
          <>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Logado: <strong style={{ color: 'white' }}>{lider.nome}</strong></span>
              <button onClick={() => { setLider(null); setAba('times') }} style={{ background: 'none', border: 'none', color: '#F87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Sair</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <select value={diaSel} onChange={e => { setDiaSel(e.target.value); carregarChamada(e.target.value, turnoSel) }} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, fontSize: 13, color: 'white', outline: 'none' }}>
                <option value="">Selecione o dia</option>
                {dias.map(d => <option key={d.getTime()} value={String(d.getTime())}>{d.getDate()} de julho ({DIAS_C[d.getDay()]})</option>)}
              </select>
              <select value={turnoSel} onChange={e => { setTurnoSel(e.target.value); carregarChamada(diaSel, e.target.value) }} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, fontSize: 13, color: 'white', outline: 'none' }}>
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
                      <div key={nome} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{nome}{isLider ? ' 👑' : ''}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => marcar(chKey, 'presente')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: st === 'presente' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)', color: st === 'presente' ? '#6EE7B7' : 'rgba(255,255,255,0.4)' }}>✓</button>
                            <button onClick={() => marcar(chKey, 'ausente')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: st === 'ausente' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)', color: st === 'ausente' ? '#F87171' : 'rgba(255,255,255,0.4)' }}>✗</button>
                          </div>
                        </div>
                        <textarea defaultValue={obs} onBlur={e => salvarObs(chKey, e.target.value)} placeholder="Observação..." rows={1} style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12, resize: 'none', outline: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {(!diaSel || !turnoSel) && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 20 }}>Selecione o dia e turno</p>}
          </>
        )}
      </div>

      {/* LOGIN CHAMADA */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Chamada — Apoio</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Digite sua senha de líder</p>
            <input type="password" value={senhaInput} onChange={e => { setSenhaInput(e.target.value); setSenhaErro('') }} onKeyDown={e => e.key === 'Enter' && verificarSenha()} placeholder="••••" maxLength={10} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: '.3em', outline: 'none', color: 'white', marginBottom: 12, fontFamily: 'Inter, sans-serif' }} />
            {senhaErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{senhaErro}</p>}
            <button onClick={verificarSenha} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#7C3AED,#60A5FA)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', marginBottom: 10 }}>Entrar</button>
            <button onClick={() => setShowLogin(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}