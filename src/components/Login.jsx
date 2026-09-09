import { useState, useEffect } from 'react'
import { PINOS, NOMES } from '../lib/pinos'
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../lib/device'
import { getTexto } from '../lib/i18n'

function getStaffExtraLocal() {
  try { return JSON.parse(localStorage.getItem('impulse_staff_extra')) || {} } catch { return {} }
}

const LIMITE_DEVICES = { maximo: 2, alto: 2, 'Alvarães': 4 }

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

async function verificarSessao(nome, nivel, tx) {
  const deviceId = getDeviceId()
  const limite = LIMITE_DEVICES[nome] ?? LIMITE_DEVICES[nivel] ?? 1

  const { data: sessoes } = await supabase
    .from('sessoes_ativas')
    .select('device_id, updated_at')
    .eq('nome', nome)

  // Sessoes nao expiram mais por tempo — so saem quando alguem faz logout
  // ou e forcado a sair por estourar o limite de aparelhos.
  const frescas = sessoes || []

  const jaEsteDevice = frescas.some(s => s.device_id === deviceId)

  if (!jaEsteDevice && frescas.length >= limite) {
    const msg = limite >= 2 ? tx.contaAtivaDoisAparelhos : tx.contaAtivaOutroAparelho
    return { bloqueado: true, msg }
  }

  await supabase.from('sessoes_ativas').upsert(
    { nome, device_id: deviceId, updated_at: new Date().toISOString() },
    { onConflict: 'nome,device_id' }
  )
  return { bloqueado: false, msg: '' }
}

export default function Login({ onLogin, mensagem, idioma }) {
  const tx = getTexto(idioma)
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [bloqueadoInfo, setBloqueadoInfo] = useState(null)
  const [staffExtra, setStaffExtra] = useState(getStaffExtraLocal)

  const [nomeSel, setNomeSel] = useState('')
  const [pin, setPin] = useState('')

  useEffect(() => {
    supabase.from('staff').select('nome, pin').then(({ data }) => {
      if (!data) return
      const obj = {}
      data.forEach(d => { obj[d.nome] = d.pin })
      setStaffExtra(obj)
      localStorage.setItem('impulse_staff_extra', JSON.stringify(obj))
    })
  }, [])

  async function entrar() {
    if (!nomeSel) { setErro(tx.selecioneSeuNome); return }
    if (!pin) { setErro(tx.digiteSeuPin); return }

    let nivel
    const dadosPinos = PINOS[nomeSel]
    if (dadosPinos) {
      if (pin !== dadosPinos.pin) { setErro(tx.pinIncorreto); return }
      nivel = dadosPinos.nivel
    } else if (staffExtra[nomeSel] !== undefined) {
      if (pin !== staffExtra[nomeSel]) { setErro(tx.pinIncorreto); return }
      nivel = 'staff'
    } else {
      setErro(tx.nomeNaoEncontrado); return
    }

    setEntrando(true)
    try {
      const { bloqueado, msg } = await verificarSessao(nomeSel, nivel, tx)
      if (bloqueado) {
        setErro(msg)
        setBloqueadoInfo({ nome: nomeSel, nivel })
        return
      }
      onLogin({ nome: nomeSel, nivel })
    } catch {
      setErro(tx.erroConexaoLogin)
    } finally {
      setEntrando(false)
    }
  }

  async function forcarLogin() {
    if (!bloqueadoInfo) return
    setEntrando(true)
    try {
      const deviceId = getDeviceId()
      await supabase.from('sessoes_ativas').delete().eq('nome', bloqueadoInfo.nome)
      await supabase.from('sessoes_ativas').upsert(
        { nome: bloqueadoInfo.nome, device_id: deviceId, updated_at: new Date().toISOString() },
        { onConflict: 'nome,device_id' }
      )
      onLogin({ nome: bloqueadoInfo.nome, nivel: bloqueadoInfo.nivel })
    } catch {
      setErro(tx.erroConexaoLogin)
      setEntrando(false)
    }
  }

  const nomesStaffExtra = Object.keys(staffExtra).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const todosNomes = [...NOMES, ...nomesStaffExtra].sort((a, b) => a.localeCompare(b, 'pt-BR'))

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
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{tx.datasEventoLocal}</div>
        </div>

        {mensagem && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#F87171', textAlign: 'center' }}>
            {mensagem}
          </div>
        )}

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, textAlign: 'center' }}>
            {tx.identificacao}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.seuNome}</div>
            <select
              value={nomeSel}
              onChange={e => { setNomeSel(e.target.value); setErro(''); setBloqueadoInfo(null) }}
              style={{ ...inputStyle, color: nomeSel ? 'var(--text)' : 'var(--text-faint)', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">{tx.selecioneSeuNomeOpcao}</option>
              {todosNomes.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.pinPessoal}</div>
            <input
              type="password" value={pin}
              onChange={e => { setPin(e.target.value); setErro(''); setBloqueadoInfo(null) }}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              placeholder="••••" maxLength={6} inputMode="numeric"
              style={pinStyle}
            />
          </div>

          {erro && <div style={{ fontSize: 12, color: '#F87171', textAlign: 'center', marginBottom: 10 }}>{erro}</div>}

          {bloqueadoInfo && (
            <button onClick={forcarLogin} disabled={entrando} style={{
              width: '100%', padding: 12, borderRadius: 14, marginBottom: 14,
              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
              color: '#F87171', fontSize: 13, fontWeight: 700,
              cursor: entrando ? 'default' : 'pointer', fontFamily: 'Syne, sans-serif'
            }}>
              {entrando ? tx.entrandoAcao : tx.souEuEntrarMesmoAssim}
            </button>
          )}

          <button onClick={entrar} disabled={entrando} style={{
            width: '100%', padding: 15, border: 'none', borderRadius: 14,
            background: entrando ? 'var(--border-strong)' : 'var(--gradient)',
            fontSize: 15, fontWeight: 700, cursor: entrando ? 'default' : 'pointer',
            color: 'white', fontFamily: 'Syne, sans-serif', opacity: entrando ? 0.6 : 1
          }}>
            {entrando ? tx.verificando : tx.entrar}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-faint)' }}>
          {tx.dispositivoReconhecido}
        </div>
      </div>
    </div>
  )
}
