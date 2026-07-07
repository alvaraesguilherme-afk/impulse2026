import { supabase } from './supabase'

const QUEUE_KEY = 'impulse_offline_queue'
const TIMEOUT_MS = 8000

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [] }
  catch { return [] }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

async function executarOp(type, table, data, options) {
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  let result
  if (type === 'upsert') {
    result = await supabase.from(table).upsert(data, options).abortSignal(signal)
  } else if (type === 'insert') {
    result = await supabase.from(table).insert(data).abortSignal(signal)
  } else if (type === 'update') {
    let q = supabase.from(table).update(data.values)
    for (const [k, v] of Object.entries(data.filters)) q = q.eq(k, v)
    result = await q.abortSignal(signal)
  } else if (type === 'delete') {
    let q = supabase.from(table).delete()
    for (const [k, v] of Object.entries(data)) q = q.eq(k, v)
    result = await q.abortSignal(signal)
  }
  if (result?.error) throw result.error
}

export async function syncOp(type, table, data, options) {
  try {
    await executarOp(type, table, data, options)
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
      await executarOp(op.type, op.table, op.data, op.options)
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
