'use client'

import { useState, useTransition } from 'react'
import { useTexto } from '@/lib/i18n'
import { EQUIPES, getTurno } from '@/lib/equipes'
import { AREA_APOIO } from '@/lib/areas'
import { coordenaArea, podeGerirEquipes } from '@/lib/permissoes'
import { diasDoEvento, idxHoje, MESES, DIAS_SEMANA } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor } from '@/lib/hooks'
import { IconeTurno } from '@/components/icone-turno'
import { CaixaMensagem } from '@/components/abas'

/* eslint-disable @next/next/no-img-element -- ícones locais em /public/icons */

// Apoio numa página só, na linguagem da página inicial: manchas de cor no
// fundo, título grande, o dia escolhido nas plaquinhas (as mesmas do contador)
// e blocos em relevo. Cada turno vem tingido com a cor da equipe e já mostra a
// lista de tarefas. Embaixo, avisos pras equipes e quem está em cada equipe.
const TAREFAS_TURNO = {
  M: ['servirCafe', 'lavarLoucas', 'recolherLixo', 'limpezaRefeitorio'],
  T: ['servirAlmoco', 'lavarLoucas', 'recolherLixo', 'limpezaRefeitorio', 'limpezaTemplo'],
  N: ['servirJantar', 'lavarLoucas', 'recolherLixo', 'limpezaRefeitorio', 'limpezaTemplo'],
}
const TURNO_KEY = { M: 'manha', T: 'tarde', N: 'noite' }
// Cor da equipe com opacidade a (0 a 1)
const fosca = (cor, a) => { const n = parseInt(cor.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }

const secao = { fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)' }
const seloSua = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, padding: '4px 9px', borderRadius: 999, background: 'rgba(167,139,250,0.16)', color: 'var(--accent-light)', whiteSpace: 'nowrap' }
const botaoSeta = { width: 42, height: 42, borderRadius: '50%', border: 'none', color: 'var(--text)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

function Placas({ valor }) {
  // key junto com o dígito: só a placa que mudou é remontada e gira
  return (
    <div className="placas-digitos">
      {String(valor).padStart(2, '0').split('').map((d, i) => <div key={i + '-' + d} className="placa">{d}</div>)}
    </div>
  )
}

function Turno({ turno, equipe, minha, tx }) {
  return (
    <div className="cartao-relevo" style={{
      borderRadius: 20,
      background: `linear-gradient(135deg, ${fosca(equipe.cor, 0.26)}, ${fosca(equipe.cor, 0.08)} 70%, rgba(255,255,255,0.03))`,
      boxShadow: `0 22px 44px -14px rgba(0,0,0,0.6), 0 6px 14px rgba(0,0,0,0.25), inset 0 0 0 1px ${fosca(equipe.cor, 0.18)}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
        <IconeTurno id={turno} tamanho={22} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 15 }}>{tx[TURNO_KEY[turno]]}</div>
          <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: equipe.cor, textShadow: `0 0 12px ${fosca(equipe.cor, 0.45)}` }}>{equipe.nome}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {minha && <span style={seloSua}>Sua equipe</span>}
          <img src={equipe.icone} alt={equipe.nome} style={{ width: 44, height: 44, objectFit: 'contain', filter: `drop-shadow(0 0 10px ${fosca(equipe.cor, 0.55)})` }} />
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: '0 14px 14px 48px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {TAREFAS_TURNO[turno].map(t => (
          <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: equipe.cor, boxShadow: `0 0 6px ${fosca(equipe.cor, 0.6)}` }} />
            {tx[t]}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Apoio({ sessao, inicio, minhaEquipe, staff, mensagens: mensagensServidor }) {
  const tx = useTexto()
  const montado = useMontado()
  const dias = diasDoEvento(inicio)
  const [diaEscolhido, setDiaEscolhido] = useState(null)
  const diaIdx = diaEscolhido ?? (montado ? idxHoje(inicio) : 0)
  const idxDeHoje = montado ? idxHoje(inicio) : -1
  const [mensagens, setMensagens] = useEstadoServidor(mensagensServidor)
  const [equipeDestino, setEquipeDestino] = useState('todas')
  const [enviando, startEnviar] = useTransition()

  const podeEnviar = coordenaArea(sessao, AREA_APOIO) && (podeGerirEquipes(sessao) || !!minhaEquipe)
  const veMensagens = podeGerirEquipes(sessao) || !!minhaEquipe
  const dia = dias[diaIdx]
  const ehHoje = diaIdx === idxDeHoje
  const turnos = ['M', 'T', 'N'].map(t => ({ t, equipe: EQUIPES.find(eq => getTurno(eq, diaIdx) === t) })).filter(x => x.equipe)
  const deFolga = EQUIPES.filter(eq => getTurno(eq, diaIdx) === 'F')

  function mudarDia(passo) {
    const novo = diaIdx + passo
    if (novo >= 0 && novo < dias.length) setDiaEscolhido(novo)
  }

  function enviarMensagem(texto) {
    const destino = podeGerirEquipes(sessao) ? equipeDestino : minhaEquipe
    setMensagens(prev => [{ id: `tmp_${Date.now()}`, equipe_id: destino, autor: sessao.nome, texto, created_at: new Date().toISOString() }, ...prev])
    startEnviar(async () => { await executar('apoio.enviarMensagemEquipe', destino, texto) })
  }

  function excluirMensagem(id) {
    setMensagens(prev => prev.filter(m => m.id !== id))
    if (typeof id === 'number') executar('apoio.excluirMensagemEquipe', id)
  }

  const nomeEquipe = id => id === 'todas' ? 'Todas as equipes' : (EQUIPES.find(e => e.id === id)?.nome ?? id)

  return (
    <div className="tela-enter-apoio" style={{ minHeight: '100vh', background: 'var(--bg-app)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 300, height: 300, background: '#5B21B6', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, background: '#0EA5E9', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, top: 420, left: -60 }} />
        <div style={{ position: 'absolute', width: 150, height: 150, background: '#F59E0B', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, top: 900, right: -40 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '14px 22px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span suppressHydrationWarning>{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{tx.oi}, {sessao.nome.split(' ')[0]}!</span>
        </div>

        <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: -1, marginTop: 6 }}>
          {tx.apoio}<br />
          <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>do dia</span>
        </div>

        {/* dia nas plaquinhas */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="button" className="cartao-relevo" aria-label="Dia anterior" disabled={diaIdx === 0} onClick={() => mudarDia(-1)} style={{ ...botaoSeta, opacity: diaIdx === 0 ? 0.3 : 1 }}>‹</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={secao}>Dia</div>
              <Placas valor={diaIdx + 1} />
            </div>
            <button type="button" className="cartao-relevo" aria-label="Próximo dia" disabled={diaIdx === dias.length - 1} onClick={() => mudarDia(1)} style={{ ...botaoSeta, opacity: diaIdx === dias.length - 1 ? 0.3 : 1 }}>›</button>
          </div>
          {dia && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {DIAS_SEMANA[dia.getDay()]}, {dia.getDate()} de {MESES[dia.getMonth()]}
              {ehHoje && <span style={{ color: 'var(--accent-secondary)' }}> · hoje</span>}
            </div>
          )}
        </div>

        {/* turnos do dia */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {turnos.map(({ t, equipe }) => <Turno key={t} turno={t} equipe={equipe} minha={equipe.id === minhaEquipe} tx={tx} />)}
          {deFolga.length > 0 && (
            <div className="cartao-relevo" style={{ borderRadius: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
              <IconeTurno id="F" tamanho={22} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>De folga</div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {deFolga.some(eq => eq.id === minhaEquipe) && <span style={seloSua}>Sua equipe</span>}
                {deFolga.map(eq => <img key={eq.id} src={eq.icone} alt={eq.nome} title={eq.nome} style={{ width: 38, height: 38, objectFit: 'contain' }} />)}
              </div>
            </div>
          )}
          {turnos.length === 0 && deFolga.length === 0 && (
            <div className="cartao-relevo" style={{ borderRadius: 20, padding: 18, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>{tx.nenhumaEscala}</div>
          )}
        </div>

        {/* avisos */}
        {veMensagens && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={secao}>Avisos</div>
            {podeEnviar && (
              <CaixaMensagem titulo={podeGerirEquipes(sessao) ? 'Mandar aviso' : 'Mandar aviso pra sua equipe'} onEnviar={enviarMensagem} enviando={enviando}>
                {podeGerirEquipes(sessao) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {[...EQUIPES.map(eq => ({ id: eq.id, label: eq.nome, icone: eq.icone })), { id: 'todas', label: 'Todas as equipes' }].map(op => (
                      <button type="button" key={op.id} onClick={() => setEquipeDestino(op.id)} style={{
                        padding: '6px 12px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                        border: equipeDestino === op.id ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
                        background: equipeDestino === op.id ? 'var(--accent-bg)' : 'var(--input-bg)',
                        color: equipeDestino === op.id ? 'var(--accent-light)' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-inter), sans-serif'
                      }}>{op.icone && <img src={op.icone} alt="" style={{ width: 16, height: 16 }} />}{op.label}</button>
                    ))}
                  </div>
                )}
              </CaixaMensagem>
            )}
            {mensagens.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 8 }}>Nenhum aviso ainda.</div>}
            {mensagens.map(m => (
              <div key={m.id} className="cartao-relevo" style={{ borderRadius: 20, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-light)', boxShadow: '0 0 10px var(--accent-light)' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent-light)' }}>
                    {podeGerirEquipes(sessao) ? nomeEquipe(m.equipe_id) : 'Aviso pra equipe'}
                  </span>
                  {podeEnviar && (
                    <button type="button" onClick={() => excluirMensagem(m.id)} aria-label="Apagar aviso" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 16, cursor: 'pointer', padding: 2 }}>×</button>
                  )}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--text)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.texto}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }} suppressHydrationWarning>
                  {m.autor} · {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* quem está em cada equipe */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={secao}>{tx.times}</div>
          {EQUIPES.map(eq => {
            const membros = staff.filter(s => s.equipe === eq.id)
            return (
              <div key={eq.id} className="cartao-relevo" style={{ borderRadius: 20, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: `linear-gradient(135deg, ${fosca(eq.cor, 0.14)}, rgba(255,255,255,0.03))` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={eq.icone} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                  <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 15, color: eq.cor }}>{eq.nome}</div>
                  {eq.id === minhaEquipe && <span style={{ ...seloSua, marginLeft: 'auto' }}>Sua equipe</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {membros.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>Ninguém ainda</span>}
                  {membros.map(m => <span key={m.nome} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>{m.nome}</span>)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
