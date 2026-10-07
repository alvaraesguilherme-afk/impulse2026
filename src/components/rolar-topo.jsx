'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

// Toda troca de tela abre no topo. O Next só rola quando acha que o começo da
// página nova está fora da tela, e em várias telas isso falhava (abria no meio).
export function RolarProTopo() {
  const caminho = usePathname()
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [caminho])
  return null
}
