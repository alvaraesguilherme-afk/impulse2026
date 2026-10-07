// Cor de destaque livre ("Sua cor" nas Configurações). As 5 cores prontas
// vêm do globals.css ([data-accent="..."]); a personalizada não tem regra lá —
// os mesmos 6 tons são calculados a partir da cor escolhida e gravados direto
// no <html> como variáveis CSS.
export const CHAVE_COR = 'impulse_accent_hex'
export const ID_PERSONALIZADA = 'personalizada'

// Autocontida de propósito: o layout embute o código dela (toString) no script
// que roda antes da primeira pintura, então não pode usar nada de fora.
export function aplicarCorPersonalizada(hex) {
  var m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return
  var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  var mistura = function (p) {
    var c = function (v) { return Math.round(v + (255 - v) * p).toString(16).padStart(2, '0') }
    return '#' + c(r) + c(g) + c(b)
  }
  var rgba = function (a) { return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')' }
  var s = document.documentElement.style
  s.setProperty('--accent', '#' + m[1])
  s.setProperty('--accent-light', mistura(0.45))
  s.setProperty('--accent-secondary', mistura(0.2))
  s.setProperty('--accent-glow', rgba(0.3))
  s.setProperty('--accent-bg', rgba(0.15))
  s.setProperty('--accent-border', rgba(0.4))
}

export function limparCorPersonalizada() {
  var s = document.documentElement.style
  ;['--accent', '--accent-light', '--accent-secondary', '--accent-glow', '--accent-bg', '--accent-border'].forEach(function (v) { s.removeProperty(v) })
}
