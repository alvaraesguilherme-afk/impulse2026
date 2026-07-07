import { useEffect, useRef, useState } from 'react'

export const DURACAO_TRANSICAO_MS = 2000

export function useAbaDirecao(inicial, ordem, duracaoMs = DURACAO_TRANSICAO_MS) {
  const [aba, setAbaState] = useState(inicial)
  const [abaSaindo, setAbaSaindo] = useState(null)
  const direcaoRef = useRef('direita')
  const timeoutRef = useRef(null)

  function setAba(novaAba) {
    setAbaState(atual => {
      if (novaAba === atual) return atual
      const idxAtual = ordem.indexOf(atual)
      const idxNova = ordem.indexOf(novaAba)
      direcaoRef.current = idxNova >= idxAtual ? 'direita' : 'esquerda'
      setAbaSaindo(atual)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setAbaSaindo(null), duracaoMs)
      return novaAba
    })
  }

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  return [aba, setAba, direcaoRef, abaSaindo]
}
