import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTexto } from '../lib/i18n'

const CORES = [
  { id: 'roxo', label: 'Roxo', cor: '#7C3AED' },
  { id: 'vermelho', label: 'Vermelho', cor: '#B91C1C' },
  { id: 'azul', label: 'Azul', cor: '#1E40AF' },
  { id: 'laranja', label: 'Laranja', cor: '#C2410C' },
  { id: 'verde', label: 'Verde', cor: '#16A34A' },
]

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

export default function Config({ onVoltar, tema, setTema, idioma, setIdioma, sessao, onLogout, onAjuda }) {
  const tx = useTexto()
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('impulse_fontsize')) || 100)
  const [accent, setAccentState] = useState(() => localStorage.getItem('impulse_accent') || 'roxo')
  const [muralOrdem, setMuralOrdemState] = useState(() => localStorage.getItem('impulse_mural_ordem') || 'recentes')
  const [cacheMsg, setCacheMsg] = useState('')
  const [bugTexto, setBugTexto] = useState('')
  const [bugEnviado, setBugEnviado] = useState(false)
  const [showRelatos, setShowRelatos] = useState(false)
  const [relatos, setRelatos] = useState([])
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone

  useEffect(() => {
    const handler = e => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function setAccent(cor) {
    setAccentState(cor)
    localStorage.setItem('impulse_accent', cor)
    document.documentElement.setAttribute('data-accent', cor)
  }

  function mudarFonte(valor) {
    setFontSize(valor)
    localStorage.setItem('impulse_fontsize', valor)
    document.body.style.zoom = valor / 100
  }

  function limparCache() {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
    setCacheMsg(tx.cacheLimpo)
    setTimeout(() => window.location.reload(), 1500)
  }

  async function enviarBug() {
    if (!bugTexto.trim()) return
    await supabase.from('bug_reports').insert({ texto: bugTexto.trim() })
    setBugTexto('')
    setBugEnviado(true)
    setTimeout(() => setBugEnviado(false), 3000)
  }

  function setMuralOrdem(v) {
    setMuralOrdemState(v)
    localStorage.setItem('impulse_mural_ordem', v)
  }

  async function instalarApp() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  async function abrirRelatos() {
    const { data } = await supabase.from('bug_reports').select('*').order('created_at', { ascending: false })
    setRelatos(data || [])
    setShowRelatos(true)
  }

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--bg-card)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{tx.configuracoes}</h2>
        {onAjuda && (
          <button onClick={onAjuda} style={{ marginLeft: 'auto', width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>?</button>
        )}
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
                fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif'
              }}>{v}%</button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 22 }}>🖼️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ordenação do Mural</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Como as fotos aparecem por padrão</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'recentes', label: '🕐 Mais recentes' }, { id: 'curtidas', label: '❤️ Mais curtidas' }].map(op => (
              <button key={op.id} onClick={() => setMuralOrdem(op.id)} style={{
                flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer',
                border: muralOrdem === op.id ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
                background: muralOrdem === op.id ? 'var(--accent-bg)' : 'var(--input-bg)',
                color: muralOrdem === op.id ? 'var(--accent-light)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif'
              }}>{op.label}</button>
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
                fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif'
              }}>{l.label}</button>
            ))}
          </div>
        </div>

        {/* INSTALAR */}
        {!jaInstalado && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 28 }}>Instalar app</div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 22 }}>📲</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Instalar na tela inicial</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Acesse sem precisar abrir o navegador</div>
                </div>
              </div>
              {deferredPrompt ? (
                <button onClick={instalarApp} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'var(--gradient)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Instalar agora
                </button>
              ) : isIOS ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
                  <div>1. Toque em <strong style={{ color: 'var(--text)' }}>Compartilhar ⬆️</strong> no Safari</div>
                  <div>2. Role e toque em <strong style={{ color: 'var(--text)' }}>Adicionar à Tela de Início</strong></div>
                  <div>3. Toque em <strong style={{ color: 'var(--text)' }}>Adicionar</strong> no canto superior direito</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
                  <div>1. Toque nos <strong style={{ color: 'var(--text)' }}>três pontos ⋮</strong> do navegador</div>
                  <div>2. Toque em <strong style={{ color: 'var(--text)' }}>Adicionar à tela inicial</strong></div>
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
            <button onClick={limparCache} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{tx.limparRecarregar}</button>
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
            {sessao?.nome === 'Alvarães' && (
              <button onClick={abrirRelatos} style={{
                padding: '4px 10px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-faint)',
                fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>🔒</button>
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
                width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 12, fontSize: 13, color: 'var(--text)', outline: 'none', marginBottom: 8, fontFamily: 'Inter, sans-serif', resize: 'none'
              }} />
              <button onClick={enviarBug} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: bugTexto.trim() ? 'var(--gradient)' : 'var(--input-bg)',
                color: bugTexto.trim() ? 'white' : 'var(--text-faint)',
                fontSize: 13, fontWeight: 700, cursor: bugTexto.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif'
              }}>{tx.enviar}</button>
            </>
          )}
        </div>

        {/* SOBRE */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 28 }}>{tx.sobre}</div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Escola Impulse 2026</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>15 a 25 de julho · Rancho Império</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12 }}>{tx.versaoBeta} · {tx.feitoComCarinho}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{tx.desenvolvedores}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👨‍💻</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Alvarães</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Desenvolvimento & Design</div>
            </div>
          </div>
        </div>

        {/* SESSÃO */}
        {sessao && (
          <div style={{ marginTop: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Sessão</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{sessao.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Logado neste dispositivo</div>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: '8px 16px', borderRadius: 12,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#F87171', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Syne, sans-serif'
                }}
              >Sair</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL RELATOS (só Alvarães) */}
      {showRelatos && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overlay-enter" style={{ background: 'var(--overlay-bg)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '24px 20px', width: '90%', maxWidth: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 14, textAlign: 'center' }}>🐛 {tx.relatos}</h2>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {relatos.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, padding: 20 }}>{tx.nenhumRelato}</div>}
              {relatos.map(r => (
                <div key={r.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.texto}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>{new Date(r.created_at).toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowRelatos(false)} style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{tx.cancelar}</button>
          </div>
        </div>
      )}
    </div>
  )
}
