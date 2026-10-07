'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTexto } from '@/lib/i18n'
import { EQUIPES, getTurno } from '@/lib/equipes'
import { AREA_APOIO } from '@/lib/areas'
import { coordenaArea, podeGerirEquipes } from '@/lib/permissoes'
import { useAbaDirecao, abaAdjacente, useSwipeHandlers } from '@/lib/useAbaDirecao'
import { diasDoEvento, idxHoje, hojeLocal, MESES, MESES_C, DIAS_SEMANA, TOTAL_DIAS, diffDias, dataLocal } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor } from '@/lib/hooks'
import { BotaoVoltar } from '@/components/botao-voltar'
import { BarraAbas, PainelAba, GradeDias, CartaoHoje, ListaMensagens, CaixaMensagem } from '@/components/abas'

const ORDEM_ABAS = ['times', 'escalas', 'mensagens']
const TURNO_KEY = { M: 'manha', T: 'tarde', N: 'noite', F: 'folga' }
const TAREFAS_TURNO = {
  M: ['servirCafe', 'lavarLoucas', 'limpezaRefeitorio', 'retiradaLixo'],
  T: ['servirAlmoco', 'lavarLoucas', 'limpezaRefeitorio', 'limpezaTemplo'],
  N: ['servirJantar', 'lavarLoucas', 'limpezaRefeitorio', 'limpezaTemplo'],
}
const TURNO_ICON = { M: '🌅', T: '☀️', N: '🌙', F: '😴' }
const chip = { fontSize: 11, background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 20, padding: '4px 10px', color: 'var(--text-secondary)' }

export function Apoio({ sessao, inicio, minhaEquipe, staff, mensagens: mensagensServidor }) {
  const tx = useTexto()
  const [aba, setAba, direcaoAba, abaSaindo] = useAbaDirecao('times', ORDEM_ABAS)
  const dias = useMemo(() => diasDoEvento(inicio), [inicio])
  const montado = useMontado()
  const [diaEscolhido, setDiaIdx] = useState(null)
  const hoje = montado ? hojeLocal() : null
  const diaIdx = diaEscolhido ?? (montado ? idxHoje(inicio) : 0)
  const [mensagens, setMensagens] = useEstadoServidor(mensagensServidor)
  const [equipeDestino, setEquipeDestino] = useState('todas')
  const [enviando, startEnviar] = useTransition()


  const podeEnviar = coordenaArea(sessao, AREA_APOIO) && (podeGerirEquipes(sessao) || !!minhaEquipe)
  const veMensagens = podeGerirEquipes(sessao) || !!minhaEquipe
  const isMinhaEquipe = eq => eq.id === minhaEquipe

  const abasList = [
    { id: 'times', label: `👥 ${tx.times}` },
    { id: 'escalas', label: `📅 ${tx.escalas}` },
    veMensagens && { id: 'mensagens', label: '💬 Mensagens' },
  ].filter(Boolean)
  const abasVisiveis = abasList.map(a => a.id)
  const swipeHandlers = useSwipeHandlers(
    () => { const p = abaAdjacente(abasVisiveis, aba, 1); if (p) setAba(p) },
    () => { const p = abaAdjacente(abasVisiveis, aba, -1); if (p) setAba(p) }
  )

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
  const diaEscala = dias[diaIdx]
  const hojeNoEvento = hoje && diffDias(hoje, dataLocal(inicio)) >= 0 && diffDias(hoje, dataLocal(inicio)) < TOTAL_DIAS

  return (
    <div className="tela-enter-apoio" style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <BotaoVoltar />
        <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700 }}>{tx.escalasDeServico}</h2>
      </div>
      <BarraAbas abas={abasList} ativa={aba} onTrocar={setAba} />
      <div style={{ padding: '16px 22px 100px', position: 'relative', overflow: 'hidden' }} {...swipeHandlers}>
        <PainelAba id="times" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          {EQUIPES.map(eq => {
            const membros = staff.filter(s => s.equipe === eq.id)
            return (
              <div key={eq.id} style={{ background: isMinhaEquipe(eq) ? 'rgba(250,204,21,0.04)' : 'var(--bg-card)', border: isMinhaEquipe(eq) ? '1.5px solid rgba(250,204,21,0.5)' : '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={eq.icone} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} /></div>
                  <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 15, fontWeight: 700, color: eq.cor }}>{eq.nome}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{tx.membros}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {membros.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>Ninguém ainda</span>}
                  {membros.map(m => <span key={m.nome} style={chip}>{m.nome}</span>)}
                </div>
              </div>
            )
          })}
        </PainelAba>

        <PainelAba id="escalas" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          <CartaoHoje hoje={hoje} meses={MESES} diasSemana={DIAS_SEMANA} acao={tx.verEscala} rotulo={tx.hoje}
            onClick={() => setDiaIdx(hojeNoEvento ? idxHoje(inicio) : 0)} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', margin: '16px 0 12px' }}>{tx.calendario}</div>
          <GradeDias dias={dias} selecionado={diaIdx} onSelecionar={setDiaIdx} hoje={hoje} mesesC={MESES_C} />
          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 22, fontWeight: 800, margin: '16px 0 2px' }}>{diaEscala.getDate()} de {MESES[diaEscala.getMonth()]}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{DIAS_SEMANA[diaEscala.getDay()]}</div>

          {['M', 'T', 'N'].map(turnoId => {
            const equipe = EQUIPES.find(eq => getTurno(eq, diaIdx) === turnoId)
            if (!equipe) return null
            const minha = isMinhaEquipe(equipe)
            return (
              <div key={turnoId} style={{ background: minha ? 'rgba(250,204,21,0.04)' : 'var(--bg-card)', border: minha ? '1.5px solid rgba(250,204,21,0.5)' : '1px solid var(--border)', borderRadius: 20, padding: 18, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{TURNO_ICON[turnoId]}</span>
                    <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 15, fontWeight: 700 }}>{tx[TURNO_KEY[turnoId]]}</span>
                  </div>
                  <span style={{ fontSize: 12, color: equipe.cor, fontWeight: 600 }}><img src={equipe.icone} alt="" style={{ width: 15, height: 15, objectFit: 'contain', verticalAlign: -3 }} /> {equipe.nome}</span>
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

          {EQUIPES.filter(eq => getTurno(eq, diaIdx) === 'F').map(eq => (
            <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: isMinhaEquipe(eq) ? 'rgba(250,204,21,0.04)' : 'var(--bg-card)', border: isMinhaEquipe(eq) ? '1.5px solid rgba(250,204,21,0.5)' : '1px solid var(--border)', borderRadius: 14, marginBottom: 8 }}>
              <img src={eq.icone} alt="" style={{ width: 18, height: 18, objectFit: 'contain', verticalAlign: -4 }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{eq.nome}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>😴 Folga</span>
            </div>
          ))}

          {EQUIPES.every(eq => !getTurno(eq, diaIdx)) && (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 12 }}>{tx.nenhumaEscala}</div>
          )}
        </PainelAba>

        <PainelAba id="mensagens" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          {podeEnviar && (
            <CaixaMensagem titulo={podeGerirEquipes(sessao) ? 'Mandar mensagem' : 'Mandar mensagem para sua equipe'} onEnviar={enviarMensagem} enviando={enviando}>
              {podeGerirEquipes(sessao) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[...EQUIPES.map(eq => ({ id: eq.id, label: `${eq.emoji} ${eq.nome}` })), { id: 'todas', label: '📢 Todas as equipes' }].map(op => (
                    <button type="button" key={op.id} onClick={() => setEquipeDestino(op.id)} style={{
                      padding: '6px 12px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                      border: equipeDestino === op.id ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
                      background: equipeDestino === op.id ? 'var(--accent-bg)' : 'var(--input-bg)',
                      color: equipeDestino === op.id ? 'var(--accent-light)' : 'var(--text-muted)',
                      fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-inter), sans-serif'
                    }}>{op.label}</button>
                  ))}
                </div>
              )}
            </CaixaMensagem>
          )}
          <ListaMensagens mensagens={mensagens} podeExcluir={podeEnviar} onExcluir={excluirMensagem}
            rotuloEquipe={podeGerirEquipes(sessao) ? nomeEquipe : null} />
        </PainelAba>
      </div>
    </div>
  )
}
