'use client'

import { useEffect, useState } from 'react'
import { useTexto } from '@/lib/i18n'

// Decidido uma vez por carregamento da página (sobrevive ao efeito rodando
// duas vezes no modo de desenvolvimento do React)
let mostrar = null

// Mesma abertura do app antigo, mas só na primeira vez que o app abre na
// sessão do navegador — não a cada recarregamento, pra não atrasar quem volta.
export function Splash() {
  const tx = useTexto()
  const [fase, setFase] = useState('oculto')

  useEffect(() => {
    if (mostrar === null) {
      try {
        mostrar = !sessionStorage.getItem('impulse_splash')
        sessionStorage.setItem('impulse_splash', '1')
      } catch { mostrar = false }
    }
    if (!mostrar) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só decide depois de ler o sessionStorage
    setFase('visivel')
    const t1 = setTimeout(() => setFase('saindo'), 1400)
    const t2 = setTimeout(() => { setFase('oculto'); mostrar = false }, 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (fase === 'oculto') return null
  return (
    <div className={`splash ${fase === 'saindo' ? 'splash-exit' : ''}`}>
      <div className="splash-glow" style={{ width: 250, height: 250, background: '#5B21B6', top: '20%', right: '-20%' }} />
      <div className="splash-glow" style={{ width: 180, height: 180, background: '#0EA5E9', bottom: '20%', left: '-15%', animationDelay: '0.5s' }} />
      <div className="splash-glow" style={{ width: 120, height: 120, background: '#F59E0B', top: '50%', left: '60%', animationDelay: '1s' }} />
      <div className="splash-logo" style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 48, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, textAlign: 'center' }}>
        Escola<br />
        <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span>
      </div>
      <div className="splash-sub" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 16, letterSpacing: 2, textTransform: 'uppercase' }}>
        {tx.datasEvento}
      </div>
      <div className="splash-bar splash-loader">
        <div className="splash-loader-bar" />
      </div>
    </div>
  )
}
