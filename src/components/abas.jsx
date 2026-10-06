'use client'

// Barra de abas usada em todas as telas (mesmo visual do app antigo)
export function BarraAbas({ abas, ativa, onTrocar, fontSize = 10.5 }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, margin: '16px 22px 0', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
      {abas.map(a => (
        <button key={a.id} onClick={() => onTrocar(a.id)} style={{ flex: 1, minWidth: 0, padding: '8px 3px', borderRadius: 12, border: 'none', background: ativa === a.id ? 'var(--accent-glow)' : 'transparent', color: ativa === a.id ? 'var(--accent-light)' : 'var(--text-muted)', fontSize, fontWeight: 700, lineHeight: 1.2, cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--font-inter), sans-serif' }}>
          {a.label}
        </button>
      ))}
    </div>
  )
}

// Envolve o conteúdo de uma aba com a animação de entrada/saída lateral
export function PainelAba({ id, aba, abaSaindo, direcao, style, children }) {
  if (aba !== id && abaSaindo !== id) return null
  const ativa = aba === id
  return (
    <div className={ativa ? `tab-entra-${direcao}` : `tab-sai-${direcao}`} style={{ ...style, ...(ativa ? {} : { position: 'absolute', inset: 0 }) }}>
      {children}
    </div>
  )
}

// Calendário em grade dos 11 dias (Apoio, Mídia, Programação)
export function GradeDias({ dias, selecionado, onSelecionar, hoje, mesesC }) {
  const DIAS_C = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
      {dias.map((dia, i) => {
        const isSel = i === selecionado
        const isHoje = hoje && dia.getTime() === hoje.getTime()
        return (
          <div key={i} onClick={() => onSelecionar(i)} style={{ background: isSel ? 'var(--accent-bg)' : 'var(--bg-card)', border: isSel ? '1px solid var(--accent-border)' : isHoje ? '1px solid rgba(96,165,250,0.4)' : '1px solid var(--border)', borderRadius: 14, padding: '10px 4px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>{DIAS_C[dia.getDay()]}</div>
            <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 800, color: isSel ? 'var(--accent-light)' : isHoje ? '#60A5FA' : 'var(--text)' }}>{dia.getDate()}</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 1 }}>{mesesC[dia.getMonth()]}</div>
          </div>
        )
      })}
    </div>
  )
}

// Cartão "Hoje" que volta o calendário pro dia atual
export function CartaoHoje({ hoje, meses, diasSemana, onClick, rotulo = 'Hoje', acao = 'Ver escala' }) {
  if (!hoje) return null
  return (
    <div onClick={onClick} style={{
      background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
      borderRadius: 16, padding: '14px 18px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(96,165,250,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{rotulo}</div>
        <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 20, fontWeight: 800, color: '#60A5FA' }}>
          {hoje.getDate()} de {meses[hoje.getMonth()]}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{diasSemana[hoje.getDay()]}</div>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(96,165,250,0.6)', fontWeight: 600 }}>{acao}</div>
    </div>
  )
}

// Lista de mensagens de equipe (Apoio e Mídia)
export function ListaMensagens({ mensagens, podeExcluir, onExcluir, rotuloEquipe }) {
  if (mensagens.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: 20 }}>Nenhuma mensagem ainda.</p>
  }
  return mensagens.map((m, i) => (
    <div key={m.id} className="tela-enter" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px', marginBottom: 8, animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.texto}</div>
        {podeExcluir && (
          <button onClick={() => onExcluir(m.id)} style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#F87171', fontSize: 11, cursor: 'pointer' }}>🗑</button>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }} suppressHydrationWarning>
        {m.autor}{rotuloEquipe ? ` · ${rotuloEquipe(m.equipe_id)}` : ''} · {new Date(m.created_at).toLocaleString('pt-BR')}
      </div>
    </div>
  ))
}

// Caixa de escrever recado (Apoio e Mídia)
export function CaixaMensagem({ titulo, onEnviar, enviando, children }) {
  return (
    <form onSubmit={e => { e.preventDefault(); const t = e.currentTarget.elements.texto; if (t.value.trim()) { onEnviar(t.value.trim()); t.value = '' } }}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{titulo}</div>
      {children}
      <textarea name="texto" placeholder="Escreva um recado..." rows={3}
        style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 12, fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8, fontFamily: 'var(--font-inter), sans-serif', resize: 'none' }} />
      <button type="submit" disabled={enviando} style={{
        width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'var(--gradient)', color: 'white',
        fontSize: 13, fontWeight: 700, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1, fontFamily: 'var(--font-inter), sans-serif'
      }}>{enviando ? 'Enviando...' : 'Enviar'}</button>
    </form>
  )
}
