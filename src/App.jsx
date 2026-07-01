import { useState, useEffect, useRef } from 'react'
import Home from './components/Home'
import Apoio from './components/Apoio'
import Staff from './components/Staff'
import Supervisor from './components/Supervisor'
import Mural from './components/Mural'
import Midia from './components/Midia'
import Programacao from './components/Programacao'
import Config from './components/Config'
import Login from './components/Login'
import { initSync } from './lib/offlineSync'
import { IdiomaContext, useTexto } from './lib/i18n'
import { supabase } from './lib/supabase'
import { getDeviceId } from './lib/device'

const SENHAS = {
  supervisor: { '1932': 'Alvarães', '6090': 'Danilo', '0404': 'Caetano', '2121': 'Alyson', '9089': 'Paula', '1778': 'Eliel', '3321': 'Edson', '5050': 'Pr. Júnior', '4780': 'Pra. Stephanie' },
}

const ANIM_TELA = {
  apoio: 'tela-enter-apoio',
  staff: 'tela-enter-staff',
  midia: 'tela-enter-midia',
  mural: 'tela-enter-mural',
}

const INTROS = {
  apoio: [
    { icon: '🦺', title: 'Equipes de Apoio', desc: 'Veja qual equipe está de serviço e em qual turno do dia.' },
    { icon: '📋', title: 'Chamada', desc: 'Como coordenador, registre presença e ausência de cada membro do seu time.' },
    { icon: '✅', title: 'Tarefas do Turno', desc: 'Confira as responsabilidades da sua equipe por turno.' },
  ],
  staff: [
    { icon: '👥', title: 'Diretório do Staff', desc: 'Encontre qualquer membro por área de atuação no evento.' },
  ],
  midia: [
    { icon: '📹', title: 'Equipe de Mídia', desc: 'Analise sua escala e veja em qual dia servirá conosco.' },
    { icon: '🔒', title: 'Coordenador', desc: 'Sendo coordenador, edite as suas próprias escalas.' },
  ],
  mural: [
    { icon: '📸', title: 'Feed Impulse', desc: 'Poste fotos do evento e veja os melhores momentos do staff.' },
    { icon: '❤️', title: 'Curta as Fotos', desc: 'Toque no coração para curtir as fotos dos seus colegas.' },
    { icon: '⭐', title: 'Foto Destaque', desc: 'A foto mais curtida do dia aparece em destaque na tela inicial no dia seguinte.' },
    { icon: '🙏', title: 'Só um recado...', desc: 'Saiba apenas que o Feed aguenta até 2.000 fotos.' },
    { icon: '🗑️', title: 'Moderação', desc: 'Coordenadores podem excluir fotos que não convém. Basta tocar na foto e escolher excluir.' },
  ],
  programacao: [
    { icon: '🎵', title: 'Louvor', desc: 'Confira as equipes de louvor escaladas por turno e dia.' },
    { icon: '🎤', title: 'Preletores', desc: 'Veja quem ministra em cada momento do evento.' },
  ],
  supervisor: [
    { icon: '📢', title: 'Avisos', desc: 'Publique e leia comunicados importantes pra toda a equipe.' },
    { icon: '📋', title: 'Chamada Geral', desc: 'Marque presença e acompanhe faltas de todas as equipes.' },
    { icon: '❌', title: 'Relatório de Faltas', desc: 'Veja o resumo de ausências por equipe e exporte em PDF.' },
  ],
  config: [
    { icon: '🎨', title: 'Configurações', desc: 'Personalize tema, cor, fonte e idioma do app.' },
  ],
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

function NavIcon({ id, active, size = 22 }) {
  const color = active ? 'var(--accent-light)' : 'var(--text-faint)'
  const s = { width: size, height: size }
  const icons = {
    home: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    programacao: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    supervisor: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    config: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    mural: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    apoio: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    midia: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
    staff: <svg {...s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  }
  return icons[id] || null
}

function getSidebarItems(podeSupervisor) {
  return [
    { id: 'home', label: 'Início' },
    { id: 'mural', label: 'Feed Impulse' },
    { id: 'apoio', label: 'Apoio' },
    { id: 'midia', label: 'Mídia' },
    { id: 'staff', label: 'Staff' },
    { id: 'programacao', label: 'Programação' },
    podeSupervisor ? null : undefined,
    podeSupervisor ? { id: 'supervisor', label: 'Supervisor' } : undefined,
    { id: 'config', label: 'Configurações' },
  ].filter(item => item !== undefined)
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
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  const [sessao, setSessao] = useState(() => {
    try { return JSON.parse(localStorage.getItem('impulse_sessao')) || null } catch { return null }
  })
  const [mensagemLogin, setMensagemLogin] = useState('')

  function fazerLogin(s) {
    localStorage.setItem('impulse_sessao', JSON.stringify(s))
    setMensagemLogin('')
    setSessao(s)
  }

  function fazerLogout(msg) {
    if (sessao?.nome) {
      supabase.from('sessoes_ativas').delete()
        .eq('nome', sessao.nome)
        .eq('device_id', getDeviceId())
        .then()
    }
    localStorage.removeItem('impulse_sessao')
    Object.keys(INTROS).forEach(id => localStorage.removeItem('impulse_intro_' + id))
    setTela('home')
    setNavAtiva('home')
    setMensagemLogin(msg || '')
    setSessao(null)
  }

  useEffect(() => {
    if (!sessao) return
    const deviceId = getDeviceId()

    async function validarSessao() {
      const { data } = await supabase
        .from('sessoes_ativas')
        .select('device_id')
        .eq('nome', sessao.nome)
        .eq('device_id', deviceId)
        .maybeSingle()
      if (!data) {
        fazerLogout('Sua sessão foi encerrada em outro dispositivo.')
      } else {
        // Renova updated_at para não expirar sessão ativa
        supabase.from('sessoes_ativas').upsert(
          { nome: sessao.nome, device_id: deviceId, updated_at: new Date().toISOString() },
          { onConflict: 'nome,device_id' }
        ).then()
      }
    }

    function aoVoltarFoco() {
      if (document.visibilityState === 'visible') validarSessao()
    }

    document.addEventListener('visibilitychange', aoVoltarFoco)
    return () => document.removeEventListener('visibilitychange', aoVoltarFoco)
  }, [sessao])

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
  const [introAtivo, setIntroAtivo] = useState(null)
  const [introSlide, setIntroSlide] = useState(0)
  const [introSaindo, setIntroSaindo] = useState(false)

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

  function mostrarIntroSe(id) {
    if (INTROS[id] && !localStorage.getItem('impulse_intro_' + id)) {
      setIntroAtivo(id); setIntroSlide(0); setIntroSaindo(false)
    }
  }

  function avancarSlide() {
    const slides = INTROS[introAtivo] || []
    if (introSlide < slides.length - 1) {
      setIntroSlide(s => s + 1)
    } else {
      setIntroSaindo(true)
      setTimeout(() => {
        localStorage.setItem('impulse_intro_' + introAtivo, '1')
        setIntroAtivo(null); setIntroSaindo(false)
      }, 500)
    }
  }

  function navegarPara(id) {
    if (tela === 'home') homeScrollRef.current = window.scrollY
    if (id === 'supervisor') {
      const nivel = sessao?.nivel
      if (['maximo', 'alto', 'basico'].includes(nivel)) {
        setSupervisorNome(sessao.nome)
        if (id !== tela) window.history.pushState(null, '')
        setTela('supervisor'); setNavAtiva('supervisor'); setTelaKey(k => k + 1); mostrarIntroSe('supervisor')
      } else {
        abrirOverlay('supervisor')
      }
      return
    }
    if (id !== tela) window.history.pushState(null, '')
    setTela(id); setNavAtiva(id); setTelaKey(k => k + 1)
    mostrarIntroSe(id)
  }

  function abrirOverlay(tipo) {
    setOverlay(tipo)
    setSenhaInput('')
    setSenhaErro('')
  }

  function verificarSenha() {
    if (overlay === 'supervisor') {
      const nome = SENHAS.supervisor[senhaInput]
      if (nome) { setSupervisorNome(nome); setOverlay(null); setTela('supervisor'); setNavAtiva('supervisor'); setTelaKey(k => k + 1); mostrarIntroSe('supervisor') }
      else setSenhaErro('Senha incorreta.')
    }
  }

  function voltar() {
    setTela('home')
    setNavAtiva('home')
    setTelaKey(k => k + 1)
  }

  const t = { 'pt-BR': { home: 'Início', prog: 'Programação', sup: 'Supervisor', cfg: 'Config', senha: 'Digite sua senha para acessar', area: 'Área do Supervisor', entrar: 'Entrar', cancelar: 'Cancelar', senhaErro: 'Senha incorreta.' }, en: { home: 'Home', prog: 'Schedule', sup: 'Supervisor', cfg: 'Settings', senha: 'Enter your password', area: 'Supervisor Area', entrar: 'Enter', cancelar: 'Cancel', senhaErro: 'Wrong password.' } }[idioma]

  const nivel = sessao?.nivel
  const NIVEIS_SUPERVISOR = ['maximo', 'alto', 'basico']
  const podeSupervisor = NIVEIS_SUPERVISOR.includes(nivel)

  const NAV = [
    { id: 'home', label: t.home },
    { id: 'programacao', label: t.prog },
    podeSupervisor && { id: 'supervisor', label: t.sup },
    { id: 'config', label: t.cfg },
  ].filter(Boolean)

  return (
    <IdiomaContext.Provider value={idioma}>
      {/* Login sempre montado — aparece via z-index, sem remount */}
      <div style={(!sessao && !splash)
        ? { position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto', background: 'var(--bg-app)' }
        : { position: 'fixed', inset: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }
      }>
        <Login onLogin={fazerLogin} mensagem={mensagemLogin} />
      </div>

    <div style={{ background: 'var(--bg-app)', minHeight: '100vh', paddingBottom: isDesktop ? 0 : 80, display: (sessao || splash) ? undefined : 'none' }}>

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

      {/* SIDEBAR DESKTOP */}
      {isDesktop && (
        <div style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
          background: 'var(--bg-app)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          padding: '28px 12px 24px',
          zIndex: 50, overflowY: 'auto'
        }}>
          <div style={{ padding: '0 10px', marginBottom: 36 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.5 }}>
              Escola{' '}
              <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span>{' '}2026
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, letterSpacing: 1.5, textTransform: 'uppercase' }}>15 a 25 de julho</div>
          </div>

          {getSidebarItems(podeSupervisor).map((item, idx) => {
            if (!item) return (
              <div key={'sep-' + idx} style={{ height: 1, background: 'var(--border)', margin: '6px 10px 10px' }} />
            )
            const active = navAtiva === item.id
            return (
              <div
                key={item.id}
                onClick={() => navegarPara(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  marginBottom: 2,
                  background: active ? 'var(--accent-bg)' : 'transparent',
                  color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  transition: 'background 0.15s ease, color 0.15s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-card)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <NavIcon id={item.id} active={active} size={18} />
                <span>{item.label}</span>
                {item.id === 'supervisor' && (
                  <svg style={{ marginLeft: 'auto', opacity: 0.4 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ marginLeft: isDesktop ? 240 : 0, minHeight: '100vh' }}>
        <div key={telaKey} className={ANIM_TELA[tela] || 'tela-enter'}>
          {tela === 'home' && <Home onNavegar={navegarPara} sessao={sessao} />}
          {tela === 'apoio' && <Apoio onVoltar={voltar} sessao={sessao} />}
          {tela === 'staff' && <Staff onVoltar={voltar} />}
          {tela === 'supervisor' && <Supervisor onVoltar={voltar} nome={supervisorNome} abas={ABAS_SUPERVISOR[supervisorNome] || []} />}
          {tela === 'mural' && <Mural onVoltar={voltar} autor={sessao?.nome} />}
          {tela === 'midia' && <Midia onVoltar={voltar} sessao={sessao} />}
          {tela === 'programacao' && <Programacao onVoltar={voltar} sessao={sessao} />}
          {tela === 'config' && <Config onVoltar={voltar} tema={tema} setTema={setTema} idioma={idioma} setIdioma={setIdioma} sessao={sessao} onLogout={fazerLogout} />}
        </div>
      </div>

      {/* INTRO OVERLAY */}
      {introAtivo && (() => {
        const slides = INTROS[introAtivo] || []
        const slide = slides[introSlide]
        if (!slide) return null
        return (
          <div onClick={avancarSlide} className={`intro-overlay${introSaindo ? ' intro-saindo' : ''}`} style={{
            position: 'fixed', inset: 0, zIndex: 150,
            background: 'rgba(5,5,20,0.94)', backdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 36px', textAlign: 'center', cursor: 'pointer'
          }}>
            <div key={introSlide} className="intro-slide">
              <div style={{ fontSize: 72, marginBottom: 28 }}>{slide.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 14, lineHeight: 1.2 }}>{slide.title}</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: 270, textAlign: 'center', margin: '0 auto' }}>{slide.desc}</div>
            </div>
            <div style={{ position: 'absolute', bottom: 130, display: 'flex', gap: 8 }}>
              {slides.map((_, i) => (
                <div key={i} style={{
                  width: i === introSlide ? 22 : 6, height: 6, borderRadius: 3,
                  background: i === introSlide ? 'var(--accent-light)' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.35s ease'
                }} />
              ))}
            </div>
            <div style={{ position: 'absolute', bottom: 76, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              {introSlide < slides.length - 1 ? 'Toque para continuar' : 'Toque para começar'}
            </div>
          </div>
        )
      })()}

      {/* NAV BAR MOBILE */}
      {!isDesktop && (
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
      )}

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
