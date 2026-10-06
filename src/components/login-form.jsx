'use client'

import { useActionState, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { entrar, verificarAprovacao, cancelarPedido } from '@/app/actions/auth'
import { AREAS } from '@/lib/areas'
import { RotuloArea } from '@/components/rotulo-area'
import { useTexto } from '@/lib/i18n'

const inputStyle = {
  width: '100%', padding: '13px 14px',
  background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
  borderRadius: 14, fontSize: 14, color: 'var(--text)',
  outline: 'none', fontFamily: 'var(--font-inter), sans-serif'
}

const pinStyle = {
  width: '100%', padding: '14px 16px',
  background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
  borderRadius: 14, fontSize: 22, textAlign: 'center',
  letterSpacing: '0.4em', outline: 'none', color: 'var(--text)',
  fontFamily: 'var(--font-inter), sans-serif', textTransform: 'uppercase'
}

const botaoPrincipal = (ocupado) => ({
  width: '100%', padding: 15, border: 'none', borderRadius: 14,
  background: ocupado ? 'var(--border-strong)' : 'var(--gradient)',
  fontSize: 15, fontWeight: 700, cursor: ocupado ? 'default' : 'pointer',
  color: 'white', fontFamily: 'var(--font-syne), sans-serif', opacity: ocupado ? 0.6 : 1
})

const MENSAGENS_MOTIVO = {
  encerrada: 'Sua sessão foi encerrada (você entrou em outro aparelho ou seu acesso mudou).',
}

const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** @param {{ nomesDisponiveis: string[] }} props */
export function LoginForm({ nomesDisponiveis }) {
  const tx = useTexto()
  const [listaAberta, setListaAberta] = useState(false)
  const motivo = useSearchParams().get('motivo')
  const [stateEntrar, acaoEntrar, entrando] = useActionState(entrar, undefined)
  const [stateVerificar, acaoVerificar, verificando] = useActionState(verificarAprovacao, undefined)
  const [voltando, startVoltar] = useTransition()
  const [login, setLogin] = useState('')
  const [pin, setPin] = useState('')
  const [areaSel, setAreaSel] = useState('')
  const [descartado, setDescartado] = useState(null)
  // Lista de nomes que ainda não entraram, filtrada pelo que já foi digitado
  const sugestoes = nomesDisponiveis.filter(n => semAcento(n).includes(semAcento(login)) && n !== login)

  // O estado mais recente entre as duas ações decide a tela
  const state = (stateVerificar && stateVerificar !== descartado) ? stateVerificar : (stateEntrar !== descartado ? stateEntrar : undefined)
  const aguardando = state?.tipo === 'aguardando'
  const precisaArea = state?.tipo === 'precisaArea'
  const bloqueado = state?.tipo === 'bloqueado'
  const erro = state?.tipo === 'erro' || bloqueado ? state.erro : ''

  function limparEstado() { if (state) setDescartado(state) }

  function voltarDaEspera() {
    startVoltar(async () => {
      await cancelarPedido(login, pin)
      setDescartado(state)
      setAreaSel('')
      setPin('')
    })
  }

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
          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 38, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, marginBottom: 6 }}>
            Escola<br />
            <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{tx.datasEventoLocal}</div>
        </div>

        {motivo && MENSAGENS_MOTIVO[motivo] && !state && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#F87171', textAlign: 'center' }}>
            {MENSAGENS_MOTIVO[motivo]}
          </div>
        )}

        {aguardando ? (
          <form action={acaoVerificar} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '32px 24px', textAlign: 'center' }}>
            <input type="hidden" name="login" value={login} />
            <input type="hidden" name="pin" value={pin} />
            <div style={{ fontSize: 40, marginBottom: 14 }}>⏳</div>
            <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{tx.aguardandoAprovacaoTitulo}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>{tx.aguardandoAprovacaoDesc}</div>
            {state.aindaPendente && (
              <div style={{ fontSize: 12, color: '#EAB308', marginBottom: 14 }}>{tx.aindaAguardandoAprovacao}</div>
            )}
            <button type="submit" disabled={verificando} style={{ ...botaoPrincipal(verificando), fontSize: 14, marginBottom: 10 }}>
              {verificando ? tx.verificando : tx.jaFuiAprovadoVerificar}
            </button>
            <button type="button" onClick={voltarDaEspera} disabled={voltando} style={{
              width: '100%', padding: 12, borderRadius: 14, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
              cursor: voltando ? 'default' : 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: voltando ? 0.6 : 1
            }}>{tx.voltarLogin}</button>
          </form>
        ) : (
          <form action={acaoEntrar} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, textAlign: 'center' }}>
              {tx.identificacao}
            </div>

            <div style={{ marginBottom: 14, position: 'relative' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Login</div>
              <input
                name="login" value={login} autoComplete="off" autoCapitalize="words"
                onChange={e => { setLogin(e.target.value); setAreaSel(''); limparEstado(); setListaAberta(true) }}
                onFocus={() => setListaAberta(true)}
                onBlur={() => setListaAberta(false)}
                placeholder={nomesDisponiveis.length ? 'Toque pra escolher seu nome' : 'Nome e sobrenome'}
                style={inputStyle}
              />
              {listaAberta && sugestoes.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 20,
                  maxHeight: 240, overflowY: 'auto', borderRadius: 14,
                  background: 'var(--bg-app)', border: '1px solid var(--border-strong)', boxShadow: '0 12px 30px rgba(0,0,0,0.45)'
                }}>
                  {sugestoes.map(nome => (
                    <button
                      key={nome} type="button"
                      // mousedown (antes do blur do campo), senão a lista fecha antes do clique
                      onMouseDown={e => { e.preventDefault(); setLogin(nome); setAreaSel(''); limparEstado(); setListaAberta(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
                        background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
                        color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif'
                      }}
                    >{nome}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: precisaArea ? 14 : 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.pinPessoal}</div>
              <input
                type="password" name="pin" value={pin} autoComplete="current-password"
                onChange={e => { setPin(e.target.value.toUpperCase()); limparEstado() }}
                placeholder="•••••" maxLength={6}
                style={pinStyle}
              />
            </div>

            {precisaArea && (
              <div style={{ marginBottom: 20 }}>
                <input type="hidden" name="area" value={areaSel} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{tx.areasDeInteresse}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AREAS.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setAreaSel(area)}
                      style={{
                        padding: '7px 13px', borderRadius: 20,
                        border: areaSel === area ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
                        background: areaSel === area ? 'var(--accent-bg)' : 'var(--bg-card)',
                        color: areaSel === area ? 'var(--accent-light)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif'
                      }}
                    ><RotuloArea area={area} /></button>
                  ))}
                </div>
                {!areaSel && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>{tx.selecioneAoMenosUmaArea}</div>}
              </div>
            )}

            {erro && <div style={{ fontSize: 12, color: '#F87171', textAlign: 'center', marginBottom: 10 }}>{erro}</div>}

            {bloqueado && (
              <button type="submit" name="forcar" value="1" disabled={entrando} style={{
                width: '100%', padding: 12, borderRadius: 14, marginBottom: 14,
                border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                color: '#F87171', fontSize: 13, fontWeight: 700,
                cursor: entrando ? 'default' : 'pointer', fontFamily: 'var(--font-syne), sans-serif'
              }}>
                {entrando ? tx.entrandoAcao : tx.souEuEntrarMesmoAssim}
              </button>
            )}

            <button type="submit" disabled={entrando || (precisaArea && !areaSel)} style={botaoPrincipal(entrando || (precisaArea && !areaSel))}>
              {entrando ? tx.verificando : tx.entrar}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-faint)' }}>
          {tx.dispositivoReconhecido}
        </div>
      </div>
    </div>
  )
}
