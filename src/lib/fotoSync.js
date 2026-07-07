import { supabase } from './supabase'

const QUEUE_KEY = 'impulse_foto_queue'

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [] }
  catch { return [] }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64) {
  const [, dados] = base64.split(',')
  const bin = atob(dados)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

export function enqueueFotoPendente({ base64, arquivo, dia, autor, legenda }) {
  const queue = getQueue()
  queue.push({ base64, arquivo, dia, autor, legenda, ts: Date.now() })
  saveQueue(queue)
}

export function getFotoPendingCount() {
  return getQueue().length
}

export async function processFotoQueue() {
  const queue = getQueue()
  if (queue.length === 0) return 0
  const remaining = []
  let sincronizadas = 0
  for (const item of queue) {
    try {
      const blob = base64ToBlob(item.base64)
      const { error } = await supabase.storage.from('mural').upload(item.arquivo, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('mural').getPublicUrl(item.arquivo)
      const { error: insertError } = await supabase.from('mural_fotos').insert({
        dia: item.dia, url: urlData.publicUrl, arquivo: item.arquivo, autor: item.autor, legenda: item.legenda || null
      })
      if (insertError) throw insertError
      sincronizadas++
    } catch {
      remaining.push(item)
    }
  }
  saveQueue(remaining)
  return sincronizadas
}
