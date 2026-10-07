// Ícone do turno nas escalas: Manhã e Tarde (dia) e Noite usam os ícones do
// tema claro/escuro das Configurações; a Folga tem ícone próprio.
const IMAGEM_TURNO = { M: '/icons/config-tema-claro.png', T: '/icons/config-tema-claro.png', N: '/icons/config-tema-escuro.png', F: '/icons/folga.png' }

export function IconeTurno({ id, emoji, tamanho = 20 }) {
  const src = IMAGEM_TURNO[id]
  if (!src) return <span style={{ fontSize: tamanho - 2 }}>{emoji}</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: tamanho, height: tamanho, objectFit: 'contain', flexShrink: 0 }} />
}
