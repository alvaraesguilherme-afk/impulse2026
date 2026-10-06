'use client'

import { useState, useEffect } from 'react'
import { useTexto } from '@/lib/i18n'
import { ehAdmin } from '@/lib/permissoes'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor, lerLocal } from '@/lib/hooks'
import { usePreferencias } from '@/components/preferencias'
import { BotaoVoltar } from '@/components/botao-voltar'
import { getStatusNotificacoes, ativarNotificacoes, desativarNotificacoes, suportaNotificacoes, sincronizarInscricao } from '@/lib/push-client'

const CORES = [
  { id: 'roxo', label: 'Roxo', cor: '#7C3AED' },
  { id: 'vermelho', label: 'Vermelho', cor: '#B91C1C' },
  { id: 'azul', label: 'Azul', cor: '#1E40AF' },
  { id: 'laranja', label: 'Laranja', cor: '#C2410C' },
  { id: 'verde', label: 'Verde', cor: '#16A34A' },
]

export function Config({ sessao, vapidKey, relatos: relatosServidor }) {
  const tx = useTexto()
  const { tema, setTema, idioma, setIdioma } = usePreferencias()
  const montado = useMontado()
  const [fontEscolhida, setFontSize] = useState(null)
  const [accentEscolhido, setAccentState] = useState(null)
  const fontSize = fontEscolhida ?? (montado ? parseInt(lerLocal('impulse_fontsize', '100')) || 100 : 100)
  const accent = accentEscolhido ?? (montado ? lerLocal('impulse_accent', 'roxo') : 'roxo')
  const ambiente = montado
    ? { isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent), jaInstalado: window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone, suporta: suportaNotificacoes() }
    : { isIOS: false, jaInstalado: false, suporta: false }
  const [cacheMsg, setCacheMsg] = useState('')
  const [bugTexto, setBugTexto] = useState('')
  const [bugEnviado, setBugEnviado] = useState(false)
  const [showRelatos, setShowRelatos] = useState(false)
  const [relatos, setRelatos] = useEstadoServidor(relatosServidor)
  const naoLidos = relatos.filter(r => !r.lido).length

  const [statusNotif, setStatusNotif] = useState('unsupported')
  const [carregandoNotif, setCarregandoNotif] = useState(false)
  const [erroNotif, setErroNotif] = useState('')

  useEffect(() => {
    getStatusNotificacoes().then(status => {
      setStatusNotif(status)
      // Reassocia a inscricao existente com quem esta logado agora,
      // caso o mesmo aparelho tenha sido usado por outra pessoa antes.
      if (status === 'granted') sincronizarInscricao()
    })
  }, [])

  async function alternarNotificacoes() {
    setErroNotif('')
    setCarregandoNotif(true)
    if (statusNotif === 'granted') {
      await desativarNotificacoes()
    } else {
      const resultado = await ativarNotificacoes(vapidKey)
      if (!resultado.ok) setErroNotif(resultado.erro)
    }
    setStatusNotif(await getStatusNotificacoes())
    setCarregandoNotif(false)
  }

  function setAccent(cor) {
    setAccentState(cor)
    localStorage.setItem('impulse_accent', cor)
    document.documentElement.setAttribute('data-accent', cor)
  }

  function mudarFonte(valor) {
    setFontSize(valor)
    localStorage.setItem('impulse_fontsize', valor)
    document.documentElement.style.zoom = valor / 100
  }

  function limparCache() {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
    setCacheMsg(tx.cacheLimpo)
    setTimeout(() => window.location.reload(), 1500)
  }

  async function enviarBug() {
    if (!bugTexto.trim()) return
    await executar('config.enviarBug', bugTexto.trim())
    setBugTexto('')
    setBugEnviado(true)
    setTimeout(() => setBugEnviado(false), 3000)
  }

  function abrirRelatos() {
    setShowRelatos(true)
  }

  async function marcarLido(id, lido) {
    setRelatos(prev => prev.map(r => r.id === id ? { ...r, lido } : r))
    executar('config.marcarRelatoLido', id, lido)
  }

  return (
    <div className="tela-enter" style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <BotaoVoltar />
        <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700 }}>{tx.configuracoes}</h2>
      </div>

      <div style={{ padding: '24px 22px 100px' }}>
        {/* APARÊNCIA */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{tx.aparencia}</div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22 }}>{tema === 'light' ? '☀️' : '🌙'}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{tema === 'light' ? tx.temaClaro : tx.temaEscuro}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tema === 'light' ? tx.modoClaroAtivado : tx.modoEscuroAtivado}</div>
              </div>
            </div>
            <div className={`toggle-track ${tema === 'light' ? 'active' : ''}`} onClick={() => setTema(tema === 'light' ? 'dark' : 'light')}>
              <div className="toggle-thumb" />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 22 }}>🎨</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.corDestaque}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tx.personalizeVisual}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {CORES.map(c => (
              <div key={c.id} onClick={() => setAccent(c.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, background: c.cor,
                  border: accent === c.id ? '3px solid var(--text)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: accent === c.id ? `0 0 16px ${c.cor}50` : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  {accent === c.id && <span style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ fontSize: 10, color: accent === c.id ? 'var(--text)' : 'var(--text-muted)', fontWeight: 600 }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 22 }}>🔤</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.tamanhoFonte}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fontSize}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>A</span>
            <input type="range" min="85" max="140" step="5" value={fontSize} onChange={e => mudarFonte(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 20, color: 'var(--text-muted)', fontWeight: 600 }}>A</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {[85, 100, 120, 140].map(v => (
              <button key={v} onClick={() => mudarFonte(v)} style={{
                padding: '4px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: fontSize === v ? 'var(--accent-bg)' : 'var(--input-bg)',
                color: fontSize === v ? 'var(--accent-light)' : 'var(--text-muted)',
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-inter), sans-serif'
              }}>{v}%</button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 22 }}>🌐</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.idioma}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'pt-BR', label: '🇧🇷 Português', short: tx.portugues }, { id: 'en', label: '🇺🇸 English', short: tx.ingles }].map(l => (
              <button key={l.id} onClick={() => setIdioma(l.id)} style={{
                flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer',
                border: idioma === l.id ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
                background: idioma === l.id ? 'var(--accent-bg)' : 'var(--input-bg)',
                color: idioma === l.id ? 'var(--accent-light)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-inter), sans-serif'
              }}>{l.label}</button>
            ))}
          </div>
        </div>

        {/* NOTIFICAÇÕES */}
        {(ambiente.suporta || ambiente.isIOS) && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 28 }}>{tx.notificacoes}</div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 22 }}>🔔</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.notificacoesPush}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {!ambiente.suporta ? tx.notifIndisponivel : statusNotif === 'granted' ? tx.notifAtivadas : statusNotif === 'denied' ? tx.notifBloqueadas : tx.notifDesc}
                    </div>
                  </div>
                </div>
                {ambiente.suporta && statusNotif !== 'denied' && (
                  <div className={`toggle-track ${statusNotif === 'granted' ? 'active' : ''}`} onClick={carregandoNotif ? undefined : alternarNotificacoes} style={{ opacity: carregandoNotif ? 0.5 : 1, cursor: carregandoNotif ? 'default' : 'pointer' }}>
                    <div className="toggle-thumb" />
                  </div>
                )}
              </div>
              {erroNotif && <div style={{ fontSize: 12, color: '#F87171', marginTop: 10 }}>{erroNotif}</div>}
              {!ambiente.suporta && ambiente.isIOS && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 10, lineHeight: 1.4 }}>
                  {ambiente.jaInstalado ? tx.notifIosAtualizar : tx.notifIosInstalar}
                </div>
              )}
            </div>
          </>
        )}

        {/* DADOS */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 28 }}>{tx.dados}</div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 22 }}>🔄</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.limparCache}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tx.limparCacheDesc}</div>
            </div>
          </div>
          {cacheMsg ? (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 12, color: '#6EE7B7', textAlign: 'center', fontWeight: 600 }}>✓ {cacheMsg}</div>
          ) : (
            <button onClick={limparCache} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>{tx.limparRecarregar}</button>
          )}
        </div>

        {/* FEEDBACK */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 28 }}>{tx.relatarProblema}</div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 22 }}>🐛</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.relatarProblema}</div>
            </div>
            {ehAdmin(sessao) && (
              <button onClick={abrirRelatos} style={{
                padding: '4px 10px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-faint)',
                fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif',
                display: 'flex', alignItems: 'center', gap: 5
              }}>
                🔒
                {naoLidos > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#F87171', background: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: '1px 6px' }}>{naoLidos}</span>
                )}
              </button>
            )}
          </div>
          {bugEnviado ? (
            <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#6EE7B7', fontWeight: 600 }}>✓ {tx.obrigado}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{tx.relatoEnviado}</div>
            </div>
          ) : (
            <>
              <textarea value={bugTexto} onChange={e => setBugTexto(e.target.value)} placeholder={tx.descreva} rows={3} style={{
                width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 12, fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8, fontFamily: 'var(--font-inter), sans-serif', resize: 'none'
              }} />
              <button onClick={enviarBug} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: bugTexto.trim() ? 'var(--gradient)' : 'var(--input-bg)',
                color: bugTexto.trim() ? 'white' : 'var(--text-faint)',
                fontSize: 13, fontWeight: 700, cursor: bugTexto.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-inter), sans-serif'
              }}>{tx.enviar}</button>
            </>
          )}
        </div>

        {/* SOBRE */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 28 }}>{tx.sobre}</div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Escola Impulse</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{tx.datasEventoLocal}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12 }}>{tx.versaoBeta} · {tx.feitoComCarinho}</div>
        </div>


        {/* SESSÃO */}
        {sessao && (
          <div style={{ marginTop: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{tx.sessao}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{sessao.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tx.logadoNesteDispositivo}</div>
              </div>
              <a
                href="/sair"
                style={{
                  padding: '8px 16px', borderRadius: 12,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#F87171', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-syne), sans-serif', textDecoration: 'none'
                }}
              >{tx.sair}</a>
            </div>
          </div>
        )}
      </div>

      {/* MODAL RELATOS (só nivel maximo) */}
      {showRelatos && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overlay-enter" style={{ background: 'var(--overlay-bg)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '24px 20px', width: '90%', maxWidth: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>🐛 {tx.relatos}</h2>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {relatos.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 20 }}>{tx.nenhumRelato}</div>}
              {relatos.map(r => (
                <div key={r.id} style={{ background: 'var(--input-bg)', border: r.lido ? '1px solid var(--border)' : '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, opacity: r.lido ? 0.55 : 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.texto}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }} suppressHydrationWarning>{new Date(r.created_at).toLocaleString('pt-BR')}</div>
                    <button onClick={() => marcarLido(r.id, !r.lido)} style={{
                      padding: '4px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 10, fontWeight: 700,
                      border: r.lido ? '1px solid var(--border-strong)' : '1px solid rgba(16,185,129,0.4)',
                      background: r.lido ? 'var(--bg-card)' : 'rgba(16,185,129,0.15)',
                      color: r.lido ? 'var(--text-muted)' : '#6EE7B7'
                    }}>{r.lido ? '↩ Marcar não lido' : '✓ Marcar como lido'}</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowRelatos(false)} style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>{tx.cancelar}</button>
          </div>
        </div>
      )}
    </div>
  )
}
