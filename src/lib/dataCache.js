// Cache em memoria (sobrevive troca de tela dentro da mesma sessao do app,
// some no reload). Usado pra tela renderizar com o ultimo dado conhecido
// na hora (sem tela em branco) enquanto revalida em segundo plano, em vez
// de comecar toda vez do zero — telas remontam a cada navegacao em App.jsx
// ({tela === 'x' && <Componente />}), entao sem isso todo fetch reaparece
// vazio ate a resposta do Supabase chegar.
const cache = new Map()

export function getCache(key) {
  return cache.has(key) ? cache.get(key) : undefined
}

export function setCache(key, data) {
  cache.set(key, data)
}
