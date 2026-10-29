'use client'

import { DIAS_SEMANA, MESES } from '@/lib/calendario'

// Dia do evento nas plaquinhas (as mesmas do contador da página inicial) com
// setas em relevo dos dois lados. Usado nas escalas que andam dia a dia.
const secao = { fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-faint)' }
const botaoSeta = { width: 42, height: 42, borderRadius: '50%', border: 'none', color: 'var(--text)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

export function SeletorDia({ dias, diaIdx, idxDeHoje, onMudar }) {
  const dia = dias[diaIdx]
  const primeiro = diaIdx === 0
  const ultimo = diaIdx === dias.length - 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" className="cartao-relevo" aria-label="Dia anterior" disabled={primeiro} onClick={() => onMudar(diaIdx - 1)} style={{ ...botaoSeta, opacity: primeiro ? 0.3 : 1 }}>‹</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={secao}>Dia</div>
          {/* key junto com o dígito: só a placa que mudou é remontada e gira */}
          <div className="placas-digitos">
            {String(diaIdx + 1).padStart(2, '0').split('').map((d, i) => <div key={i + '-' + d} className="placa">{d}</div>)}
          </div>
        </div>
        <button type="button" className="cartao-relevo" aria-label="Próximo dia" disabled={ultimo} onClick={() => onMudar(diaIdx + 1)} style={{ ...botaoSeta, opacity: ultimo ? 0.3 : 1 }}>›</button>
      </div>
      {dia && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {DIAS_SEMANA[dia.getDay()]}, {dia.getDate()} de {MESES[dia.getMonth()]}
          {diaIdx === idxDeHoje && <span style={{ color: 'var(--accent-secondary)' }}> · hoje</span>}
        </div>
      )}
    </div>
  )
}
