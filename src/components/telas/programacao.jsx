'use client'

import { useMemo, useState } from 'react'
import { useTexto } from '@/lib/i18n'
import { AREA_PROGRAMACAO } from '@/lib/areas'
import { coordenaArea, ehAdmin } from '@/lib/permissoes'
import { useAbaDirecao, abaAdjacente, useSwipeHandlers } from '@/lib/useAbaDirecao'
import { diasDoEvento, idxHoje, hojeLocal, MESES, MESES_C, DIAS_SEMANA } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor } from '@/lib/hooks'
import { BotaoVoltar } from '@/components/botao-voltar'
import { BarraAbas, PainelAba, GradeDias, CartaoHoje } from '@/components/abas'

const ORDEM_ABAS = ['louvor', 'ministro', 'cadastro']
const TURNOS = [
  { id: 'M', label: 'Manhã', icon: '🌅' },
  { id: 'N', label: 'Noite', icon: '🌙' },
]
const campo = { width: '100%', padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 12, fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8, fontFamily: 'var(--font-inter), sans-serif' }

export function Programacao({ sessao, inicio, dados: dadosServidor, cadastros: cadastrosServidor }) {
  const tx = useTexto()
  const dias = useMemo(() => diasDoEvento(inicio), [inicio])
  const [aba, setAba, direcaoAba, abaSaindo] = useAbaDirecao('louvor', ORDEM_ABAS)
  const montado = useMontado()
  const [diaEscolhido, setDiaIdx] = useState(null)
  const hoje = montado ? hojeLocal() : null
  const diaIdx = diaEscolhido ?? (montado ? idxHoje(inicio) : 0)
  const [dados, setDados] = useEstadoServidor(dadosServidor)
  const [cadastros, setCadastros] = useEstadoServidor(cadastrosServidor)
  const [coordenador, setCoordenador] = useState(false)
  const [editando, setEditando] = useState(null)
  const [formSelecionado, setFormSelecionado] = useState('')
  const [formTema, setFormTema] = useState('')
  const [cadNome, setCadNome] = useState('')
  const [cadMembros, setCadMembros] = useState('')
  const [cadErro, setCadErro] = useState('')


  const diaNum = diaIdx + 1
  const getDado = (turnoId, tipo) => dados.find(d => d.dia === diaNum && d.turno === turnoId && d.tipo === tipo)
  const getCadastrosPorTipo = tipo => cadastros.filter(c => c.tipo === tipo)

  function abrirEdicao(turnoId, tipo) {
    const atual = getDado(turnoId, tipo)
    setEditando({ turno: turnoId, tipo })
    setFormSelecionado(atual?.titulo || '')
    setFormTema(atual?.tema || '')
  }

  function salvarEscala() {
    if (!editando || !formSelecionado) return
    const { turno, tipo } = editando
    const cadastro = cadastros.find(c => c.tipo === tipo && c.nome === formSelecionado)
    const novo = {
      id: `tmp_${Date.now()}`, dia: diaNum, turno, tipo, titulo: formSelecionado,
      membros: tipo === 'louvor' ? (cadastro?.membros || null) : null,
      tema: tipo === 'ministro' ? (formTema.trim() || null) : null,
    }
    setDados(prev => [...prev.filter(d => !(d.dia === diaNum && d.turno === turno && d.tipo === tipo)), novo])
    executar('programacao.salvarEscala', diaNum, turno, tipo, formSelecionado, formTema)
    setEditando(null)
  }

  function limpar(turnoId, tipo) {
    setDados(prev => prev.filter(d => !(d.dia === diaNum && d.turno === turnoId && d.tipo === tipo)))
    executar('programacao.limparEscala', diaNum, turnoId, tipo)
    setEditando(null)
  }

  async function adicionarCadastro(tipo) {
    if (tipo === 'ministro' && !cadNome.trim()) return
    if (tipo === 'louvor' && !cadNome.trim() && !cadMembros.trim()) return
    const nome = cadNome.trim() || 'Equipe sem nome'
    if (cadastros.some(c => c.tipo === tipo && c.nome.toLowerCase() === nome.toLowerCase())) { setCadErro(`"${nome}" já está cadastrado.`); return }
    setCadErro('')
    setCadastros(prev => [...prev, { id: `tmp_${Date.now()}`, tipo, nome, membros: tipo === 'louvor' ? (cadMembros.trim() || null) : null }])
    setCadNome('')
    setCadMembros('')
    const r = await executar('programacao.adicionarCadastro', tipo, nome, cadMembros)
    if (r.resultado?.erro) setCadErro(r.resultado.erro)
  }

  function removerCadastro(id) {
    setCadastros(prev => prev.filter(c => c.id !== id))
    if (typeof id === 'number') executar('programacao.removerCadastro', id)
  }

  const ABAS = [
    { id: 'louvor', label: '🎵 Louvor' },
    ...(ehAdmin(sessao) ? [{ id: 'ministro', label: <><img src="/icons/preletores.png" alt="" style={{ width: 13, height: 13, verticalAlign: -2 }} /> Preletores</> }] : []),
    ...(coordenador ? [{ id: 'cadastro', label: '⚙️ Cadastro' }] : []),
  ]
  const abasVisiveis = ABAS.map(a => a.id)
  const swipeHandlers = useSwipeHandlers(
    () => { const p = abaAdjacente(abasVisiveis, aba, 1); if (p) setAba(p) },
    () => { const p = abaAdjacente(abasVisiveis, aba, -1); if (p) setAba(p) }
  )
  const dia = dias[diaIdx]
  const tipoAba = aba === 'ministro' ? 'ministro' : 'louvor'
  const mostrandoEscala = aba === 'louvor' || aba === 'ministro' || abaSaindo === 'louvor' || abaSaindo === 'ministro'

  return (
    <div className="tela-enter" style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <BotaoVoltar />
        <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700 }}>{tx.programacao}</h2>
        {coordenaArea(sessao, AREA_PROGRAMACAO) && (
          <button onClick={() => { if (coordenador) { setEditando(null); setAba('louvor') } setCoordenador(c => !c) }} style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
            border: coordenador ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
            background: coordenador ? 'var(--accent-bg)' : 'var(--bg-card)',
            color: coordenador ? 'var(--accent-light)' : 'var(--text-muted)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif'
          }}>{coordenador ? `${sessao.nome} ✓` : '🔒 Coordenador'}</button>
        )}
      </div>

      <BarraAbas abas={ABAS} ativa={aba} onTrocar={id => { setAba(id); setEditando(null) }} />

      <div style={{ position: 'relative', overflow: 'hidden' }} {...swipeHandlers}>
        {coordenador && (
          <PainelAba id="cadastro" aba={aba} abaSaindo={abaSaindo} direcao={direcaoAba.current} style={{ padding: '16px 22px 100px' }}>
            {['louvor', 'ministro'].map(tipo => {
              const lista = getCadastrosPorTipo(tipo)
              return (
                <div key={tipo} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                    {tipo === 'louvor' ? '🎵 Equipes de Louvor' : <><img src="/icons/preletores.png" alt="" style={{ width: 14, height: 14, verticalAlign: -2 }} /> Preletores</>}
                  </div>
                  {lista.map(c => (
                    <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                        {c.membros && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.membros}</div>}
                      </div>
                      <button onClick={() => removerCadastro(c.id)} style={{ width: 30, height: 30, borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#F87171', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                  {lista.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: 8 }}>
                      {tipo === 'louvor' ? 'Nenhuma equipe cadastrada' : 'Nenhum preletor cadastrado'}
                    </div>
                  )}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                    <input value={cadNome} onChange={e => { setCadNome(e.target.value); setCadErro('') }} placeholder={tipo === 'louvor' ? tx.nomeDaEquipe : tx.nomeDoMinistro} style={campo} />
                    {tipo === 'louvor' && <input value={cadMembros} onChange={e => setCadMembros(e.target.value)} placeholder={tx.membrosSeparados} style={campo} />}
                    {cadErro && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 8, textAlign: 'center' }}>{cadErro}</div>}
                    <button onClick={() => adicionarCadastro(tipo)} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'var(--gradient)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>+ Adicionar</button>
                  </div>
                </div>
              )
            })}
          </PainelAba>
        )}

        {mostrandoEscala && (
          <div className={(aba === 'louvor' || aba === 'ministro') ? `tab-entra-${direcaoAba.current}` : `tab-sai-${direcaoAba.current}`} style={(aba === 'louvor' || aba === 'ministro') ? undefined : { position: 'absolute', inset: 0 }}>
            <div style={{ padding: '16px 22px 12px' }}>
              <div style={{ marginBottom: 12 }}>
                <CartaoHoje hoje={hoje} meses={MESES} diasSemana={DIAS_SEMANA} onClick={() => { setDiaIdx(idxHoje(inicio)); setEditando(null) }} />
              </div>
              <GradeDias dias={dias} selecionado={diaIdx} onSelecionar={i => { setDiaIdx(i); setEditando(null) }} hoje={hoje} mesesC={MESES_C} />
            </div>

            <div style={{ padding: '0 22px', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{dia.getDate()} de {MESES[dia.getMonth()]}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{DIAS_SEMANA[dia.getDay()]}</div>
            </div>

            <div style={{ padding: '0 22px 100px' }}>
              {TURNOS.filter(turno => !(diaNum === 1 && turno.id !== 'N')).map(turno => {
                const dado = getDado(turno.id, tipoAba)
                const estaEditando = editando?.turno === turno.id && editando?.tipo === tipoAba
                const opcoes = getCadastrosPorTipo(tipoAba)

                if (estaEditando) {
                  return (
                    <div key={turno.id} style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', borderRadius: 16, padding: 16, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>{turno.icon}</span>
                        <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700 }}>{turno.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--accent-light)', marginLeft: 4 }}>editando</span>
                      </div>
                      {opcoes.length > 0 ? (
                        <select value={formSelecionado} onChange={e => setFormSelecionado(e.target.value)} style={{ ...campo, padding: '12px 14px' }}>
                          <option value="">{tipoAba === 'louvor' ? tx.selecionarEquipe : tx.selecionarMinistro}</option>
                          {opcoes.map(o => <option key={o.id} value={o.nome}>{o.nome}{o.membros ? ` (${o.membros})` : ''}</option>)}
                        </select>
                      ) : (
                        <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, fontSize: 12, color: '#FBBF24', marginBottom: 8, textAlign: 'center' }}>
                          Cadastre {tipoAba === 'louvor' ? 'equipes' : 'preletores'} na aba Cadastro primeiro
                        </div>
                      )}
                      {tipoAba === 'ministro' && formSelecionado && (
                        <input value={formTema} onChange={e => setFormTema(e.target.value)} placeholder={tx.temaMinstracao} style={campo} />
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={salvarEscala} disabled={!formSelecionado} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: formSelecionado ? 'var(--gradient)' : 'var(--input-bg)', color: formSelecionado ? 'white' : 'var(--text-faint)', fontSize: 13, fontWeight: 700, cursor: formSelecionado ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-inter), sans-serif' }}>{tx.salvar}</button>
                        {dado && (
                          <button onClick={() => limpar(turno.id, tipoAba)} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#F87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>Limpar</button>
                        )}
                        <button onClick={() => setEditando(null)} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  )
                }

                if (!dado || !dado.titulo) {
                  return (
                    <div key={turno.id} onClick={() => coordenador && abrirEdicao(turno.id, tipoAba)} style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-strong)', borderRadius: 16, padding: '16px 14px', marginBottom: 8, cursor: coordenador ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{turno.icon}</span>
                        <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700 }}>{turno.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', paddingLeft: 24 }}>{coordenador ? 'Toque para definir' : 'A definir'}</div>
                    </div>
                  )
                }

                const membrosArr = tipoAba === 'louvor' && dado.membros ? dado.membros.split(',').map(m => m.trim()).filter(Boolean) : []
                return (
                  <div key={turno.id} onClick={() => coordenador && abrirEdicao(turno.id, tipoAba)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 14px', marginBottom: 8, cursor: coordenador ? 'pointer' : 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>{turno.icon}</span>
                      <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700 }}>{turno.label}</span>
                      {coordenador && <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto' }}>toque para editar</span>}
                    </div>
                    <div style={{ paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: membrosArr.length > 0 ? 8 : 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: tipoAba === 'louvor' ? 'linear-gradient(135deg,#1E1B4B,#6366F1)' : 'linear-gradient(135deg,#7F1D1D,#EF4444)' }}>{tipoAba === 'louvor' ? '🎵' : '🎤'}</div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700 }}>{dado.titulo}</div>
                          {tipoAba === 'ministro' && dado.tema && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{dado.tema}</div>}
                        </div>
                      </div>
                      {membrosArr.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {membrosArr.map(m => <span key={m} style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '4px 10px', color: '#A5B4FC', fontWeight: 500 }}>{m}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
