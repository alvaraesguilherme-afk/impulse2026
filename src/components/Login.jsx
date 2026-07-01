import { useState, useEffect } from 'react'
import { PINOS, NOMES } from '../lib/pinos'
import { supabase } from '../lib/supabase'

function getConvidadosLocal() {
  try { return JSON.parse(localStorage.getItem('impulse_convidados')) || {} } catch { return {} }
}

const inputStyle = {
  width: '100%', padding: '13px 14px',
  background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
  borderRadius: 14, fontSize: 14, color: 'var(--text)',
  outline: 'none', fontFamily: 'Inter, sans-serif'
}

const pinStyle = {
  width: '100%', padding: '14px 16px',
  background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
  borderRadius: 14, fontSize: 22, textAlign: 'center',
  letterSpacing: '0.4em', outline: 'none', color: 'var(--text)',
  fontFamily: 'Inter, sans-serif'
}

export default function Login({ onLogin }) {
  const [modo, setModo] = useState('login')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [convidados, setConvidados] = useState(getConvidadosLocal)

  // login
  const [nomeSel, setNomeSel] = useState('')
  const [pin, setPin] = useState('')

  // cadastro
  const [cadNome, setCadNome] = useState('')
  const [cadPin, setCadPin] = useState('')
  const [cadPin2, setCadPin2] = useState('')

  useEffect(() => {
    supabase.from('convidados').select('nome, pin').then(({ data }) => {
      if (!data) return
      const obj = {}
      data.forEach(d => { obj[d.nome] = d.pin })
      setConvidados(obj)
      localStorage.setItem('impulse_convidados', JSON.stringify(obj))
    })
  }, [])

  function trocarModo(m) {
    setModo(m); setErro('')
    setNomeSel(''); setPin('')
    setCadNome(''); setCadPin(''); setCadPin2('')
  }

  function entrar() {
    if (!nomeSel) { setErro('Selecione seu nome.'); return }
    if (!pin) { setErro('Digite seu PIN.'); return }

    const dadosPinos = PINOS[nomeSel]
    if (dadosPinos) {
      if (pin !== dadosPinos.pin) { setErro('PIN incorreto.'); return }
      setEntrando(true)
      setTimeout(() => onLogin({ nome: nomeSel, nivel: dadosPinos.nivel }), 400)
      return
    }

    if (convidados[nomeSel] !== undefined) {
      if (pin !== convidados[nomeSel]) { setErro('PIN incorreto.'); return }
      setEntrando(true)
      setTimeout(() => onLogin({ nome: nomeSel, nivel: 'convidado' }), 400)
      return
    }

    setErro('Nome não encontrado.')
  }

  async function cadastrar() {
    const nome = cadNome.trim()
    if (!nome) { setErro('Digite seu nome.'); return }
    if (PINOS[nome]) { setErro('Este nome já pertence ao staff.'); return }
    if (convidados[nome] !== undefined) { setErro('Este nome já está cadastrado.'); return }
    if (cadPin.length < 5) { setErro('O PIN deve ter 5 dígitos.'); return }
    if (cadPin !== cadPin2) { setErro('Os PINs não coincidem.'); return }

    const todosOsPins = [
      ...Object.values(PINOS).map(d => d.pin),
      ...Object.values(convidados)
    ]
    if (todosOsPins.includes(cadPin)) { setErro('Este PIN já está em uso. Escolha outro.'); return }

    setEntrando(true)
    const { error } = await supabase.from('convidados').insert({ nome, pin: cadPin })
    if (error) {
      setEntrando(false)
      if (error.code === '23505') { setErro('Este nome já está cadastrado.'); return }
      setErro('Erro ao cadastrar. Tente novamente.')
      return
    }

    const novo = { ...convidados, [nome]: cadPin }
    localStorage.setItem('impulse_convidados', JSON.stringify(novo))
    setConvidados(novo)
    setTimeout(() => onLogin({ nome, nivel: 'convidado' }), 400)
  }

  const nomesConvidados = Object.keys(convidados).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const todosNomes = [...NOMES, ...nomesConvidados].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-app)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 320, height: 320, background: '#5B21B6', borderRadius: '50%', filter: 'blur(90px)', opacity: 0.3, top: -100, right: -80 }} />
        <div style={{ position: 'absolute', width: 220, height: 220, background: '#0EA5E9', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.25, bottom: 100, left: -60 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 38, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, marginBottom: 6 }}>
            Escola<br />
            <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>15 a 25 de julho · Rancho Império</div>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 16, padding: 4, marginBottom: 14 }}>
          {[['login', 'Entrar'], ['cadastro', 'Cadastrar']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => trocarModo(m)}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                background: modo === m ? 'var(--gradient)' : 'transparent',
                color: modo === m ? 'white' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', transition: 'all 0.2s'
              }}
            >{label}</button>
          ))}
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px' }}>
          {modo === 'login' ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, textAlign: 'center' }}>
                Identificação
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Seu nome</div>
                <select
                  value={nomeSel}
                  onChange={e => { setNomeSel(e.target.value); setErro('') }}
                  style={{ ...inputStyle, color: nomeSel ? 'var(--text)' : 'var(--text-faint)', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">Selecione seu nome...</option>
                  {todosNomes.map(n => (
                    <option key={n} value={n}>{n}{convidados[n] !== undefined ? ' · convidado' : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>PIN pessoal</div>
                <input
                  type="password" value={pin}
                  onChange={e => { setPin(e.target.value); setErro('') }}
                  onKeyDown={e => e.key === 'Enter' && entrar()}
                  placeholder="••••" maxLength={6} inputMode="numeric"
                  style={pinStyle}
                />
              </div>

              {erro && <div style={{ fontSize: 12, color: '#F87171', textAlign: 'center', marginBottom: 14 }}>{erro}</div>}

              <button onClick={entrar} disabled={entrando} style={{
                width: '100%', padding: 15, border: 'none', borderRadius: 14,
                background: entrando ? 'var(--border-strong)' : 'var(--gradient)',
                fontSize: 15, fontWeight: 700, cursor: entrando ? 'default' : 'pointer',
                color: 'white', fontFamily: 'Syne, sans-serif', opacity: entrando ? 0.6 : 1
              }}>
                {entrando ? 'Entrando...' : 'Entrar'}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, textAlign: 'center' }}>
                Novo acesso
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>
                Você entrará como <strong>Convidado</strong>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Seu nome</div>
                <input
                  type="text" value={cadNome}
                  onChange={e => { setCadNome(e.target.value); setErro('') }}
                  placeholder="Como você quer ser chamado"
                  maxLength={30}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Crie um PIN (5 dígitos)</div>
                <input
                  type="password" value={cadPin}
                  onChange={e => { setCadPin(e.target.value.replace(/\D/g, '')); setErro('') }}
                  placeholder="•••••" maxLength={5} inputMode="numeric"
                  style={pinStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Confirme o PIN</div>
                <input
                  type="password" value={cadPin2}
                  onChange={e => { setCadPin2(e.target.value.replace(/\D/g, '')); setErro('') }}
                  onKeyDown={e => e.key === 'Enter' && cadastrar()}
                  placeholder="•••••" maxLength={5} inputMode="numeric"
                  style={pinStyle}
                />
              </div>

              {erro && <div style={{ fontSize: 12, color: '#F87171', textAlign: 'center', marginBottom: 14 }}>{erro}</div>}

              <button onClick={cadastrar} disabled={entrando} style={{
                width: '100%', padding: 15, border: 'none', borderRadius: 14,
                background: entrando ? 'var(--border-strong)' : 'var(--gradient)',
                fontSize: 15, fontWeight: 700, cursor: entrando ? 'default' : 'pointer',
                color: 'white', fontFamily: 'Syne, sans-serif', opacity: entrando ? 0.6 : 1
              }}>
                {entrando ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-faint)' }}>
          Seu dispositivo ficará reconhecido após o login
        </div>
      </div>
    </div>
  )
}
