import { useEffect, useState } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { syncOp } from '../lib/offlineSync'
import { PINOS } from '../lib/pinos'
import { EQUIPES } from '../lib/equipes'
const CICLO = ['M','T','N','F']
const TURNO_LABEL = { M:'Manhã', T:'Tarde', N:'Noite', F:'Folga' }
const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const INICIO = new Date(2026,6,15)
const ABA_LABELS = { avisos:'📢 Avisos', chamada:'📋 Chamada', faltas:'❌ Faltas', senhas:'🔐 Senhas' }

const NIVEL_COR = {
  maximo: { bg: 'rgba(124,58,237,0.18)', border: 'rgba(124,58,237,0.4)', text: '#A78BFA', label: 'Máximo' },
  alto:   { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: '#60A5FA', label: 'Alto' },
  medio:  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#34D399', label: 'Médio' },
  basico: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#FCD34D', label: 'Básico' },
  staff:  { bg: 'var(--bg-card)', border: 'var(--border)', text: 'var(--text-secondary)', label: 'Staff' },
}
const ORDEM_NIVEL = ['maximo', 'alto', 'medio', 'basico', 'staff']

function getTurno(eq, data) {
  const diff = Math.round((data.getTime() - INICIO.getTime()) / 86400000)
  if (diff < 0 || diff > 10) return null
  if (eq.id === 'vermelho' && diff === 0) return 'N'
  if (diff === 0) return null
  return CICLO[(diff - 1 + eq.offset) % 4]
}

const dias = Array.from({ length: 11 }, (_, i) => new Date(INICIO.getTime() + i * 86400000))

export default function Supervisor({ onVoltar, nome, abas, onAjuda }) {
  const tx = useTexto()
  const [aba, setAba] = useState(abas[0] || 'avisos')
  const [avisos, setAvisos] = useState([])
  const [avisoTexto, setAvisoTexto] = useState('')
  const [diaSel, setDiaSel] = useState('')
  const [turnoSel, setTurnoSel] = useState('')
  const [chamadaData, setChamadaData] = useState({})
  const [faltas, setFaltas] = useState({})
  const [erroSalvar, setErroSalvar] = useState(false)
  const [convidados, setConvidados] = useState([])
  const [loadingConvidados, setLoadingConvidados] = useState(false)

  useEffect(() => {
    if (aba === 'avisos') carregarAvisos()
    if (aba === 'faltas') carregarFaltas()
    if (aba === 'senhas') carregarConvidados()
  }, [aba])

  async function carregarConvidados() {
    setLoadingConvidados(true)
    const { data } = await supabase.from('convidados').select('nome, pin').order('nome')
    setConvidados(data || [])
    setLoadingConvidados(false)
  }

  async function carregarAvisos() {
    const { data } = await supabase.from('avisos').select('*').order('created_at', { ascending: false })
    if (data) setAvisos(data)
  }

  async function publicarAviso() {
    if (!avisoTexto.trim()) return
    const hj = new Date()
    const hora = hj.getHours() + ':' + String(hj.getMinutes()).padStart(2, '0')
    await syncOp('insert', 'avisos', { texto: avisoTexto.trim(), data: hj.getDate() + '/07', hora })
    setAvisoTexto('')
    carregarAvisos()
  }

  async function deletarAviso(id) {
    await syncOp('delete', 'avisos', { id })
    carregarAvisos()
  }

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

  async function carregarFaltas() {
    const { data } = await supabase.from('chamada').select('*').eq('status', 'ausente')
    if (!data) return
    const por = {}
    EQUIPES.forEach(eq => { por[eq.id] = [] })
    data.forEach(r => {
      const partes = r.chave.split('_')
      const ts = partes[0], turno = partes[1], n = partes.slice(2).join(' ')
      const dt = new Date(parseInt(ts))
      for (const eq of EQUIPES) {
        const todos = [...eq.membros, ...eq.lideres.split(' e ').map(l => l.trim())]
        if (todos.includes(n)) { por[eq.id].push({ nome: n, turno, data: dt, obs: r.obs || '' }); break }
      }
    })
    setFaltas(por)
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
  }

  function exportarFaltasPDF() {
    const linhas = []
    EQUIPES.forEach(eq => {
      (faltas[eq.id] || []).forEach(f => linhas.push({ equipe: eq.nome, ...f }))
    })
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Faltas - Impulse 2026</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin-bottom:4px}
        .sub{color:#666;font-size:12px;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f0f0f0}
      </style></head><body>
      <h1>Relatório de Faltas — Escola Impulse 2026</h1>
      <div class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · Total: ${linhas.length}</div>
      <table>
        <tr><th>Equipe</th><th>Nome</th><th>Data</th><th>Turno</th><th>Observação</th></tr>
        ${linhas.map(l => `<tr><td>${escapeHtml(l.equipe)}</td><td>${escapeHtml(l.nome)}</td><td>${l.data.getDate()}/07 (${DIAS_C[l.data.getDay()]})</td><td>${escapeHtml(TURNO_LABEL[l.turno] || '')}</td><td>${escapeHtml(l.obs || '-')}</td></tr>`).join('')}
      </table>
    </body></html>`
    const win = window.open('', '_blank')
    if (!win) { alert('Não foi possível abrir a janela de exportação. Verifique o bloqueador de pop-up.'); return }
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 300)
  }

  return (
    <div style={{ background: '#0A0A1A', minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>Supervisor</h2>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>Logado como {nome}</div>
        </div>
        {onAjuda && (
          <button onClick={onAjuda} style={{ marginLeft: 'auto', width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>?</button>
        )}
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {abas.map(a => (
          <button key={a} onClick={() => setAba(a)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border-strong)', background: aba === a ? 'var(--accent-glow)' : 'var(--bg-card)', color: aba === a ? 'var(--accent-light)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {ABA_LABELS[a]}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 22px 100px' }}>

        {/* AVISOS */}
        {aba === 'avisos' && (
          <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 16 }}>
              <textarea value={avisoTexto} onChange={e => setAvisoTexto(e.target.value)} placeholder="Digite o aviso para todos verem..." style={{ width: '100%', padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 14, resize: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Inter, sans-serif', minHeight: 100 }} />
              <button onClick={publicarAviso} style={{ width: '100%', marginTop: 12, padding: 14, background: 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>
                📢 Publicar aviso
              </button>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Publicados</div>
            {avisos.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 30 }}>Nenhum aviso ainda</div>}
            {avisos.map(a => (
              <div key={a.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{a.texto}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{a.data} às {a.hora}</span>
                  <button onClick={() => deletarAviso(a.id)} style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑 Remover</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* CHAMADA */}
        {aba === 'chamada' && (
          <>
            {erroSalvar && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#F87171' }}>
                ⚠️ Não foi possível salvar agora. Verifique sua internet — a marcação ficará pendente até sincronizar.
              </div>
            )}
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
            {(!diaSel || !turnoSel) && <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 20 }}>{tx.selecioneDiaTurno}</p>}
            {diaSel && turnoSel && EQUIPES.map(eq => {
              const t = getTurno(eq, new Date(parseInt(diaSel)))
              if (t !== turnoSel) return null
              const todosMembros = [...eq.lideres.split(' e ').map(l => ({ nome: l.trim(), lider: true })), ...eq.membros.map(m => ({ nome: m, lider: false }))]
              return (
                <div key={eq.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: eq.cor, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>{eq.emoji} {eq.nome}</div>
                  {todosMembros.map(({ nome: n, lider: isLider }) => {
                    const chKey = diaSel + '_' + turnoSel + '_' + n
                    const st = chamadaData[chKey]?.status || ''
                    const obs = chamadaData[chKey]?.obs || ''
                    return (
                      <div key={n} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{n}{isLider ? ' 👑' : ''}</div>
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
          </>
        )}

        {/* FALTAS */}
        {aba === 'faltas' && (
          <>
            {EQUIPES.every(eq => !faltas[eq.id]?.length) && (
              <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                Nenhuma falta registrada ainda
              </div>
            )}
            {EQUIPES.map(eq => {
              const lista = faltas[eq.id] || []
              if (!lista.length) return null
              return (
                <div key={eq.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: eq.cor }}>{eq.emoji} {eq.nome}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>{lista.length} {lista.length === 1 ? 'falta' : 'faltas'}</div>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lista.map((f, i) => (
                      <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.nome}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.data.getDate()} de julho ({DIAS_C[f.data.getDay()]})</span>
                          <span style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{TURNO_LABEL[f.turno]}</span>
                        </div>
                        {f.obs && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, fontStyle: 'italic' }}>"{f.obs}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {!EQUIPES.every(eq => !faltas[eq.id]?.length) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={exportarFaltasPDF} title="Exportar PDF" style={{
                  width: 38, height: 38, borderRadius: '50%',
                  border: '1px solid var(--accent-border)',
                  background: 'var(--accent-bg)', color: 'var(--accent-light)',
                  fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>📄</button>
              </div>
            )}
          </>
        )}
        {/* SENHAS */}
        {aba === 'senhas' && (
          <>
            {ORDEM_NIVEL.map(nivel => {
              const membros = Object.entries(PINOS)
                .filter(([, d]) => d.nivel === nivel)
                .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
              if (!membros.length) return null
              const cor = NIVEL_COR[nivel]
              return (
                <div key={nivel} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: cor.text, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                    {cor.label} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({membros.length})</span>
                  </div>
                  {membros.map(([nome, dados]) => (
                    <div key={nome} style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 14, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{nome}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: cor.text, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '3px 10px', letterSpacing: '0.15em' }}>{dados.pin}</span>
                    </div>
                  ))}
                </div>
              )
            })}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#F87171', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                Convidados <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({convidados.length})</span>
              </div>
              {loadingConvidados ? (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '12px 0' }}>Carregando...</div>
              ) : convidados.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>Nenhum convidado cadastrado ainda.</div>
              ) : convidados.map(c => (
                <div key={c.nome} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 14, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#F87171', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '3px 10px', letterSpacing: '0.15em' }}>{c.pin}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}