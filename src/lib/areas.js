export const AREAS = [
  '🙌 Apoio',
  '🎥 Mídia',
  '🍳 Cozinha',
  '🛒 Cantina',
  '📋 Secretário',
  '📅 Programação',
  '🎤 Preletores',
  '💡 Iluminação',
  '📦 Logística',
]

// Subconjunto oferecido no seletor de áreas do cadastro (Login.jsx) —
// Programação, Preletores e Iluminação ficam fora da escolha por pedido do Renato.
export const AREAS_CADASTRO = AREAS.filter(a => !['📅 Programação', '🎤 Preletores', '💡 Iluminação'].includes(a))
