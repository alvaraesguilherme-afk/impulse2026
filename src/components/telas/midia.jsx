'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTexto } from '@/lib/i18n'
import { AREA_MIDIA } from '@/lib/areas'
import { EQUIPES, getTurno } from '@/lib/equipes'
import { coordenaArea } from '@/lib/permissoes'
import { diasDoEvento, idxHoje } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor } from '@/lib/hooks'
import { IconeTurno } from '@/components/icone-turno'
import { AvatarPessoa } from '@/components/fluxo-sem-funcao'
import { SeletorDia } from '@/components/seletor-dia'

const FUNCOES_PADRAO = ['Stories', 'Fotografia', 'Gravação de vídeo']
const TURNOS = [
  { id: 'M', label: 'Manhã', icon: '🌅', cor: '#FBBF24', temFixas: true },
  { id: 'T', label: 'Tarde', icon: '☀️', cor: '#FB923C', temFixas: false },
  { id: 'N', label: 'Noite', icon: '🌙', cor: '#818CF8', temFixas: true },
]
const TURNO_NOME = { M: 'Manhã', T: 'Tarde', N: 'Noite', F: 'Folga' }
// Cor com opacidade a (0 a 1)
const fosca = (cor, a) => { const n = parseInt(cor.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }
const secao = { fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)' }
const inputBase = { width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-inter), sans-serif' }

// Quem da Mídia também está numa equipe do Apoio pode estar servindo no Apoio
// naquele turno — aí o coordenador vê o aviso antes de escalar.
function turnoApoio(pessoa, diaIdx) {
  const eq = EQUIPES.find(e => e.id === pessoa?.equipe)
  return eq ? getTurno(eq, diaIdx) : null
}

// Uma vaga da linha do tempo: foto de quem faz, a função embaixo e o primeiro
// nome. Com o modo coordenador ligado vira botão e abre a escolha da pessoa.
function Vaga({ item, turno, pessoa, souEu, apoio, coordenador, onAbrir }) {
  const nome = item.pessoa
  const conteudo = (
    <>
      {apoio && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700, letterSpacing: 0.4, padding: '2px 6px', borderRadius: 6, background: 'rgba(245,158,11,0.2)', color: '#FBBF24' }}>APOIO</span>}
      {nome ? (
        <span style={{ borderRadius: '50%', boxShadow: souEu ? '0 0 0 2px rgba(250,204,21,0.9)' : 'none', display: 'flex' }}>
          <AvatarPessoa nome={nome} url={pessoa?.avatar} tamanho={52} />
        </span>
      ) : (
        <span style={{ width: 52, height: 52, borderRadius: '50%', border: '1.5px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 20 }}>{coordenador ? '+' : ''}</span>
      )}
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: turno.cor, lineHeight: 1.15, minHeight: 21, display: 'flex', alignItems: 'center' }}>{item.funcao}</span>
      <span style={{ fontSize: 12, fontWeight: nome ? 600 : 500, fontStyle: nome ? 'normal' : 'italic', color: nome ? 'var(--text)' : 'var(--text-faint)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {nome ? nome.split(' ')[0] : 'Aberta'}
      </span>
    </>
  )
  const estilo = {
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0,
    padding: '12px 4px 10px', borderRadius: 16, border: 'none', textAlign: 'center', color: 'var(--text)',
    background: `color-mix(in srgb, ${turno.cor} 9%, rgba(255,255,255,0.03))`,
    boxShadow: `inset 0 0 0 1px ${fosca(turno.cor, 0.18)}`,
    fontFamily: 'var(--font-inter), sans-serif',
  }
  return coordenador
    ? <button type="button" onClick={onAbrir} style={{ ...estilo, cursor: 'pointer' }}>{conteudo}</button>
    : <div style={estilo}>{conteudo}</div>
}

// Gaveta de baixo pra escolher quem faz a vaga. Mostra na hora quem já está no
// Apoio naquele turno, pro coordenador não escalar a mesma pessoa duas vezes.
function EscolherPessoa({ item, turno, equipe, conflito, onEscolher, onRemover, onFechar }) {
  useEffect(() => {
    const tecla = e => { if (e.key === 'Escape') onFechar() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [onFechar])

  return createPortal(
    <>
      <div onClick={onFechar} style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(0,0,0,0.6)' }} />
      <div role="dialog" aria-label="Escolher pessoa" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 351, maxHeight: '82dvh', overflowY: 'auto',
        maxWidth: 560, margin: '0 auto', padding: '10px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
        background: '#12141C', borderTop: '1px solid var(--border-strong)', borderRadius: '26px 26px 0 0',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-strong)', margin: '0 auto 4px' }} />
        <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700 }}>
          {item.funcao} · {turno.label}
          <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>Quem faz?</div>
        </div>
        {equipe.map(p => {
          const motivo = conflito(p.nome, turno.id)
          const atual = p.nome === item.pessoa
          return (
            <button key={p.nome} type="button" onClick={() => onEscolher(p.nome)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 54, padding: '8px 10px', borderRadius: 14, textAlign: 'left',
              border: atual ? '1px solid var(--accent-border)' : '1px solid transparent',
              background: atual ? 'var(--accent-bg)' : 'transparent', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif',
            }}>
              <AvatarPessoa nome={p.nome} url={p.avatar} tamanho={38} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{p.nome}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', background: motivo ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: motivo ? '#FBBF24' : '#6EE7B7' }}>{motivo || 'Livre'}</span>
            </button>
          )
        })}
        <button type="button" onClick={() => onEscolher('')} style={{ minHeight: 48, borderRadius: 14, border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>Deixar a vaga aberta</button>
        {item.removivel && (
          <button type="button" onClick={onRemover} style={{ minHeight: 48, borderRadius: 14, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#F87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>Remover esta função</button>
        )}
      </div>
    </>,
    document.body
  )
}

export function Midia({ sessao, inicio, escalas: escalasServidor, equipe }) {
  const tx = useTexto()
  const dias = useMemo(() => diasDoEvento(inicio), [inicio])
  const montado = useMontado()
  const [diaEscolhido, setDiaIdx] = useState(null)
  const diaIdx = diaEscolhido ?? (montado ? idxHoje(inicio) : 0)
  const [escalas, setEscalas] = useEstadoServidor(escalasServidor)
  const [coordenador, setCoordenador] = useState(false)
  const [escolhendo, setEscolhendo] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [novaFuncao, setNovaFuncao] = useState('')
  const [funcaoSelecionada, setFuncaoSelecionada] = useState('')


  const podeCoordenar = coordenaArea(sessao, AREA_MIDIA)
  const diaNum = diaIdx + 1
  const pessoaPorNome = nome => equipe.find(p => p.nome === nome)

  function conflito(nome, turnoId) {
    const t = turnoApoio(pessoaPorNome(nome), diaIdx)
    return t && t !== 'F' && t === turnoId ? `Apoio (${TURNO_NOME[t]})` : null
  }

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

  const idxDeHoje = montado ? idxHoje(inicio) : -1
  const turnosDoDia = TURNOS.filter(turno => !(diaNum === 1 && turno.id !== 'N'))

  return (
    <div className="tela-enter-midia" style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: -1, marginTop: 6 }}>
          {tx.midia}<br />
          <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>escala do dia</span>
        </div>
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

      <div>
          <div style={{ padding: '16px 22px 100px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <SeletorDia dias={dias} diaIdx={diaIdx} idxDeHoje={idxDeHoje} onMudar={setDiaIdx} />

            {/* linha do tempo: o dia de cima a baixo, um fio ligando os turnos */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {turnosDoDia.map((turno, ti) => {
                const itens = getEscalasTurno(turno.id)
                const prox = turnosDoDia[ti + 1]
                return (
                  <div key={turno.id} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{
                        width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${turno.cor}`, background: `color-mix(in srgb, ${turno.cor} 18%, var(--bg-tela))`, boxShadow: `0 0 14px ${fosca(turno.cor, 0.45)}`,
                      }}>
                        <IconeTurno id={turno.id} emoji={turno.icon} />
                      </span>
                      {prox && <span style={{ flex: 1, width: 2, margin: '4px 0', opacity: 0.55, background: `linear-gradient(${turno.cor}, ${prox.cor})` }} />}
                    </div>

                    <div style={{ minWidth: 0, paddingBottom: prox ? 18 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0 10px' }}>
                        <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 15, fontWeight: 700 }}>{turno.label}</span>
                        {!turno.temFixas && itens.length === 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>{tx.semEscala}</span>
                        )}
                      </div>

                      {itens.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          {itens.map((item, idx) => (
                            <Vaga
                              key={item.id || `fixa-${idx}`}
                              item={item}
                              turno={turno}
                              pessoa={item.pessoa ? pessoaPorNome(item.pessoa) : null}
                              souEu={item.pessoa === sessao.nome}
                              apoio={!!item.pessoa && !!conflito(item.pessoa, turno.id)}
                              coordenador={coordenador}
                              onAbrir={() => setEscolhendo({ turno: turno.id, funcao: item.funcao })}
                            />
                          ))}
                        </div>
                      )}

                      {coordenador && (
                        addingTo === turno.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
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
                            color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10, fontFamily: 'var(--font-inter), sans-serif'
                          }}>{tx.adicionarFuncao}</button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* equipe de mídia: quem está livre e quem serve no Apoio neste dia */}
            <div style={secao}>{tx.equipeMidia}</div>
            <div className="cartao-relevo" style={{ borderRadius: 20, padding: '8px 14px', display: 'flex', flexDirection: 'column' }}>
              {equipe.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', padding: '8px 0' }}>Ninguém ainda</span>}
              {equipe.map((p, k) => {
                const t = turnoApoio(p, diaIdx)
                const ocupado = !!t && t !== 'F'
                return (
                  <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: k ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                    <AvatarPessoa nome={p.nome} url={p.avatar} tamanho={38} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{p.nome}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
                      background: ocupado ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: ocupado ? '#FBBF24' : '#6EE7B7'
                    }}>{ocupado ? `Apoio ${TURNO_NOME[t]}` : tx.livreODiaTodo}</span>
                  </div>
                )
              })}
            </div>
          </div>
      </div>

      {escolhendo && montado && (() => {
        const turno = TURNOS.find(t => t.id === escolhendo.turno)
        const item = getEscalasTurno(escolhendo.turno).find(i => i.funcao === escolhendo.funcao)
        if (!item) return null
        return (
          <EscolherPessoa item={item} turno={turno} equipe={equipe} conflito={conflito}
            onFechar={() => setEscolhendo(null)}
            onEscolher={nome => { atribuirPessoa(turno.id, item.funcao, nome); setEscolhendo(null) }}
            onRemover={() => { removerFuncao(item.id); setEscolhendo(null) }} />
        )
      })()}
    </div>
  )
}
