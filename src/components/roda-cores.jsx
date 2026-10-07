'use client'

import { useRef, useState } from 'react'

// Roleta de cores das Configurações, em HSL: o anel escolhe o tom (ângulo);
// embaixo, uma barra de claridade (do preto, passando pela cor pura, até o
// branco) e outra de intensidade (cinza ↔ viva). As duas mudam o anel
// inteiro. Claridade com a faixa toda de propósito (pedido do usuário), mesmo
// que preto/branco sumam um pouco contra o fundo do tema.
const L_MIN = 0
const L_MAX = 100

export function hexParaHsl(hex) {
  const n = parseInt((hex || '#7C3AED').replace('#', ''), 16)
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l: l * 100 }
}

export function hslParaHex({ h, s, l }) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = n => {
    const k = (n + h / 30) % 12
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0')
  }
  return '#' + f(0) + f(8) + f(4)
}

export function RodaDeCores({ cor, onMudar, tamanho = 220 }) {
  const roda = useRef(null)
  // O tom fica guardado aqui, não só recalculado da cor: preto e branco não
  // têm tom, e sem isso descer a barra até o preto e subir de novo voltava
  // cinza em vez da cor escolhida. Só ressincroniza se a cor mudar por fora.
  const [tom, setTom] = useState(() => hexParaHsl(cor))
  const [corVista, setCorVista] = useState(cor)
  if (cor !== corVista) {
    setCorVista(cor)
    if (cor !== hslParaHex(tom)) setTom(hexParaHsl(cor))
  }
  const hsl = tom
  const l = Math.min(L_MAX, Math.max(L_MIN, hsl.l))
  // O anel mostra os tons já com a claridade e a intensidade das barras —
  // só não vai a preto/branco puro, senão some e não dá pra ver onde tocar.
  const lAnel = Math.min(94, Math.max(6, l))

  function mudar(novo) {
    setTom(novo)
    const hex = hslParaHex(novo)
    setCorVista(hex)
    onMudar(hex)
  }

  // O anel escolhe só o tom (pelo ângulo); claridade e intensidade são das barras.
  function escolherNoAnel(e) {
    const caixa = roda.current.getBoundingClientRect()
    const x = e.clientX - caixa.left - caixa.width / 2
    const y = e.clientY - caixa.top - caixa.height / 2
    mudar({ ...hsl, h: (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360 })
  }

  const arrastar = {
    onPointerDown: e => { e.currentTarget.setPointerCapture(e.pointerId); escolherNoAnel(e) },
    onPointerMove: e => { if (e.buttons) escolherNoAnel(e) },
  }

  const tons = Array.from({ length: 13 }, (_, i) => `hsl(${i * 30} ${hsl.s}% ${lAnel}%)`).join(", ")
  const espessura = tamanho * 0.17
  // Marcador no meio da espessura do anel (0° = topo, sentido horário)
  const ang = (hsl.h - 90) * Math.PI / 180
  const raio = tamanho / 2 - espessura / 2
  const legenda = { fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }
  const barra = fundo => ({ width: "100%", height: 14, borderRadius: 999, appearance: "none", WebkitAppearance: "none", cursor: "pointer", background: fundo })

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div ref={roda} {...arrastar} role="slider" aria-label="Tom da cor" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsl.h)} aria-valuetext={cor} style={{
        width: tamanho, height: tamanho, borderRadius: "50%", position: "relative", touchAction: "none", cursor: "crosshair",
        background: `conic-gradient(${tons})`, boxShadow: "0 6px 20px rgba(0,0,0,0.35)"
      }}>
        <div style={{
          position: "absolute", inset: espessura, borderRadius: "50%", background: cor, pointerEvents: "none",
          border: "4px solid var(--bg-card)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)"
        }} />
        <div style={{
          position: "absolute", width: 26, height: 26, borderRadius: "50%", pointerEvents: "none",
          left: tamanho / 2 + Math.cos(ang) * raio - 13, top: tamanho / 2 + Math.sin(ang) * raio - 13,
          background: cor, border: "3px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.5)"
        }} />
      </div>

      <div style={{ width: tamanho, display: "flex", flexDirection: "column", gap: 6 }}>
        <input type="range" min={L_MIN} max={L_MAX} value={Math.round(l)} aria-label="Claridade"
          onChange={e => mudar({ ...hsl, l: Number(e.target.value) })} className="barra-brilho"
          style={barra(`linear-gradient(90deg, ${hslParaHex({ ...hsl, l: L_MIN })}, ${hslParaHex({ ...hsl, l: 50 })}, ${hslParaHex({ ...hsl, l: L_MAX })})`)} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={legenda}>Mais escuro</span>
          <span style={legenda}>Mais claro</span>
        </div>
      </div>

      <div style={{ width: tamanho, display: "flex", flexDirection: "column", gap: 6 }}>
        <input type="range" min="0" max="100" value={Math.round(hsl.s)} aria-label="Intensidade"
          onChange={e => mudar({ ...hsl, s: Number(e.target.value) })} className="barra-brilho"
          style={barra(`linear-gradient(90deg, ${hslParaHex({ ...hsl, s: 0, l: lAnel })}, ${hslParaHex({ ...hsl, s: 100, l: lAnel })})`)} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={legenda}>Cinza</span>
          <span style={legenda}>Viva</span>
        </div>
      </div>
    </div>
  )
}
