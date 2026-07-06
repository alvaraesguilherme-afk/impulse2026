import { syncOp } from './offlineSync'
import { getDeviceId } from './device'
import { EQUIPES } from './equipes'
import { VAPID_PUBLIC_KEY } from './vapid-public-key'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function detectarEquipe(nome) {
  if (!nome) return null
  const eq = EQUIPES.find(e =>
    e.membros.includes(nome) || e.lideres.split(' e ').map(l => l.trim()).includes(nome)
  )
  return eq ? eq.id : null
}

export function suportaNotificacoes() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function getStatusNotificacoes() {
  if (!suportaNotificacoes()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function ativarNotificacoes(sessao) {
  if (!suportaNotificacoes()) return { ok: false, erro: 'Notificações não suportadas neste navegador.' }

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return { ok: false, erro: 'Permissão negada.' }

  const registration = await navigator.serviceWorker.ready
  let sub = await registration.pushManager.getSubscription()
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const { endpoint, keys } = sub.toJSON()
  await syncOp('upsert', 'push_subscriptions', {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    nome: sessao?.nome ?? null,
    equipe_id: detectarEquipe(sessao?.nome),
    device_id: getDeviceId(),
  }, { onConflict: 'endpoint' })

  return { ok: true }
}

export function notificar(payload) {
  fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}

export async function desativarNotificacoes() {
  if (!suportaNotificacoes()) return
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  if (!sub) return
  await syncOp('delete', 'push_subscriptions', { endpoint: sub.endpoint })
  await sub.unsubscribe()
}
