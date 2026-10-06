'use client'

import { useState, useSyncExternalStore } from 'react'

const nada = () => () => {}

// false no servidor e na hidratação, true depois — pra ler data/hora local e
// localStorage sem divergir do HTML que veio do servidor.
export function useMontado() {
  return useSyncExternalStore(nada, () => true, () => false)
}

// Estado local que começa com o dado do servidor e é trocado quando o servidor
// manda um novo (depois de salvar, o revalidatePath re-renderiza a página).
// Entre uma coisa e outra, a tela pode mudar o estado na hora (otimista).
export function useEstadoServidor(valor, derivar) {
  const [origem, setOrigem] = useState(valor)
  const [estado, setEstado] = useState(() => (derivar ? derivar(valor) : valor))
  if (valor !== origem) {
    setOrigem(valor)
    setEstado(derivar ? derivar(valor) : valor)
  }
  return [estado, setEstado]
}

export function lerLocal(chave, padrao) {
  try { return localStorage.getItem(chave) ?? padrao } catch { return padrao }
}
