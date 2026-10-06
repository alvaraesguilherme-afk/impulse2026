'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { IdiomaContext } from '@/lib/i18n'
import { useMontado, lerLocal } from '@/lib/hooks'

const PreferenciasContext = createContext(null)

// Idioma e tema ficam no aparelho (localStorage), como no app antigo. O tema
// já é aplicado antes da pintura pelo script do layout; aqui só mantém o
// estado sincronizado pra tela de Config. Também registra o service worker.
export function Preferencias({ children }) {
  const montado = useMontado()
  const [idiomaEscolhido, setIdiomaState] = useState(null)
  const [temaEscolhido, setTemaState] = useState(null)
  const idioma = idiomaEscolhido ?? (montado ? lerLocal('impulse_idioma', 'pt-BR') : 'pt-BR')
  const tema = temaEscolhido ?? (montado ? lerLocal('tema', 'dark') : 'dark')

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // Em dev o cache do sw devolvia arquivos velhos do /_next/static (o nome não
    // muda a cada edição) e a tela voltava sem as mudanças ao sair e entrar.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {})
      if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {})
      return
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  function setIdioma(i) {
    setIdiomaState(i)
    try { localStorage.setItem('impulse_idioma', i) } catch { /* ignora */ }
  }

  function setTema(t) {
    setTemaState(t)
    try { localStorage.setItem('tema', t) } catch { /* ignora */ }
    document.documentElement.setAttribute('data-theme', t)
  }

  return (
    <PreferenciasContext.Provider value={{ idioma, setIdioma, tema, setTema }}>
      <IdiomaContext.Provider value={idioma}>{children}</IdiomaContext.Provider>
    </PreferenciasContext.Provider>
  )
}

export function usePreferencias() {
  return useContext(PreferenciasContext)
}
