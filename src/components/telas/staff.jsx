'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useTexto } from '@/lib/i18n'
import { AREAS, ICONE_AREA } from '@/lib/areas'
import { EQUIPES } from '@/lib/equipes'
import { BotaoVoltar } from '@/components/botao-voltar'

// Mesmo modelo da aba Membros do ic-coordenacao (cartões com foto, etiqueta de
// cargo, busca e filtros), agrupado por área em vez de rede. Sem abrir perfil.
// Foto, nome completo, rede e IC vêm do perfil da coordenação (sincronizados
// por ela na tabela staff); sem foto, mostra as iniciais.
const LIDERANCA = 'Liderança'
const ORDEM_NIVEL = { maximo: 0, alto: 1, basico: 2, staff: 3 }
const ETIQUETA = {
  maximo: { label: 'Coordenação geral', bg: 'linear-gradient(90deg,#EF4444,#F97316)', cor: '#fff', brilho: '0 0 12px rgba(239,68,68,0.4)' },
  alto: { label: 'Supervisor', bg: 'linear-gradient(90deg,#FACC15,#FB923C)', cor: '#2b0a0e', brilho: '0 0 12px rgba(250,204,21,0.4)' },
  basico: { label: 'Coordenador', bg: 'linear-gradient(90deg,#FB923C,#F97316)', cor: '#2b0a0e', brilho: '0 0 10px rgba(251,146,60,0.33)' },
}
const ehLideranca =p => p.nivel in ETIQUETA
const nomeDe = p => p.nomeCompleto || p.nome

const comparar = (a, b) => (ORDEM_NIVEL[a.nivel] ?? 9) - (ORDEM_NIVEL[b.nivel] ?? 9) || nomeDe(a).localeCompare(nomeDe(b), 'pt-BR')
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const iniciais = nome => nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')

const botaoRedondo = ativo => ({
  height: 40, minWidth: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  border: `1px solid ${ativo ? 'rgba(250,204,21,0.5)' : 'var(--border-strong)'}`, background: ativo ? 'rgba(250,204,21,0.08)' : 'transparent',
  color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 12px', fontFamily: 'var(--font-inter), sans-serif'
})
const selectStyle = { flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'rgba(0,0,0,0.3)', color: 'var(--text)', fontSize: 13, outline: 'none' }
const grade = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }

function Avatar({ pessoa, tamanho = 64 }) {
  return (
    <div style={{ width: tamanho, height: tamanho, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: tamanho * 0.34, color: 'var(--text-secondary)' }}>
      {pessoa.avatar
        ? <Image src={pessoa.avatar} alt={nomeDe(pessoa)} width={tamanho} height={tamanho} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : iniciais(nomeDe(pessoa))}
    </div>
  )
}

function Cartao({ pessoa }) {
  const etiqueta = ETIQUETA[pessoa.nivel]

  // Formato de crachá: vertical na proporção padrão (54×86 mm), com o furo da
  // fita em cima. É a arte usada pros crachás impressos da Escola.
  return (
    <div style={{
      aspectRatio: '54 / 86', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
      borderRadius: 10, border: '1px solid var(--border-strong)', padding: '14px 14px 18px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02))', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
    }}>
      <div aria-hidden style={{ width: '32%', height: 9, flexShrink: 0, borderRadius: 999, background: 'var(--bg-tela)', border: '1px solid var(--border-strong)', boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.5)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Avatar pessoa={pessoa} tamanho={84} />
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{nomeDe(pessoa)}</p>
      {/* A área já está no título da seção, então o cartão não repete. Só quem
          não tem área nenhuma mostra o cargo. */}
      {pessoa.areas.length === 0 && etiqueta && (
        <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.025em', background: etiqueta.bg, color: etiqueta.cor, boxShadow: etiqueta.brilho }}>
          {etiqueta.label}
        </span>
      )}
      </div>
    </div>
  )
}

export function Staff({ staff }) {
  const tx = useTexto()
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [area, setArea] = useState('')
  const [nivel, setNivel] = useState('')
  const [equipe, setEquipe] = useState('')

  const filtrosAtivos = [area, nivel, equipe].filter(Boolean).length
  const filtrando = !!busca.trim() || filtrosAtivos > 0

  const encontrados = useMemo(() => {
    const q = semAcento(busca.trim())
    return staff
      .filter(p => !q || semAcento(nomeDe(p)).includes(q) || semAcento(p.nome).includes(q))
      .filter(p => !area || p.areas.includes(area))
      .filter(p => !nivel || (nivel === 'lideranca' ? ehLideranca(p) : !ehLideranca(p)))
      .filter(p => !equipe || p.equipe === equipe)
      .sort(comparar)
  }, [staff, busca, area, nivel, equipe])

  const secoes = useMemo(() => [
    // Quem tem área aparece só na área dela; Liderança fica com quem não tem.
    { area: LIDERANCA, pessoas: staff.filter(p => ehLideranca(p) && p.areas.length === 0).sort(comparar) },
    ...AREAS.map(a => ({ area: a, pessoas: staff.filter(p => p.areas.includes(a)).sort(comparar) })),
  ].filter(s => s.pessoas.length > 0), [staff])

  function limpar() { setArea(''); setNivel(''); setEquipe('') }

  return (
    <div className="tela-enter-staff" style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '14px 22px 100px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BotaoVoltar />
          <div>
            <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 24, fontWeight: 600 }}>{tx.staff}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{staff.length} {staff.length === 1 ? 'pessoa' : 'pessoas'} na Escola Impulse</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setBuscaAberta(v => !v)} aria-label="Buscar" style={botaoRedondo(buscaAberta || !!busca)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </button>
            <button onClick={() => setFiltroAberto(v => !v)} style={botaoRedondo(filtroAberto || filtrosAtivos > 0)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              Filtro
              {filtrosAtivos > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: '#FACC15', color: '#2b0a0e', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{filtrosAtivos}</span>}
            </button>
          </div>

          {buscaAberta && (
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome..."
                style={{ width: '100%', padding: '10px 40px', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-inter), sans-serif' }} />
              {busca && (
                <button onClick={() => setBusca('')} aria-label="Limpar busca" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}>✕</button>
              )}
            </div>
          )}

          {filtroAberto && (
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={area} onChange={e => setArea(e.target.value)} style={selectStyle}>
                  <option value="">Todas as áreas</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={nivel} onChange={e => setNivel(e.target.value)} style={selectStyle}>
                  <option value="">Todos os cargos</option>
                  <option value="lideranca">Liderança</option>
                  <option value="staff">Staff</option>
                </select>
                <select value={equipe} onChange={e => setEquipe(e.target.value)} style={selectStyle}>
                  <option value="">Todas as equipes</option>
                  {EQUIPES.map(e => <option key={e.id} value={e.id}>{e.emoji} {e.nome}</option>)}
                  <option value="sem_escala">Sem escala</option>
                </select>
              </div>
              {filtrosAtivos > 0 && (
                <button onClick={limpar} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--accent-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Limpar</button>
              )}
            </div>
          )}
        </div>

        {staff.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 40 }}>Ninguém com acesso liberado ainda</div>
        )}

        {filtrando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{encontrados.length} {encontrados.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}</p>
            {encontrados.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 30 }}>Nenhum membro encontrado.</p>
              : <div style={grade}>{encontrados.map(p => <Cartao key={p.nome} pessoa={p} />)}</div>}
          </div>
        ) : secoes.map(s => (
          <section key={s.area} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, ...(ICONE_AREA[s.area] ? {} : { background: s.area === LIDERANCA ? 'linear-gradient(135deg,#EF4444,#F97316)' : 'var(--accent-bg)', border: '1px solid var(--border-strong)' }) }}>
                {ICONE_AREA[s.area]
                  ? <img src={ICONE_AREA[s.area]} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                  : s.area[0]}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600 }}>{s.area}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.pessoas.length} {s.pessoas.length === 1 ? 'pessoa' : 'pessoas'}</p>
              </div>
            </div>
            <div style={grade}>{s.pessoas.map(p => <Cartao key={p.nome} pessoa={p} />)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
