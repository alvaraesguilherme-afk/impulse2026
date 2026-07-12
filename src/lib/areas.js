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
// só Apoio e Mídia têm entrada por autocadastro; as outras áreas não têm
// como uma pessoa nova entrar por conta própria, por pedido do Renato.
export const AREAS_CADASTRO = AREAS.filter(a => ['🙌 Apoio', '🎥 Mídia'].includes(a))
