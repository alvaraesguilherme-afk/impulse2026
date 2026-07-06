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

export async function getStatusNotificacoes() {
  if (!suportaNotificacoes()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'default'
  // Permissão concedida não significa inscrito — checar se existe inscrição de push ativa de verdade
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  return sub ? 'granted' : 'default'
}

async function salvarInscricao(sub, sessao) {
  const { endpoint, keys } = sub.toJSON()
  await syncOp('upsert', 'push_subscriptions', {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    nome: sessao?.nome ?? null,
    equipe_id: detectarEquipe(sessao?.nome),
    device_id: getDeviceId(),
  }, { onConflict: 'endpoint' })
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

  await salvarInscricao(sub, sessao)
  return { ok: true }
}

// Re-associa a inscricao ja existente com quem esta logado agora neste
// aparelho — necessario porque o mesmo navegador/aparelho pode ser
// usado por pessoas diferentes ao longo do tempo, e a permissao do
// navegador (uma vez concedida) nao pede de novo, entao sem isso o
// registro ficaria preso no nome/equipe de quem ativou primeiro.
export async function sincronizarInscricao(sessao) {
  if (!suportaNotificacoes()) return
  if (Notification.permission !== 'granted') return
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  if (!sub) return
  await salvarInscricao(sub, sessao)
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
