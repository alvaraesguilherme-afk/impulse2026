'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTexto } from '@/lib/i18n'

function NavIcon({ id, active, size = 22 }) {
  return <img src={`/icons/${id}.png`} alt="" style={{ width: size, height: size, objectFit: 'contain', opacity: active ? 1 : 0.6, transition: 'opacity 0.2s' }} />
}

const HREF = { home: '/', programacao: '/programacao', supervisor: '/supervisor', config: '/config', mural: '/mural', apoio: '/apoio', midia: '/midia', staff: '/staff', advertencias: '/advertencias' }

function useAtivo() {
  const path = usePathname()
  return id => (id === 'home' ? path === '/' : path.startsWith(HREF[id]))
}

// Logo + itens da sidebar — o mesmo conteúdo no PC (fixa na lateral) e no
// celular (gaveta que abre pelos 3 traços). onNavegar fecha a gaveta.
function ConteudoSidebar({ podeSupervisor, onNavegar }) {
  const tx = useTexto()
  const ativo = useAtivo()
  const itens = [
    { id: 'home', label: tx.inicio },
    { id: 'mural', label: tx.feedImpulse },
    { id: 'apoio', label: tx.apoio },
    { id: 'midia', label: tx.midia },
    { id: 'staff', label: tx.staff },
    { id: 'programacao', label: tx.programacao },
    { id: 'advertencias', label: tx.advertencias },
    podeSupervisor ? null : undefined,
    podeSupervisor ? { id: 'supervisor', label: tx.supervisor } : undefined,
    { id: 'config', label: tx.config },
  ].filter(item => item !== undefined)

  return (
    <>
      <div className="item-cascata" style={{ padding: '0 10px', marginBottom: 36, '--i': 0 }}>
        <Logo />
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, letterSpacing: 1.5, textTransform: 'uppercase' }}>{tx.datasEvento}</div>
      </div>

      {itens.map((item, idx) => {
        if (!item) return <div key={'sep-' + idx} className="item-cascata" style={{ '--i': idx + 1, height: 1, background: 'var(--border)', margin: '6px 10px 10px' }} />
        const active = ativo(item.id)
        return (
          <Link key={item.id} href={HREF[item.id]} onClick={onNavegar} className="sidebar-item item-cascata" data-ativo={active ? '1' : undefined} style={{
            '--i': idx + 1,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 12, marginBottom: 2,
            background: active ? 'var(--accent-bg)' : undefined,
            color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
            fontSize: 14, fontWeight: active ? 600 : 400, textDecoration: 'none', userSelect: 'none',
          }}>
            <NavIcon id={item.id} active={active} size={18} />
            <span>{item.label}</span>
            {item.id === 'supervisor' && (
              <svg style={{ marginLeft: 'auto', opacity: 0.4 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            )}
          </Link>
        )
      })}
    </>
  )
}

function Logo({ tamanho = 20 }) {
  return (
    <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: tamanho, fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.5 }}>
      Escola{' '}
      <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span>
    </div>
  )
}

const estiloSidebar = {
  position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
  background: 'var(--bg-app)', borderRight: '1px solid var(--border)',
  flexDirection: 'column', padding: '28px 12px 24px', zIndex: 50, overflowY: 'auto'
}

export function Sidebar({ podeSupervisor }) {
  return (
    <nav className="so-desktop" style={estiloSidebar}>
      <ConteudoSidebar podeSupervisor={podeSupervisor} />
    </nav>
  )
}

// No celular: barra fina no topo com os 3 traços; tocar abre a mesma sidebar
// do PC deslizando da esquerda. Fecha ao tocar fora ou ao escolher uma tela.
export function NavMobile({ podeSupervisor }) {
  const [aberta, setAberta] = useState(false)
  const fechar = () => setAberta(false)

  return (
    <div className="nav-mobile so-mobile">
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--topo-mobile)', zIndex: 40,
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
        background: 'var(--nav-bg)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid var(--border)'
      }}>
        <button onClick={() => setAberta(true)} aria-label="Abrir menu" aria-expanded={aberta} style={{
          width: 42, height: 42, borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--input-bg)', color: 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: -4, flexShrink: 0
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
        </button>
        <Logo tamanho={17} />
      </header>

      <div onClick={fechar} aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.55)',
        opacity: aberta ? 1 : 0, pointerEvents: aberta ? 'auto' : 'none', transition: 'opacity 0.25s ease'
      }} />
      <nav aria-hidden={!aberta} inert={!aberta} className={aberta ? 'gaveta-aberta' : undefined} style={{
        ...estiloSidebar, display: 'flex', width: 260, maxWidth: '82vw',
        transform: aberta ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(.16,1,.3,1)',
        boxShadow: aberta ? '8px 0 30px rgba(0,0,0,0.4)' : 'none'
      }}>
        <ConteudoSidebar podeSupervisor={podeSupervisor} onNavegar={fechar} />
      </nav>
    </div>
  )
}
