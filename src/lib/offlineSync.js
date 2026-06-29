import { supabase } from './supabase'

const QUEUE_KEY = 'impulse_offline_queue'

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [] }
  catch { return [] }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function syncOp(type, table, data, options) {
  try {
    let result
    if (type === 'upsert') {
      result = await supabase.from(table).upsert(data, options)
    } else if (type === 'insert') {
      result = await supabase.from(table).insert(data)
    } else if (type === 'update') {
      let q = supabase.from(table).update(data.values)
      for (const [k, v] of Object.entries(data.filters)) q = q.eq(k, v)
      result = await q
    } else if (type === 'delete') {
      let q = supabase.from(table).delete()
      for (const [k, v] of Object.entries(data)) q = q.eq(k, v)
      result = await q
    }
    if (result?.error) throw result.error
    return true
  } catch {
    addToQueue({ type, table, data, options })
    return false
  }
}

function addToQueue(op) {
  const queue = getQueue()
  queue.push({ ...op, ts: Date.now() })
  saveQueue(queue)
}

export async function processQueue() {
  const queue = getQueue()
  if (queue.length === 0) return 0
  const remaining = []
  for (const op of queue) {
    try {
      let result
      if (op.type === 'upsert') {
        result = await supabase.from(op.table).upsert(op.data, op.options)
      } else if (op.type === 'insert') {
        result = await supabase.from(op.table).insert(op.data)
      } else if (op.type === 'update') {
        let q = supabase.from(op.table).update(op.data.values)
        for (const [k, v] of Object.entries(op.data.filters)) q = q.eq(k, v)
        result = await q
      } else if (op.type === 'delete') {
        let q = supabase.from(op.table).delete()
        for (const [k, v] of Object.entries(op.data)) q = q.eq(k, v)
        result = await q
      }
      if (result?.error) throw result.error
    } catch {
      remaining.push(op)
    }
  }
  saveQueue(remaining)
  return queue.length - remaining.length
}

export function getPendingCount() {
  return getQueue().length
}

export function initSync() {
  window.addEventListener('online', async () => {
    const synced = await processQueue()
    if (synced > 0) console.log(`Sincronizados ${synced} registros`)
  })
  if (navigator.onLine) processQueue()
}
