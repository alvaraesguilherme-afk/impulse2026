import { useState, useEffect } from 'react'
import { PINOS, NOMES } from '../lib/pinos'
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../lib/device'
import { getTexto } from '../lib/i18n'
import { AREAS_CADASTRO } from '../lib/areas'
import { notificar } from '../lib/push'

function getConvidadosLocal() {
  try { return JSON.parse(localStorage.getItem('impulse_convidados')) || {} } catch { return {} }
}

function saveConvidado(nome, pin) {
  const c = getConvidadosLocal()
  c[nome] = pin
  localStorage.setItem('impulse_convidados', JSON.stringify(c))
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
  const [modo, setModo] = useState('login')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [bloqueadoInfo, setBloqueadoInfo] = useState(null)
  const [convidados, setConvidados] = useState(getConvidadosLocal)

  const [nomeSel, setNomeSel] = useState('')
  const [pin, setPin] = useState('')

  const [cadNome, setCadNome] = useState('')
  const [cadPin, setCadPin] = useState('')
  const [cadPin2, setCadPin2] = useState('')
  const [cadAreas, setCadAreas] = useState([])

  const [statusConvidados, setStatusConvidados] = useState({})
  const [aguardandoAprovacao, setAguardandoAprovacao] = useState(false)
  const [nomeAguardando, setNomeAguardando] = useState('')
  const [verificandoAprovacao, setVerificandoAprovacao] = useState(false)
  const [aindaPendente, setAindaPendente] = useState(false)

  useEffect(() => {
    supabase.from('convidados').select('nome, pin, precisa_aprovacao, areas_aprovadas, acesso_geral').then(({ data }) => {
      if (!data) return
      const obj = {}
      const status = {}
      data.forEach(d => {
        obj[d.nome] = d.pin
        status[d.nome] = {
          precisaAprovacao: !!d.precisa_aprovacao,
          liberado: (d.areas_aprovadas || []).length > 0 || !!d.acesso_geral,
        }
      })
      setConvidados(obj)
      setStatusConvidados(status)
      localStorage.setItem('impulse_convidados', JSON.stringify(obj))
    })
  }, [])

  function pessoaPrecisaEsperar(nome) {
    const st = statusConvidados[nome]
    return st?.precisaAprovacao && !st?.liberado
  }

  function trocarModo(m) {
    setModo(m); setErro('')
    setNomeSel(''); setPin('')
    setCadNome(''); setCadPin(''); setCadPin2(''); setCadAreas([])
  }

  function toggleArea(area) {
    setCadAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])
  }

  async function entrar() {
    if (!nomeSel) { setErro(tx.selecioneSeuNome); return }
    if (!pin) { setErro(tx.digiteSeuPin); return }

    let nivel
    const dadosPinos = PINOS[nomeSel]
    if (dadosPinos) {
      if (pin !== dadosPinos.pin) { setErro(tx.pinIncorreto); return }
      nivel = dadosPinos.nivel
    } else if (convidados[nomeSel] !== undefined) {
      if (pin !== convidados[nomeSel]) { setErro(tx.pinIncorreto); return }
      if (pessoaPrecisaEsperar(nomeSel)) {
        setNomeAguardando(nomeSel)
        setAguardandoAprovacao(true)
        return
      }
      // Convidado ja aprovado (ou cadastro antigo, de antes da aprovacao existir) entra como staff normal
      const st = statusConvidados[nomeSel]
      nivel = (st?.precisaAprovacao && st?.liberado) ? 'staff' : 'convidado'
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

  async function cadastrar() {
    const nome = cadNome.trim()
    if (!nome) { setErro(tx.digiteSeuNome); return }
    if (PINOS[nome]) { setErro(tx.nomeJaPertenceStaff); return }
    if (convidados[nome] !== undefined) { setErro(tx.nomeJaCadastrado); return }
    if (cadPin.length < 5) { setErro(tx.pinDeveTerCincoDigitos); return }
    if (cadPin !== cadPin2) { setErro(tx.pinsNaoCoincidem); return }
    if (cadAreas.length === 0) { setErro(tx.selecioneAoMenosUmaArea); return }

    const todosOsPins = [
      ...Object.values(PINOS).map(d => d.pin),
      ...Object.values(convidados)
    ]
    if (todosOsPins.includes(cadPin)) { setErro(tx.pinJaEmUso); return }

    setEntrando(true)
    try {
      const { error } = await supabase.from('convidados').insert({ nome, pin: cadPin, areas_pedidas: cadAreas, areas_aprovadas: [], precisa_aprovacao: true })
      if (error) {
        if (error.code === '23505') { setErro(tx.nomeJaCadastrado) } else { setErro(tx.erroCadastrar) }
        setEntrando(false)
        return
      }
      notificar({ tipo: 'cadastro_area' })

      const novo = { ...convidados, [nome]: cadPin }
      localStorage.setItem('impulse_convidados', JSON.stringify(novo))
      setConvidados(novo)
      setStatusConvidados(prev => ({ ...prev, [nome]: { precisaAprovacao: true, liberado: false } }))

      setEntrando(false)
      setNomeAguardando(nome)
      setAguardandoAprovacao(true)
    } catch {
      setErro(tx.erroConexaoLogin)
      setEntrando(false)
    }
  }

  async function verificarAprovacao() {
    if (!nomeAguardando || verificandoAprovacao) return
    setVerificandoAprovacao(true)
    setAindaPendente(false)
    try {
      const { data } = await supabase.from('convidados').select('areas_aprovadas, acesso_geral').eq('nome', nomeAguardando).maybeSingle()
      const liberado = data && ((data.areas_aprovadas || []).length > 0 || !!data.acesso_geral)
      if (!liberado) { setVerificandoAprovacao(false); setAindaPendente(true); return }
      const { bloqueado, msg } = await verificarSessao(nomeAguardando, 'staff', tx)
      if (bloqueado) {
        setAguardandoAprovacao(false)
        setErro(msg)
        setBloqueadoInfo({ nome: nomeAguardando, nivel: 'staff' })
        return
      }
      onLogin({ nome: nomeAguardando, nivel: 'staff' })
    } catch {
      setVerificandoAprovacao(false)
      setAindaPendente(true)
    }
  }

  function voltarDaEspera() {
    setAguardandoAprovacao(false)
    setNomeAguardando('')
    setAindaPendente(false)
    trocarModo('login')
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
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{tx.datasEventoLocal}</div>
        </div>

        {mensagem && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#F87171', textAlign: 'center' }}>
            {mensagem}
          </div>
        )}

        {aguardandoAprovacao ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⏳</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{tx.aguardandoAprovacaoTitulo}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>{tx.aguardandoAprovacaoDesc}</div>
            {aindaPendente && (
              <div style={{ fontSize: 12, color: '#EAB308', marginBottom: 14 }}>{tx.aindaAguardandoAprovacao}</div>
            )}
            <button onClick={verificarAprovacao} disabled={verificandoAprovacao} style={{
              width: '100%', padding: 15, border: 'none', borderRadius: 14, marginBottom: 10,
              background: verificandoAprovacao ? 'var(--border-strong)' : 'var(--gradient)',
              fontSize: 14, fontWeight: 700, cursor: verificandoAprovacao ? 'default' : 'pointer',
              color: 'white', fontFamily: 'Syne, sans-serif', opacity: verificandoAprovacao ? 0.6 : 1
            }}>
              {verificandoAprovacao ? tx.verificando : tx.jaFuiAprovadoVerificar}
            </button>
            <button onClick={voltarDaEspera} style={{
              width: '100%', padding: 12, borderRadius: 14, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}>{tx.voltarLogin}</button>
          </div>
        ) : (
          <>
        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 16, padding: 4, marginBottom: 14 }}>
          {[['login', tx.entrar], ['cadastro', tx.cadastrarBtn]].map(([m, label]) => (
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
                    <option key={n} value={n}>{n}{convidados[n] !== undefined ? ' · convidado' : ''}</option>
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
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, textAlign: 'center' }}>
                {tx.novoAcesso}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.seuNome}</div>
                <input
                  type="text" value={cadNome}
                  onChange={e => { setCadNome(e.target.value); setErro('') }}
                  placeholder={tx.comoVoceQuerSerChamado}
                  maxLength={30} style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.criePin5Digitos}</div>
                <input
                  type="password" value={cadPin}
                  onChange={e => { setCadPin(e.target.value.replace(/\D/g, '')); setErro('') }}
                  placeholder="•••••" maxLength={5} inputMode="numeric"
                  style={pinStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.confirmePin}</div>
                <input
                  type="password" value={cadPin2}
                  onChange={e => { setCadPin2(e.target.value.replace(/\D/g, '')); setErro('') }}
                  onKeyDown={e => e.key === 'Enter' && cadastrar()}
                  placeholder="•••••" maxLength={5} inputMode="numeric"
                  style={pinStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.areasDeInteresse}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {AREAS_CADASTRO.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      style={{
                        padding: '7px 13px', borderRadius: 20,
                        border: cadAreas.includes(area) ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
                        background: cadAreas.includes(area) ? 'var(--accent-bg)' : 'var(--bg-card)',
                        color: cadAreas.includes(area) ? 'var(--accent-light)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                      }}
                    >{area}</button>
                  ))}
                </div>
                {cadAreas.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{tx.areasAprovacaoAviso}</div>
                )}
              </div>

              {erro && <div style={{ fontSize: 12, color: '#F87171', textAlign: 'center', marginBottom: 14 }}>{erro}</div>}

              <button onClick={cadastrar} disabled={entrando} style={{
                width: '100%', padding: 15, border: 'none', borderRadius: 14,
                background: entrando ? 'var(--border-strong)' : 'var(--gradient)',
                fontSize: 15, fontWeight: 700, cursor: entrando ? 'default' : 'pointer',
                color: 'white', fontFamily: 'Syne, sans-serif', opacity: entrando ? 0.6 : 1
              }}>
                {entrando ? tx.cadastrando : tx.cadastrarBtn}
              </button>
            </>
          )}
        </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-faint)' }}>
          {tx.dispositivoReconhecido}
        </div>
      </div>
    </div>
  )
}
