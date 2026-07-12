import { useEffect, useState } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { syncOp } from '../lib/offlineSync'
import { PINOS } from '../lib/pinos'
import { EQUIPES } from '../lib/equipes'
import { AREAS } from '../lib/areas'
import { rotuloRelativo } from '../lib/tempo'
import { notificar } from '../lib/push'
import { useAbaDirecao, abaAdjacente, useSwipeHandlers } from '../lib/useAbaDirecao'
const CICLO = ['M','T','N','F']
const TURNO_LABEL = { M:'Manhã', T:'Tarde', N:'Noite', F:'Folga' }
const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const INICIO = new Date(2026,6,15)
const ABA_LABELS = { avisos:'📢 Avisos', chamada:'📋 Chamada', faltas:'❌ Faltas', senhas:'🔐 Senhas', aprovacoes:'✅ Aprovações' }

const NIVEL_COR = {
  maximo: { bg: 'rgba(124,58,237,0.18)', border: 'rgba(124,58,237,0.4)', text: '#A78BFA', label: 'Máximo' },
  alto:   { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: '#60A5FA', label: 'Alto' },
  medio:  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#34D399', label: 'Médio' },
  basico: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#FCD34D', label: 'Básico' },
  staff:  { bg: 'var(--bg-card)', border: 'var(--border)', text: 'var(--text-secondary)', label: 'Staff' },
}
const ORDEM_NIVEL = ['maximo', 'alto', 'medio', 'basico', 'staff']
const ORDEM_ABAS = ['avisos', 'chamada', 'faltas', 'senhas', 'aprovacoes']

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
  const [aba, setAba, direcaoAba, abaSaindo] = useAbaDirecao(abas[0] || 'avisos', ORDEM_ABAS)
  const swipeHandlers = useSwipeHandlers(
    () => { const p = abaAdjacente(abas, aba, 1); if (p) setAba(p) },
    () => { const p = abaAdjacente(abas, aba, -1); if (p) setAba(p) }
  )
  const [avisos, setAvisos] = useState([])
  const [avisoTexto, setAvisoTexto] = useState('')
  const [diaSel, setDiaSel] = useState('')
  const [turnoSel, setTurnoSel] = useState('')
  const [chamadaData, setChamadaData] = useState({})
  const [faltas, setFaltas] = useState({})
  const [erroSalvar, setErroSalvar] = useState(false)
  const [publicandoAviso, setPublicandoAviso] = useState(false)
  const [erroAviso, setErroAviso] = useState(false)
  const [convidados, setConvidados] = useState([])
  const [loadingConvidados, setLoadingConvidados] = useState(false)
  const [pendentes, setPendentes] = useState([])
  const [loadingPendentes, setLoadingPendentes] = useState(false)
  const [erroAprovacao, setErroAprovacao] = useState(false)
  const [rascunhos, setRascunhos] = useState({})
  const [confirmando, setConfirmando] = useState(null)

  useEffect(() => {
    if (aba === 'avisos') carregarAvisos()
    if (aba === 'faltas') carregarFaltas()
    if (aba === 'senhas') carregarConvidados()
    if (aba === 'aprovacoes') carregarPendentes()
  }, [aba])

  async function carregarPendentes() {
    setLoadingPendentes(true)
    try {
      const { data } = await supabase.from('convidados').select('nome, areas_pedidas, areas_aprovadas, equipe_atribuida, precisa_aprovacao, acesso_geral').order('nome')
      const lista = (data || []).filter(c => c.precisa_aprovacao && !pessoaResolvida(c))
      setPendentes(lista)
    } catch {
      setPendentes([])
    } finally {
      setLoadingPendentes(false)
    }
  }

  function pessoaResolvida(c) {
    const liberado = (c.areas_aprovadas || []).length > 0 || c.acesso_geral
    const faltaArea = (c.areas_pedidas || []).some(a => !(c.areas_aprovadas || []).includes(a))
    return liberado && !faltaArea
  }

  // Enquanto nao confirma, as escolhas ficam so num rascunho local (nada e
  // salvo ainda) — assim da pra corrigir um clique errado antes de valer.
  function getDraft(nomeConvidado) {
    if (rascunhos[nomeConvidado]) return rascunhos[nomeConvidado]
    const base = pendentes.find(c => c.nome === nomeConvidado)
    return { areas_aprovadas: base?.areas_aprovadas || [], equipe_atribuida: base?.equipe_atribuida ?? null, acesso_geral: !!base?.acesso_geral }
  }

  function setDraft(nomeConvidado, patch) {
    setRascunhos(prev => ({ ...prev, [nomeConvidado]: { ...getDraft(nomeConvidado), ...patch } }))
  }

  function toggleAprovacao(nomeConvidado, area) {
    const d = getDraft(nomeConvidado)
    const novoArray = d.areas_aprovadas.includes(area) ? d.areas_aprovadas.filter(a => a !== area) : [...d.areas_aprovadas, area]
    setDraft(nomeConvidado, { areas_aprovadas: novoArray })
  }

  function toggleAcessoGeral(nomeConvidado) {
    const d = getDraft(nomeConvidado)
    setDraft(nomeConvidado, { acesso_geral: !d.acesso_geral })
  }

  function definirApoio(nomeConvidado, equipeId) {
    const d = getDraft(nomeConvidado)
    const areaApoio = AREAS[0]
    const aprovadoApoio = d.areas_aprovadas.includes(areaApoio)
    const atual = aprovadoApoio ? (d.equipe_atribuida || 'aleatorio') : null
    const jaSelecionado = atual === equipeId
    const novasAreas = jaSelecionado
      ? d.areas_aprovadas.filter(a => a !== areaApoio)
      : (aprovadoApoio ? d.areas_aprovadas : [...d.areas_aprovadas, areaApoio])
    const novaEquipe = jaSelecionado ? null : (equipeId === 'aleatorio' ? null : equipeId)
    setDraft(nomeConvidado, { areas_aprovadas: novasAreas, equipe_atribuida: novaEquipe })
  }

  async function confirmarAprovacao(nomeConvidado) {
    const d = rascunhos[nomeConvidado]
    if (!d) return
    setConfirmando(nomeConvidado)
    const ok = await syncOp('update', 'convidados', { values: { areas_aprovadas: d.areas_aprovadas, equipe_atribuida: d.equipe_atribuida, acesso_geral: d.acesso_geral }, filters: { nome: nomeConvidado } })
    setConfirmando(null)
    if (!ok) { setErroAprovacao(true); return }
    setPendentes(prev => prev.map(c => c.nome === nomeConvidado ? { ...c, ...d } : c))
    setRascunhos(prev => { const cp = { ...prev }; delete cp[nomeConvidado]; return cp })
  }

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
    if (!avisoTexto.trim() || publicandoAviso) return
    setPublicandoAviso(true)
    setErroAviso(false)
    const hj = new Date()
    const hora = hj.getHours() + ':' + String(hj.getMinutes()).padStart(2, '0')
    const ok = await syncOp('insert', 'avisos', { texto: avisoTexto.trim(), data: hj.getDate() + '/07', hora })
    if (ok) {
      notificar({ tipo: 'aviso' })
      setAvisoTexto('')
      carregarAvisos()
    } else {
      setErroAviso(true)
    }
    setPublicandoAviso(false)
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
      <div style={{ display: 'flex', gap: 4, padding: 4, margin: '16px 22px 0', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
        {abas.map(a => (
          <button key={a} onClick={() => setAba(a)} style={{ flex: 1, minWidth: 0, padding: '8px 3px', borderRadius: 12, border: 'none', background: aba === a ? 'var(--accent-glow)' : 'transparent', color: aba === a ? 'var(--accent-light)' : 'var(--text-muted)', fontSize: 10.5, fontWeight: 700, lineHeight: 1.2, cursor: 'pointer', textAlign: 'center' }}>
            {ABA_LABELS[a]}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 22px 100px', position: 'relative', overflow: 'hidden' }} {...swipeHandlers}>

        {/* AVISOS */}
        {(aba === 'avisos' || abaSaindo === 'avisos') && (
          <div className={aba === 'avisos' ? `tab-entra-${direcaoAba.current}` : `tab-sai-${direcaoAba.current}`} style={aba === 'avisos' ? undefined : { position: 'absolute', inset: 0 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 16 }}>
              <textarea value={avisoTexto} onChange={e => setAvisoTexto(e.target.value)} placeholder="Digite o aviso para todos verem..." style={{ width: '100%', padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 14, resize: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Inter, sans-serif', minHeight: 100 }} />
              {erroAviso && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 14px', marginTop: 10, fontSize: 12, color: '#F87171' }}>
                  ⚠️ Não foi possível publicar agora. Verifique sua internet e tente de novo.
                </div>
              )}
              <button onClick={publicarAviso} disabled={publicandoAviso} style={{ width: '100%', marginTop: 12, padding: 14, background: publicandoAviso ? 'var(--input-bg)' : 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: publicandoAviso ? 'default' : 'pointer', color: publicandoAviso ? 'var(--text-faint)' : 'var(--text)', fontFamily: 'Syne, sans-serif' }}>
                {publicandoAviso ? 'Publicando...' : '📢 Publicar aviso'}
              </button>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Publicados</div>
            {avisos.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 30 }}>Nenhum aviso ainda</div>}
            {avisos.map((a, i) => (
              <div key={a.id} className="tela-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 10, animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{a.texto}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}><strong style={{ color: '#F87171' }}>{rotuloRelativo(a.created_at)}</strong> · {a.hora}</span>
                  <button onClick={() => deletarAviso(a.id)} style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑 Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHAMADA */}
        {(aba === 'chamada' || abaSaindo === 'chamada') && (
          <div className={aba === 'chamada' ? `tab-entra-${direcaoAba.current}` : `tab-sai-${direcaoAba.current}`} style={aba === 'chamada' ? undefined : { position: 'absolute', inset: 0 }}>
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
          </div>
        )}

        {/* FALTAS */}
        {(aba === 'faltas' || abaSaindo === 'faltas') && (
          <div className={aba === 'faltas' ? `tab-entra-${direcaoAba.current}` : `tab-sai-${direcaoAba.current}`} style={aba === 'faltas' ? undefined : { position: 'absolute', inset: 0 }}>
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
          </div>
        )}
        {/* SENHAS */}
        {(aba === 'senhas' || abaSaindo === 'senhas') && (
          <div className={aba === 'senhas' ? `tab-entra-${direcaoAba.current}` : `tab-sai-${direcaoAba.current}`} style={aba === 'senhas' ? undefined : { position: 'absolute', inset: 0 }}>
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
          </div>
        )}

        {/* APROVAÇÕES */}
        {(aba === 'aprovacoes' || abaSaindo === 'aprovacoes') && (
          <div className={aba === 'aprovacoes' ? `tab-entra-${direcaoAba.current}` : `tab-sai-${direcaoAba.current}`} style={aba === 'aprovacoes' ? undefined : { position: 'absolute', inset: 0 }}>
            {erroAprovacao && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#F87171' }}>
                ⚠️ Não foi possível salvar agora. Verifique sua internet e tente de novo.
              </div>
            )}
            {loadingPendentes ? (
              <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 40 }}>Carregando...</div>
            ) : pendentes.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                Nenhum pedido de área ainda
              </div>
            ) : pendentes.map(c => {
              const d = getDraft(c.nome)
              const temRascunho = !!rascunhos[c.nome]
              return (
              <div key={c.nome} style={{
                background: pessoaResolvida(c) ? 'rgba(16,185,129,0.05)' : 'var(--bg-card)',
                border: pessoaResolvida(c) ? '1px solid rgba(16,185,129,0.3)' : temRascunho ? '1px solid rgba(234,179,8,0.4)' : '1px solid var(--border)',
                borderRadius: 20, padding: 16, marginBottom: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div>
                  {pessoaResolvida(c) && !temRascunho && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6EE7B7', background: 'rgba(16,185,129,0.15)', padding: '3px 10px', borderRadius: 20 }}>✓ Aprovado</span>
                  )}
                  {temRascunho && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#EAB308', background: 'rgba(234,179,8,0.15)', padding: '3px 10px', borderRadius: 20 }}>Não confirmado</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {c.areas_pedidas.length === 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>Não pediu nenhuma área — só precisa de acesso geral</div>
                      <button onClick={() => toggleAcessoGeral(c.nome)} style={{
                        alignSelf: 'flex-start',
                        padding: '7px 13px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        border: d.acesso_geral ? '1px solid rgba(167,139,250,0.5)' : '1px solid var(--border-strong)',
                        background: d.acesso_geral ? 'rgba(167,139,250,0.15)' : 'var(--input-bg)',
                        color: d.acesso_geral ? '#C4B5FD' : 'var(--text-muted)'
                      }}>{d.acesso_geral ? '✓ ' : ''}✅ Liberar acesso</button>
                    </div>
                  )}
                  {c.areas_pedidas.map(area => {
                    if (area === AREAS[0]) {
                      const aprovadoApoio = d.areas_aprovadas.includes(area)
                      const equipeAtual = aprovadoApoio ? (d.equipe_atribuida || 'aleatorio') : null
                      return (
                        <div key={area}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 6 }}>{area}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {EQUIPES.map(eq => (
                              <button key={eq.id} onClick={() => definirApoio(c.nome, eq.id)} style={{
                                padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                border: equipeAtual === eq.id ? `1px solid ${eq.cor}` : '1px solid var(--border-strong)',
                                background: equipeAtual === eq.id ? `${eq.cor}26` : 'var(--input-bg)',
                                color: equipeAtual === eq.id ? eq.cor : 'var(--text-muted)'
                              }}>{eq.emoji} {eq.nome.replace('Equipe ', '')}</button>
                            ))}
                            <button onClick={() => definirApoio(c.nome, 'aleatorio')} style={{
                              padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                              border: equipeAtual === 'aleatorio' ? '1px solid rgba(167,139,250,0.5)' : '1px solid var(--border-strong)',
                              background: equipeAtual === 'aleatorio' ? 'rgba(167,139,250,0.15)' : 'var(--input-bg)',
                              color: equipeAtual === 'aleatorio' ? '#C4B5FD' : 'var(--text-muted)'
                            }}>🎲 Aleatório</button>
                          </div>
                        </div>
                      )
                    }
                    const aprovado = d.areas_aprovadas.includes(area)
                    return (
                      <button key={area} onClick={() => toggleAprovacao(c.nome, area)} style={{
                        alignSelf: 'flex-start',
                        padding: '7px 13px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        border: aprovado ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border-strong)',
                        background: aprovado ? 'rgba(16,185,129,0.15)' : 'var(--input-bg)',
                        color: aprovado ? '#6EE7B7' : 'var(--text-muted)'
                      }}>{aprovado ? '✓ ' : ''}{area}</button>
                    )
                  })}
                  {temRascunho && (
                    <button onClick={() => confirmarAprovacao(c.nome)} disabled={confirmando === c.nome} style={{
                      marginTop: 4, padding: '12px', borderRadius: 14, border: 'none',
                      background: confirmando === c.nome ? 'var(--input-bg)' : 'var(--gradient)',
                      color: confirmando === c.nome ? 'var(--text-faint)' : 'white',
                      fontSize: 13, fontWeight: 700, cursor: confirmando === c.nome ? 'default' : 'pointer', fontFamily: 'Syne, sans-serif'
                    }}>{confirmando === c.nome ? 'Confirmando...' : '✅ Confirmar aprovação'}</button>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}