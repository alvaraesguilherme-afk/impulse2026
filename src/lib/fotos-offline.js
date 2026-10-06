'use client'

import { enviarFoto } from '@/app/actions/mural'

// Fotos que não subiram por falta de sinal ficam guardadas no aparelho
// (IndexedDB — cabe muito mais que o localStorage) e sobem sozinhas quando
// a conexão volta.
const DB = 'impulse_fotos'
const STORE = 'pendentes'

function abrir() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'arquivo' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(modo, fn) {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, modo)
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(r?.result)
    t.onerror = () => reject(t.error)
  })
}

export function guardarFoto({ blob, arquivo, legenda }) {
  return tx('readwrite', s => s.put({ blob, arquivo, legenda }))
}

export async function contarFotos() {
  try { return await tx('readonly', s => s.count()) } catch { return 0 }
}

export function montarForm({ blob, arquivo, legenda }) {
  const fd = new FormData()
  fd.append('foto', blob, arquivo)
  fd.append('arquivo', arquivo)
  fd.append('legenda', legenda || '')
  return fd
}

let processando = false

export async function processarFotos() {
  if (processando || !navigator.onLine) return 0
  processando = true
  let enviadas = 0
  try {
    const itens = await tx('readonly', s => s.getAll())
    for (const item of itens || []) {
      try {
        await enviarFoto(montarForm(item))
        await tx('readwrite', s => s.delete(item.arquivo))
        enviadas++
      } catch (e) {
        // Erro que não é de rede (ex.: Feed fechado): descarta pra não travar a fila
        if (!(e instanceof TypeError)) await tx('readwrite', s => s.delete(item.arquivo))
      }
    }
  } catch { /* IndexedDB indisponível */ }
  finally { processando = false }
  window.dispatchEvent(new Event('impulse-fila'))
  return enviadas
}
