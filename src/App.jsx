import { useState, useEffect, useRef } from 'react'
import Home from './components/Home'
import Apoio from './components/Apoio'
import Staff from './components/Staff'
import Supervisor from './components/Supervisor'
import Mural from './components/Mural'
import Midia from './components/Midia'
import Programacao from './components/Programacao'
import Config from './components/Config'
import { initSync } from './lib/offlineSync'
import { IdiomaContext, useTexto } from './lib/i18n'

const SENHAS = {
  supervisor: { '1932': 'Alvarães', '6090': 'Danilo', '0404': 'Caetano', '2121': 'Alyson', '9089': 'Paula', '1778': 'Eliel', '3321': 'Edson', '5050': 'Pr. Júnior', '4780': 'Pra. Stephanie' },
}

const ANIM_TELA = {
  apoio: 'tela-enter-apoio',
  staff: 'tela-enter-staff',
  midia: 'tela-enter-midia',
  mural: 'tela-enter-mural',
}

const ABAS_SUPERVISOR = {
  'Alvarães': ['avisos', 'chamada', 'faltas'],
  'Danilo': ['avisos'],
  'Caetano': ['avisos'],
  'Alyson': ['avisos'],
  'Paula': ['avisos'],
  'Eliel': ['avisos'],
  'Edson': ['avisos'],
  'Pr. Júnior': ['avisos', 'chamada', 'faltas'],
  'Pra. Stephanie': ['avisos', 'chamada', 'faltas'],
}

function NavIcon({ id, active }) {
  const color = active ? 'var(--text)' : 'var(--text-faint)'
  const icons = {
    home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    programacao: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    supervisor: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    config: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  }
  return icons[id] || null
}

export default function App() {
  const [splash, setSplash] = useState(true)
  const [splashExit, setSplashExit] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSplashExit(true), 2200)
    const t2 = setTimeout(() => setSplash(false), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const [idioma, setIdiomaState] = useState(() => localStorage.getItem('impulse_idioma') || 'pt-BR')
  const [tema, setTemaState] = useState(() => localStorage.getItem('tema') || 'dark')

  function setIdioma(i) {
    setIdiomaState(i)
    localStorage.setItem('impulse_idioma', i)
  }

  function setTema(t) {
    setTemaState(t)
    localStorage.setItem('tema', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    const ac = localStorage.getItem('impulse_accent')
    if (ac) document.documentElement.setAttribute('data-accent', ac)
    const fs = localStorage.getItem('impulse_fontsize')
    if (fs) document.body.style.zoom = parseInt(fs) / 100
    initSync()
  }, [])

  const [tela, setTela] = useState('home')
  const [telaKey, setTelaKey] = useState(0)
  const [overlay, setOverlay] = useState(null)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [supervisorNome, setSupervisorNome] = useState(null)
  const [navAtiva, setNavAtiva] = useState('home')
  const homeScrollRef = useRef(0)

  useEffect(() => {
    function handleBack(e) {
      if (overlay) { e.preventDefault(); setOverlay(null); return }
      if (tela !== 'home') { e.preventDefault(); voltar() }
    }
    window.addEventListener('popstate', handleBack)
    return () => window.removeEventListener('popstate', handleBack)
  }, [tela, overlay])

  useEffect(() => {
    window.scrollTo(0, tela === 'home' ? homeScrollRef.current : 0)
  }, [telaKey])

  function navegarPara(id) {
    if (tela === 'home') homeScrollRef.current = window.scrollY
    if (id === 'supervisor') { abrirOverlay('supervisor'); return }
    if (id !== tela) window.history.pushState(null, '')
    setTela(id)
    setNavAtiva(id)
    setTelaKey(k => k + 1)
  }

  function abrirOverlay(tipo) {
    setOverlay(tipo)
    setSenhaInput('')
    setSenhaErro('')
  }

  function verificarSenha() {
    if (overlay === 'supervisor') {
      const nome = SENHAS.supervisor[senhaInput]
      if (nome) { setSupervisorNome(nome); setOverlay(null); setTela('supervisor'); setNavAtiva('supervisor'); setTelaKey(k => k + 1) }
      else setSenhaErro('Senha incorreta.')
    }
  }

  function voltar() {
    setTela('home')
    setNavAtiva('home')
    setTelaKey(k => k + 1)
  }

  const t = { 'pt-BR': { home: 'Início', prog: 'Programação', sup: 'Supervisor', cfg: 'Config', senha: 'Digite sua senha para acessar', area: 'Área do Supervisor', entrar: 'Entrar', cancelar: 'Cancelar', senhaErro: 'Senha incorreta.' }, en: { home: 'Home', prog: 'Schedule', sup: 'Supervisor', cfg: 'Settings', senha: 'Enter your password', area: 'Supervisor Area', entrar: 'Enter', cancelar: 'Cancel', senhaErro: 'Wrong password.' } }[idioma]

  const NAV = [
    { id: 'home', label: t.home },
    { id: 'programacao', label: t.prog },
    { id: 'supervisor', label: t.sup },
    { id: 'config', label: t.cfg },
  ]

  return (
    <IdiomaContext.Provider value={idioma}>
    <div style={{ background: 'var(--bg-app)', minHeight: '100vh', paddingBottom: 80 }}>

      {splash && (
        <div className={`splash ${splashExit ? 'splash-exit' : ''}`}>
          <div className="splash-glow" style={{ width: 250, height: 250, background: '#5B21B6', top: '20%', right: '-20%' }} />
          <div className="splash-glow" style={{ width: 180, height: 180, background: '#0EA5E9', bottom: '20%', left: '-15%', animationDelay: '0.5s' }} />
          <div className="splash-glow" style={{ width: 120, height: 120, background: '#F59E0B', top: '50%', left: '60%', animationDelay: '1s' }} />
          <div className="splash-logo" style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, textAlign: 'center' }}>
            Escola<br />
            <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span><br />
            2026
          </div>
          <div className="splash-sub" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 16, letterSpacing: 2, textTransform: 'uppercase' }}>
            15 a 25 de julho
          </div>
          <div className="splash-bar splash-loader">
            <div className="splash-loader-bar" />
          </div>
        </div>
      )}

      <div key={telaKey} className={ANIM_TELA[tela] || 'tela-enter'}>
        {tela === 'home' && <Home onNavegar={navegarPara} />}
        {tela === 'apoio' && <Apoio onVoltar={voltar} />}
        {tela === 'staff' && <Staff onVoltar={voltar} />}
        {tela === 'supervisor' && <Supervisor onVoltar={voltar} nome={supervisorNome} abas={ABAS_SUPERVISOR[supervisorNome] || []} />}
        {tela === 'mural' && <Mural onVoltar={voltar} />}
        {tela === 'midia' && <Midia onVoltar={voltar} />}
        {tela === 'programacao' && <Programacao onVoltar={voltar} />}
        {tela === 'config' && <Config onVoltar={voltar} tema={tema} setTema={setTema} idioma={idioma} setIdioma={setIdioma} />}
      </div>

      {/* NAV BAR */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390, display: 'flex',
        background: 'var(--nav-bg)', backdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--border)',
        padding: '10px 6px 28px', zIndex: 50
      }}>
        {NAV.map(n => {
          const active = navAtiva === n.id
          return (
            <div key={n.id} onClick={() => navegarPara(n.id)}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, fontSize: 10, cursor: 'pointer', fontWeight: 600,
                color: active ? 'var(--text)' : 'var(--text-faint)',
                padding: '4px 0'
              }}
            >
              <div className="nav-icon" style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NavIcon id={n.id} active={active} />
              </div>
              <span style={{ fontSize: 9, letterSpacing: 0.3 }}>{n.label}</span>
              <div className="nav-indicator" style={{
                width: active ? 20 : 0, height: 3, opacity: active ? 1 : 0,
                background: 'var(--gradient-text)',
                borderRadius: 2, marginTop: 1
              }} />
            </div>
          )
        })}
      </div>

      {/* OVERLAY SENHA */}
      {overlay && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overlay-enter" style={{
            background: 'var(--overlay-bg)', backdropFilter: 'blur(20px)',
            border: '1px solid var(--border)', borderRadius: 28,
            padding: '32px 24px', width: '90%', maxWidth: 340, textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {overlay === 'supervisor' ? t.area : t.area}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{t.senha}</p>
            <input
              type="password"
              value={senhaInput}
              onChange={e => { setSenhaInput(e.target.value); setSenhaErro('') }}
              onKeyDown={e => e.key === 'Enter' && verificarSenha()}
              placeholder="••••"
              maxLength={10}
              autoFocus
              style={{ width: '100%', padding: '14px 16px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: '.3em', outline: 'none', color: 'var(--text)', marginBottom: 12, fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s' }}
            />
            {senhaErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{senhaErro}</p>}
            <button onClick={verificarSenha} style={{ width: '100%', padding: 14, background: 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', marginBottom: 10, fontFamily: 'Syne, sans-serif', transition: 'transform 0.1s', boxShadow: '0 4px 20px var(--accent-glow)' }}>{t.entrar}</button>
            <button onClick={() => setOverlay(null)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer' }}>{t.cancelar}</button>
          </div>
        </div>
      )}
    </div>
    </IdiomaContext.Provider>
  )
}
