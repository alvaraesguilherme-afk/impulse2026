export const EQUIPES = [
  { id: 'verde', nome: 'Equipe Verde', lideres: '', membros: [], offset: 0, cor: '#4ADE80', grad: 'linear-gradient(135deg,#14532D,#16A34A)', emoji: '♣' },
  { id: 'amarelo', nome: 'Equipe Amarelo', lideres: '', membros: [], offset: 1, cor: '#FCD34D', grad: 'linear-gradient(135deg,#78350F,#F59E0B)', emoji: '♦' },
  { id: 'azul', nome: 'Equipe Azul', lideres: '', membros: [], offset: 2, cor: '#60A5FA', grad: 'linear-gradient(135deg,#0C4A6E,#0EA5E9)', emoji: '♠' },
  { id: 'vermelho', nome: 'Equipe Vermelho', lideres: '', membros: [], offset: 3, cor: '#F87171', grad: 'linear-gradient(135deg,#7F1D1D,#EF4444)', emoji: '♥' },
]

// eq.lideres guarda "Nome e Nome" (2 lideres por equipe) ou '' quando ainda
// nao foi reatribuido (pos-reset) -- usar sempre isso em vez de eq.lideres.split
// direto, senao '' vira [''] e aparece um lider fantasma de nome vazio.
export function lideresDe(eq) {
  return eq.lideres ? eq.lideres.split(' e ').map(l => l.trim()) : []
}
