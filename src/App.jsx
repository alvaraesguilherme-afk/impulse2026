import { useState } from 'react'
import Home from './components/Home'
import Apoio from './components/Apoio'
import Staff from './components/Staff'
import Supervisor from './components/Supervisor'
import Mural from './components/Mural'
import Midia from './components/Midia'
import Programacao from './components/Programacao'

const SENHAS = {
  supervisor: { '1932': 'Alvarães', '6090': 'Danilo', '0404': 'Caetano', '2121': 'Alyson', '9089': 'Paula', '1778': 'Eliel', '3321': 'Edson' },
}

const ABAS_SUPERVISOR = {
  'Alvarães': ['avisos', 'chamada', 'faltas'],
  'Danilo': ['avisos'],
  'Caetano': ['avisos'],
  'Alyson': ['avisos'],
  'Paula': ['avisos'],
  'Eliel': ['avisos'],
  'Edson': ['avisos'],
}

export default function App() {
  const [tela, setTela] = useState('home')
  const [overlay, setOverlay] = useState(null)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [supervisorNome, setSupervisorNome] = useState(null)
  const [navAtiva, setNavAtiva] = useState('home')

  function navegarPara(id) {
    if (id === 'supervisor') { abrirOverlay('supervisor'); return }
    setTela(id)
    setNavAtiva(id)
  }

  function abrirOverlay(tipo) {
    setOverlay(tipo)
    setSenhaInput('')
    setSenhaErro('')
  }

  function verificarSenha() {
    if (overlay === 'supervisor') {
      const nome = SENHAS.supervisor[senhaInput]
      if (nome) { setSupervisorNome(nome); setOverlay(null); setTela('supervisor'); setNavAtiva('supervisor') }
      else setSenhaErro('Senha incorreta.')
    }
  }

  const NAV = [
    { id: 'home', icon: '⊞', label: 'Início' },
    { id: 'programacao', icon: '📅', label: 'Programação' },
    { id: 'supervisor', icon: '🔐', label: 'Supervisor' },
    { id: 'config', icon: '⚙️', label: 'Config' },
  ]

  return (
    <div style={{ background: '#0D0D0D', minHeight: '100vh', paddingBottom: 80 }}>

      {tela === 'home' && <Home onNavegar={navegarPara} />}
      {tela === 'apoio' && <Apoio onVoltar={() => { setTela('home'); setNavAtiva('home') }} />}
      {tela === 'staff' && <Staff onVoltar={() => { setTela('home'); setNavAtiva('home') }} />}
      {tela === 'supervisor' && <Supervisor onVoltar={() => { setTela('home'); setNavAtiva('home') }} nome={supervisorNome} abas={ABAS_SUPERVISOR[supervisorNome] || []} />}
      {tela === 'mural' && <Mural onVoltar={() => { setTela('home'); setNavAtiva('home') }} />}
      {tela === 'midia' && <Midia onVoltar={() => { setTela('home'); setNavAtiva('home') }} />}
      {tela === 'programacao' && <Programacao onVoltar={() => { setTela('home'); setNavAtiva('home') }} />}
      {tela === 'config' && (
        <div style={{ background: '#080C14', minHeight: '100vh', padding: '60px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Configurações</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Em breve</div>
        </div>
      )}

      {/* NAV BAR */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, display: 'flex', background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 10px 28px', zIndex: 50 }}>
        {NAV.map(n => (
          <div key={n.id} onClick={() => navegarPara(n.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 10, color: navAtiva === n.id ? 'white' : 'rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 600 }}>
            <div style={{ fontSize: 22 }}>{n.icon}</div>
            <span>{n.label}</span>
            {navAtiva === n.id && <div style={{ width: 20, height: 3, background: 'white', borderRadius: 2, marginTop: 2 }}></div>}
          </div>
        ))}
      </div>

      {/* OVERLAY SENHA */}
      {overlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {overlay === 'supervisor' ? '🔐' : '🔑'}
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {overlay === 'supervisor' ? 'Área do Supervisor' : 'Acesso Restrito'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Digite sua senha para acessar</p>
            <input
              type="password"
              value={senhaInput}
              onChange={e => { setSenhaInput(e.target.value); setSenhaErro('') }}
              onKeyDown={e => e.key === 'Enter' && verificarSenha()}
              placeholder="••••"
              maxLength={10}
              autoFocus
              style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: '.3em', outline: 'none', color: 'white', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}
            />
            {senhaErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{senhaErro}</p>}
            <button onClick={verificarSenha} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#7C3AED,#60A5FA)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>Entrar</button>
            <button onClick={() => setOverlay(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}