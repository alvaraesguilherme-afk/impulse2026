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

export function abaAdjacente(visiveis, atual, delta) {
  const idx = visiveis.indexOf(atual)
  const novoIdx = idx + delta
  if (novoIdx < 0 || novoIdx >= visiveis.length) return null
  return visiveis[novoIdx]
}

const SWIPE_MIN_PX = 50

export function useSwipeHandlers(onSwipeLeft, onSwipeRight) {
  const inicio = useRef({ x: 0, y: 0 })

  function onTouchStart(e) {
    inicio.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - inicio.current.x
    const dy = e.changedTouches[0].clientY - inicio.current.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0) onSwipeLeft()
    else onSwipeRight()
  }

  return { onTouchStart, onTouchEnd }
}
