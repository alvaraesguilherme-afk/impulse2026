'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTexto } from '@/lib/i18n'
import { AREA_MIDIA } from '@/lib/areas'
import { EQUIPES, getTurno } from '@/lib/equipes'
import { coordenaArea } from '@/lib/permissoes'
import { useAbaDirecao, abaAdjacente, useSwipeHandlers } from '@/lib/useAbaDirecao'
import { diasDoEvento, idxHoje, hojeLocal, MESES, MESES_C, DIAS_SEMANA } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor } from '@/lib/hooks'
import { BotaoVoltar } from '@/components/botao-voltar'
import { BarraAbas, PainelAba, GradeDias, CartaoHoje, ListaMensagens, CaixaMensagem } from '@/components/abas'

const ORDEM_ABAS = ['escalas', 'mensagens']
const FUNCOES_PADRAO = ['Stories', 'Fotografia', 'Gravação de vídeo']
const TURNOS = [
  { id: 'M', label: 'Manhã', icon: '🌅', temFixas: true },
  { id: 'T', label: 'Tarde', icon: '☀️', temFixas: false },
  { id: 'N', label: 'Noite', icon: '🌙', temFixas: true },
]
const TURNO_NOME = { M: 'Manhã', T: 'Tarde', N: 'Noite', F: 'Folga' }
const inputBase = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-inter), sans-serif' }

// Quem da Mídia também está numa equipe do Apoio pode estar servindo no Apoio
// naquele turno — aí o coordenador vê o aviso antes de escalar.
function turnoApoio(pessoa, diaIdx) {
  const eq = EQUIPES.find(e => e.id === pessoa?.equipe)
  return eq ? getTurno(eq, diaIdx) : null
}

export function Midia({ sessao, inicio, veMensagens, escalas: escalasServidor, equipe, mensagens: mensagensServidor }) {
  const tx = useTexto()
  const dias = useMemo(() => diasDoEvento(inicio), [inicio])
  const montado = useMontado()
  const [diaEscolhido, setDiaIdx] = useState(null)
  const hoje = montado ? hojeLocal() : null
  const diaIdx = diaEscolhido ?? (montado ? idxHoje(inicio) : 0)
  const [escalas, setEscalas] = useEstadoServidor(escalasServidor)
  const [mensagens, setMensagens] = useEstadoServidor(mensagensServidor)
  const [coordenador, setCoordenador] = useState(false)
  const [addingTo, setAddingTo] = useState(null)
  const [novaFuncao, setNovaFuncao] = useState('')
  const [funcaoSelecionada, setFuncaoSelecionada] = useState('')
  const [aba, setAba, direcaoAba, abaSaindo] = useAbaDirecao('escalas', ORDEM_ABAS)
  const [enviando, startEnviar] = useTransition()


  const podeCoordenar = coordenaArea(sessao, AREA_MIDIA)
  const diaNum = diaIdx + 1
  const pessoaPorNome = nome => equipe.find(p => p.nome === nome)

  function conflito(nome, turnoId) {
    const t = turnoApoio(pessoaPorNome(nome), diaIdx)
    return t && t !== 'F' && t === turnoId ? `Apoio (${TURNO_NOME[t]})` : null
  }

  const abasList = [{ id: 'escalas', label: '📅 Escalas' }, veMensagens && { id: 'mensagens', label: '💬 Mensagens' }].filter(Boolean)
  const abasVisiveis = abasList.map(a => a.id)
  const swipeHandlers = useSwipeHandlers(
    () => { const p = abaAdjacente(abasVisiveis, aba, 1); if (p) setAba(p) },
    () => { const p = abaAdjacente(abasVisiveis, aba, -1); if (p) setAba(p) }
  )

  function atribuirPessoa(turno, funcao, pessoa) {
    setEscalas(prev => {
      const existe = prev.some(e => e.dia === diaNum && e.turno === turno && e.funcao === funcao)
      return existe
        ? prev.map(e => (e.dia === diaNum && e.turno === turno && e.funcao === funcao) ? { ...e, pessoa } : e)
        : [...prev, { id: `tmp_${Date.now()}`, dia: diaNum, turno, funcao, pessoa }]
    })
    executar('midia.atribuirPessoa', diaNum, turno, funcao, pessoa)
  }

  function adicionarFuncao(turno) {
    const nome = funcaoSelecionada === 'outra' ? novaFuncao.trim() : funcaoSelecionada
    if (!nome) return
    setEscalas(prev => [...prev, { id: `tmp_${Date.now()}`, dia: diaNum, turno, funcao: nome, pessoa: '' }])
    executar('midia.adicionarFuncao', diaNum, turno, nome)
    setNovaFuncao('')
    setFuncaoSelecionada('')
    setAddingTo(null)
  }

  function removerFuncao(id) {
    setEscalas(prev => prev.filter(e => e.id !== id))
    if (typeof id === 'number') executar('midia.removerFuncao', id)
  }

  function enviarMensagem(texto) {
    setMensagens(prev => [{ id: `tmp_${Date.now()}`, equipe_id: 'midia', autor: sessao.nome, texto, created_at: new Date().toISOString() }, ...prev])
    startEnviar(async () => { await executar('midia.enviarMensagemMidia', texto) })
  }

  function excluirMensagem(id) {
    setMensagens(prev => prev.filter(m => m.id !== id))
    if (typeof id === 'number') executar('midia.excluirMensagemMidia', id)
  }

  function getEscalasTurno(turnoId) {
    const turno = TURNOS.find(t => t.id === turnoId)
    const registros = escalas.filter(e => e.dia === diaNum && e.turno === turnoId)
    const resultado = []
    if (turno.temFixas) {
      for (const funcao of FUNCOES_PADRAO) {
        const reg = registros.find(e => e.funcao === funcao)
        resultado.push({ id: reg?.id, funcao, pessoa: reg?.pessoa || '', fixo: true, removivel: false })
      }
      for (const e of registros) {
        if (!FUNCOES_PADRAO.includes(e.funcao)) resultado.push({ id: e.id, funcao: e.funcao, pessoa: e.pessoa || '', fixo: false, removivel: true })
      }
    } else {
      for (const e of registros) resultado.push({ id: e.id, funcao: e.funcao, pessoa: e.pessoa || '', fixo: FUNCOES_PADRAO.includes(e.funcao), removivel: true })
    }
    return resultado
  }

  const dia = dias[diaIdx]

  return (
    <div className="tela-enter-midia" style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <BotaoVoltar />
        <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700 }}>{tx.midia}</h2>
        {podeCoordenar && (
          <button onClick={() => setCoordenador(c => !c)} style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
            border: coordenador ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
            background: coordenador ? 'var(--accent-bg)' : 'var(--bg-card)',
            color: coordenador ? 'var(--accent-light)' : 'var(--text-muted)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif'
          }}>{coordenador ? `${sessao.nome} ✓` : '🔒 Coordenador'}</button>
        )}
      </div>

      <BarraAbas abas={abasList} ativa={aba} onTrocar={setAba} />

      <div style={{ position: 'relative', overflow: 'hidden' }} {...swipeHandlers}>
        <PainelAba id="escalas" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current}>
          <div style={{ padding: '12px 22px 0' }}>
            <CartaoHoje hoje={hoje} meses={MESES} diasSemana={DIAS_SEMANA} onClick={() => setDiaIdx(idxHoje(inicio))} />
          </div>
          <div style={{ padding: '12px 22px', marginBottom: 4 }}>
            <GradeDias dias={dias} selecionado={diaIdx} onSelecionar={setDiaIdx} hoje={hoje} mesesC={MESES_C} />
          </div>

          <div style={{ padding: '0 22px 100px' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{dia.getDate()} de {MESES[dia.getMonth()]}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{DIAS_SEMANA[dia.getDay()]}</div>
            </div>

            {TURNOS.filter(turno => !(diaNum === 1 && turno.id !== 'N')).map(turno => {
              const itens = getEscalasTurno(turno.id)
              return (
                <div key={turno.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>{turno.icon}</span>
                    <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 15, fontWeight: 700 }}>{turno.label}</span>
                    {!turno.temFixas && itens.length === 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic', marginLeft: 4 }}>{tx.semEscala}</span>
                    )}
                  </div>

                  {itens.map((item, idx) => {
                    const motivo = item.pessoa ? conflito(item.pessoa, turno.id) : null
                    const souEu = item.pessoa === sessao.nome
                    return (
                      <div key={item.id || `fixed-${idx}`} style={{
                        background: souEu ? 'rgba(250,204,21,0.04)' : 'var(--bg-card)',
                        border: souEu ? '1.5px solid rgba(250,204,21,0.5)' : '1px solid var(--border)',
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
                              <select value={item.pessoa} onChange={e => atribuirPessoa(turno.id, item.funcao, e.target.value)}
                                style={{ ...inputBase, padding: '8px 10px', borderRadius: 10, fontSize: 12 }}>
                                <option value="">{tx.selecionarPessoa}</option>
                                {equipe.map(p => {
                                  const m = conflito(p.nome, turno.id)
                                  return <option key={p.nome} value={p.nome}>{p.nome} {m ? `— ${m}` : `— ${tx.livre}`}</option>
                                })}
                              </select>
                              {motivo && (
                                <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 11, color: '#FBBF24', fontWeight: 500 }}>
                                  ⚠️ {item.pessoa} está no {motivo} neste turno
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, color: item.pessoa ? 'var(--text-secondary)' : 'var(--text-faint)', fontStyle: item.pessoa ? 'normal' : 'italic' }}>
                                {item.pessoa || tx.naoAtribuido}
                              </span>
                              {motivo && <span style={{ fontSize: 9, background: 'rgba(245,158,11,0.2)', color: '#FBBF24', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>APOIO</span>}
                            </div>
                          )}
                        </div>
                        {coordenador && item.removivel && (
                          <button onClick={() => removerFuncao(item.id)} style={{
                            width: 32, height: 32, borderRadius: 10, border: 'none',
                            background: 'rgba(239,68,68,0.15)', color: '#F87171',
                            fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>✕</button>
                        )}
                      </div>
                    )
                  })}

                  {coordenador && (
                    addingTo === turno.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        <select value={funcaoSelecionada} onChange={e => setFuncaoSelecionada(e.target.value)} autoFocus
                          style={{ ...inputBase, padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>
                          <option value="">Selecione a função...</option>
                          {FUNCOES_PADRAO.filter(f => !itens.some(i => i.funcao === f)).map(f => <option key={f} value={f}>{f}</option>)}
                          <option value="outra">+ Outra função...</option>
                        </select>
                        {funcaoSelecionada === 'outra' && (
                          <input value={novaFuncao} onChange={e => setNovaFuncao(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarFuncao(turno.id)}
                            placeholder={tx.nomeFuncao} autoFocus style={{ ...inputBase, padding: '10px 14px', borderRadius: 12, fontSize: 13 }} />
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(() => {
                            const desab = !funcaoSelecionada || (funcaoSelecionada === 'outra' && !novaFuncao.trim())
                            return (
                              <button onClick={() => adicionarFuncao(turno.id)} disabled={desab} style={{
                                flex: 1, padding: 10, borderRadius: 12, border: 'none',
                                background: desab ? 'var(--input-bg)' : 'var(--gradient)', color: desab ? 'var(--text-faint)' : 'var(--text)',
                                fontSize: 13, fontWeight: 700, cursor: desab ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-inter), sans-serif'
                              }}>+ Adicionar</button>
                            )
                          })()}
                          <button onClick={() => { setAddingTo(null); setNovaFuncao(''); setFuncaoSelecionada('') }} style={{
                            padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-strong)',
                            background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer'
                          }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingTo(turno.id); setNovaFuncao(''); setFuncaoSelecionada('') }} style={{
                        width: '100%', padding: '10px', borderRadius: 12, border: '1px dashed var(--border-strong)', background: 'transparent',
                        color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4, fontFamily: 'var(--font-inter), sans-serif'
                      }}>{tx.adicionarFuncao}</button>
                    )
                  )}
                </div>
              )
            })}

            <div style={{ marginTop: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{tx.equipeMidia}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {equipe.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>Ninguém ainda</span>}
                {equipe.map(p => {
                  const t = turnoApoio(p, diaIdx)
                  if (!p.equipe || p.equipe === 'sem_escala') {
                    return <span key={p.nome} style={{ fontSize: 11, background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', borderRadius: 20, padding: '4px 10px', color: 'var(--accent-light)', fontWeight: 500 }}>{p.nome}</span>
                  }
                  const ocupado = t && t !== 'F'
                  return (
                    <span key={p.nome} style={{
                      fontSize: 11, borderRadius: 20, padding: '4px 10px', fontWeight: 500,
                      background: ocupado ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      border: ocupado ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(16,185,129,0.25)',
                      color: ocupado ? '#FBBF24' : '#6EE7B7'
                    }}>{p.nome} — {ocupado ? `Apoio ${TURNO_NOME[t]}` : tx.livreODiaTodo}</span>
                  )
                })}
              </div>
            </div>
          </div>
        </PainelAba>

        <PainelAba id="mensagens" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current} style={{ padding: '16px 22px 100px' }}>
          {podeCoordenar && <CaixaMensagem titulo="Mandar mensagem para a equipe de Mídia" onEnviar={enviarMensagem} enviando={enviando} />}
          <ListaMensagens mensagens={mensagens} podeExcluir={podeCoordenar} onExcluir={excluirMensagem} />
        </PainelAba>
      </div>
    </div>
  )
}
