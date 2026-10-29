'use client'

import { useMemo, useState } from 'react'
import { useTexto } from '@/lib/i18n'
import { ICONE_AREA } from '@/lib/areas'
import { EQUIPES, getTurno } from '@/lib/equipes'
import { useAbaDirecao, abaAdjacente, useSwipeHandlers } from '@/lib/useAbaDirecao'
import { diasDoEvento, DIAS_C, MESES } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useEstadoServidor } from '@/lib/hooks'
import { BarraAbas, PainelAba } from '@/components/abas'
import { FluxoSemFuncao, AvatarPessoa } from '@/components/fluxo-sem-funcao'

const TURNO_LABEL = { M: 'Manhã', T: 'Tarde', N: 'Noite', F: 'Folga' }
const ABA_LABELS = { chamada: <><img src="/icons/chamada.png" alt="" style={{ width: 13, height: 13, verticalAlign: -2 }} /> Chamada</>, faltas: '❌ Faltas', senhas: '🔐 Senhas', aprovacoes: <><img src="/icons/equipes.png" alt="" style={{ width: 13, height: 13, verticalAlign: -2 }} /> Equipes</> }
const NIVEL_COR = {
  maximo: { bg: 'rgba(124,58,237,0.18)', border: 'rgba(124,58,237,0.4)', text: '#A78BFA', label: 'Máximo' },
  alto: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: '#60A5FA', label: 'Alto' },
  basico: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#FCD34D', label: 'Básico' },
  staff: { bg: 'var(--bg-card)', border: 'var(--border)', text: 'var(--text-secondary)', label: 'Staff' },
}
const ORDEM_NIVEL = ['maximo', 'alto', 'basico', 'staff']
const ORDEM_ABAS = ['chamada', 'faltas', 'senhas', 'aprovacoes']
const selectStyle = { flex: 1, padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 13, color: 'var(--text)', outline: 'none' }
const erroBox = { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#F87171' }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Staff comum que entrou no app mas ainda não recebeu nenhuma função
const semFuncao = c => c.nivel === 'staff' && !c.areas_aprovadas?.length

export function Supervisor({ nome, abas, inicio, chamada: chamadaServidor, membrosEquipes, senhas, gestao: gestaoServidor }) {
  const tx = useTexto()
  const [aba, setAba, direcaoAba, abaSaindo] = useAbaDirecao(abas[0] || 'chamada', ORDEM_ABAS)
  const swipeHandlers = useSwipeHandlers(
    () => { const p = abaAdjacente(abas, aba, 1); if (p) setAba(p) },
    () => { const p = abaAdjacente(abas, aba, -1); if (p) setAba(p) }
  )
  const dias = useMemo(() => diasDoEvento(inicio), [inicio])
  const [diaSel, setDiaSel] = useState('')
  const [turnoSel, setTurnoSel] = useState('')
  const [chamada, setChamada] = useEstadoServidor(chamadaServidor, lista => Object.fromEntries(lista.map(c => [c.chave, c])))
  const [pendenteSalvar, setPendenteSalvar] = useState(false)
  const [staffGestao, setStaffGestao] = useEstadoServidor(gestaoServidor)
  const [fluxoSemFuncao, setFluxoSemFuncao] = useState(null) // { pessoas, edicao } enquanto o fluxo está aberto


  const membrosDe = eqId => membrosEquipes.filter(m => m.equipe === eqId).map(m => m.nome)

  // ---- Chamada
  async function salvarChamada(chave, status, obs) {
    setChamada(prev => ({ ...prev, [chave]: { chave, status, obs } }))
    const r = await executar('supervisor.marcarChamada', chave, status, obs)
    if (r.pendente) setPendenteSalvar(true)
  }

  function marcar(chave, status) {
    const atual = chamada[chave]?.status || ''
    salvarChamada(chave, atual === status ? '' : status, chamada[chave]?.obs || '')
  }

  // ---- Faltas
  const faltas = useMemo(() => {
    const por = Object.fromEntries(EQUIPES.map(eq => [eq.id, []]))
    Object.values(chamada).filter(c => c.status === 'ausente').forEach(c => {
      const [idx, turno, ...resto] = c.chave.split('_')
      const n = resto.join('_')
      const m = membrosEquipes.find(x => x.nome === n)
      if (m && por[m.equipe]) por[m.equipe].push({ nome: n, turno, data: dias[Number(idx)], obs: c.obs })
    })
    return por
  }, [chamada, membrosEquipes, dias])
  const semFaltas = EQUIPES.every(eq => !faltas[eq.id]?.length)
  const rotuloData = d => d ? `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')} (${DIAS_C[d.getDay()]})` : ''

  function exportarFaltasPDF() {
    const linhas = []
    EQUIPES.forEach(eq => (faltas[eq.id] || []).forEach(f => linhas.push({ equipe: eq.nome, ...f })))
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Faltas - Impulse</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px;margin-bottom:4px}.sub{color:#666;font-size:12px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0}</style></head><body>
      <h1>Relatório de Faltas — Escola Impulse</h1>
      <div class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · Total: ${linhas.length}</div>
      <table><tr><th>Equipe</th><th>Nome</th><th>Data</th><th>Turno</th><th>Observação</th></tr>
        ${linhas.map(l => `<tr><td>${escapeHtml(l.equipe)}</td><td>${escapeHtml(l.nome)}</td><td>${rotuloData(l.data)}</td><td>${escapeHtml(TURNO_LABEL[l.turno] || '')}</td><td>${escapeHtml(l.obs || '-')}</td></tr>`).join('')}
      </table></body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 300)
  }

  // ---- Equipes: a função de cada pessoa é dada pelo FluxoSemFuncao (tela cheia)
  async function salvarDoFluxo(nomeStaff, areas, equipe) {
    const r = await executar('supervisor.salvarGestao', nomeStaff, areas, equipe)
    if (r.erro) return false
    setStaffGestao(prev => prev.map(c => c.nome === nomeStaff ? { ...c, areas_aprovadas: areas, equipe_atribuida: equipe, area_pendente: null } : c))
    return true
  }

  return (
    <div className="tela-enter" style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      {fluxoSemFuncao && <FluxoSemFuncao key={fluxoSemFuncao.pessoas.join('|')} pessoas={fluxoSemFuncao.pessoas} edicao={fluxoSemFuncao.edicao} inicial={n => staffGestao.find(c => c.nome === n)} onSalvar={salvarDoFluxo} onFechar={() => setFluxoSemFuncao(null)} />}
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700 }}>Supervisor</h2>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>Logado como {nome}</div>
        </div>
      </div>

      <BarraAbas abas={abas.map(a => ({ id: a, label: ABA_LABELS[a] }))} ativa={aba} onTrocar={setAba} />

      <div style={{ padding: '16px 22px 100px', position: 'relative', overflow: 'hidden' }} {...swipeHandlers}>
        <PainelAba id="chamada" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          {pendenteSalvar && <div style={erroBox}>⚠️ Sem conexão — as marcações ficaram guardadas no aparelho e serão enviadas quando o sinal voltar.</div>}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={diaSel} onChange={e => setDiaSel(e.target.value)} style={selectStyle}>
              <option value="">Selecione o dia</option>
              {dias.map((d, i) => <option key={i} value={String(i)}>{d.getDate()} de {MESES[d.getMonth()].toLowerCase()} ({DIAS_C[d.getDay()]})</option>)}
            </select>
            <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)} style={selectStyle}>
              <option value="">Turno</option>
              <option value="M">Manhã</option>
              <option value="T">Tarde</option>
              <option value="N">Noite</option>
            </select>
          </div>
          {(!diaSel || !turnoSel) && <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 20 }}>{tx.selecioneDiaTurno}</p>}
          {diaSel && turnoSel && EQUIPES.map(eq => {
            if (getTurno(eq, Number(diaSel)) !== turnoSel) return null
            const membros = membrosDe(eq.id)
            return (
              <div key={eq.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: eq.cor, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}><img src={eq.icone} alt="" style={{ width: 19, height: 19, objectFit: 'contain', verticalAlign: -5 }} /> {eq.nome}</div>
                {membros.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>Ninguém nesta equipe ainda (defina na aba Equipes).</p>}
                {membros.map(n => {
                  const chKey = `${diaSel}_${turnoSel}_${n}`
                  const st = chamada[chKey]?.status || ''
                  return (
                    <div key={n} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{n}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => marcar(chKey, 'presente')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: st === 'presente' ? 'rgba(16,185,129,0.3)' : 'var(--input-bg)', color: st === 'presente' ? '#6EE7B7' : 'var(--text-muted)' }}>✓</button>
                          <button onClick={() => marcar(chKey, 'ausente')} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: st === 'ausente' ? 'rgba(239,68,68,0.3)' : 'var(--input-bg)', color: st === 'ausente' ? '#F87171' : 'var(--text-muted)' }}>✗</button>
                        </div>
                      </div>
                      <textarea key={chKey} defaultValue={chamada[chKey]?.obs || ''} onBlur={e => { if (e.target.value !== (chamada[chKey]?.obs || '')) salvarChamada(chKey, st, e.target.value) }} placeholder={tx.observacao} rows={1} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, resize: 'none', outline: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-inter), sans-serif' }} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </PainelAba>

        <PainelAba id="faltas" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          {semFaltas && (
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
                  <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 15, fontWeight: 700, color: eq.cor }}><img src={eq.icone} alt="" style={{ width: 24, height: 24, objectFit: 'contain', verticalAlign: -6 }} /> {eq.nome}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>{lista.length} {lista.length === 1 ? 'falta' : 'faltas'}</div>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lista.map((f, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.nome}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rotuloData(f.data)}</span>
                        <span style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{TURNO_LABEL[f.turno]}</span>
                      </div>
                      {f.obs && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, fontStyle: 'italic' }}>&quot;{f.obs}&quot;</div>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {!semFaltas && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={exportarFaltasPDF} title="Exportar PDF" style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--accent-border)', background: 'var(--accent-bg)', color: 'var(--accent-light)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📄</button>
            </div>
          )}
        </PainelAba>

        <PainelAba id="senhas" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          {senhas.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 30 }}>Nenhum login ainda</div>}
          {ORDEM_NIVEL.map(nivel => {
            const membros = senhas.filter(c => (c.nivel || 'staff') === nivel)
            if (!membros.length) return null
            const cor = NIVEL_COR[nivel]
            return (
              <div key={nivel} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: cor.text, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                  {cor.label} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({membros.length})</span>
                </div>
                {membros.map(m => (
                  <div key={m.nome} style={{ background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 14, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.nome}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: cor.text, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '3px 10px', letterSpacing: '0.15em' }}>{m.pin}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </PainelAba>

        <PainelAba id="aprovacoes" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          {staffGestao.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              Nenhum staff cadastrado ainda
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...staffGestao].sort((a, b) => (semFuncao(b) ? 1 : 0) - (semFuncao(a) ? 1 : 0)).map(c => (
                <button key={c.nome} onClick={() => setFluxoSemFuncao({ pessoas: [c.nome], edicao: true })} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 72, padding: '10px 12px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-inter), sans-serif',
                }}>
                  <AvatarPessoa nome={c.nome} url={c.avatar} tamanho={56} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: semFuncao(c) ? '#F87171' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                  {semFuncao(c) ? null : (
                    <span style={{ flex: 'none', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {c.areas_aprovadas.slice(0, 2).map(area => (
                        <span key={area} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px 4px 5px', borderRadius: 20, background: 'var(--bg-card-hover)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', maxWidth: 110, whiteSpace: 'nowrap' }}>
                          {ICONE_AREA[area] && <img src={ICONE_AREA[area]} alt="" style={{ width: 18, height: 18, objectFit: 'contain', flex: 'none' }} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{area === 'Apoio' && c.equipe_atribuida && c.equipe_atribuida !== 'sem_escala' ? `Apoio · ${EQUIPES.find(e => e.id === c.equipe_atribuida)?.nome.replace('Equipe ', '') ?? ''}` : area}</span>
                        </span>
                      ))}
                      {c.areas_aprovadas.length > 2 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>+{c.areas_aprovadas.length - 2}</span>}
                    </span>
                  )}
                  <span style={{ flex: 'none', color: 'var(--text-faint)' }}>›</span>
                </button>
              ))}
            </div>
          )}
        </PainelAba>
      </div>
    </div>
  )
}
