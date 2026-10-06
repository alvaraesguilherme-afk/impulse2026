'use client'

import { salvarInscricao, removerInscricao } from '@/app/actions/config'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// Alguns navegadores deixam essas promessas pendentes pra sempre (Brave,
// Android sem Google, economia de bateria) — mesmo limite do ic-coordenacao.
function comLimite(promessa, ms) {
  return Promise.race([promessa, new Promise((_, rej) => setTimeout(() => rej(new Error('Demorou demais')), ms))])
}

export function suportaNotificacoes() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getStatusNotificacoes() {
  if (!suportaNotificacoes()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'default'
  try {
    const reg = await comLimite(navigator.serviceWorker.ready, 5000)
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'granted' : 'default'
  } catch {
    return 'default'
  }
}

export async function ativarNotificacoes(vapidKey) {
  if (!suportaNotificacoes()) return { ok: false, erro: 'Notificações não suportadas neste navegador.' }
  // A pergunta vem antes de qualquer await: no iPhone ela precisa estar "colada" no toque
  const permissao = await comLimite(Notification.requestPermission(), 120000)
  if (permissao !== 'granted') return { ok: false, erro: 'Permissão negada.' }
  try {
    const reg = await comLimite(navigator.serviceWorker.register('/sw.js'), 15000)
    await comLimite(navigator.serviceWorker.ready, 15000)
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await comLimite(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }), 20000)
    await salvarInscricao(sub.toJSON())
    return { ok: true }
  } catch {
    return { ok: false, erro: 'Não foi possível ativar agora. Tente de novo.' }
  }
}

// Reassocia a inscrição existente com quem está logado agora neste aparelho
export async function sincronizarInscricao() {
  if (!suportaNotificacoes() || Notification.permission !== 'granted') return
  try {
    const reg = await comLimite(navigator.serviceWorker.ready, 5000)
    const sub = await reg.pushManager.getSubscription()
    if (sub) await salvarInscricao(sub.toJSON())
  } catch { /* ignora */ }
}

export async function desativarNotificacoes() {
  if (!suportaNotificacoes()) return
  try {
    const reg = await comLimite(navigator.serviceWorker.ready, 5000)
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await removerInscricao(sub.endpoint)
    await sub.unsubscribe()
  } catch { /* ignora */ }
}
