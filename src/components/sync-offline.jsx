'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { processarFila } from '@/lib/offline'
import { processarFotos } from '@/lib/fotos-offline'

// Reenvia o que ficou guardado sem sinal assim que a conexão volta (e ao abrir)
export function SyncOffline() {
  const router = useRouter()
  useEffect(() => {
    async function sincronizar() {
      const n = (await processarFila()) + (await processarFotos())
      if (n > 0) router.refresh()
    }
    sincronizar()
    window.addEventListener('online', sincronizar)
    return () => window.removeEventListener('online', sincronizar)
  }, [router])
  return null
}
