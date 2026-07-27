const CACHE_NAME = 'impulse2026-v7'
const FONTS_CACHE = 'impulse2026-fonts-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png',
  '/favicon.svg',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Chamadas de API (ex: /api/send-push) e qualquer requisicao que nao seja GET
  // nunca devem passar pelo cache — deixa ir direto pra rede e falhar de verdade
  // se a rede estiver fora, em vez de mascarar o erro devolvendo uma pagina em cache.
  if (url.pathname.startsWith('/api/') || e.request.method !== 'GET') return

  // Fontes Google: cache-first — sem requisição de rede em visitas repetidas
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // Chamadas pra outros dominios (Supabase, etc): nunca cacheamos essas
  // respostas, entao nao ha nada útil pra devolver do cache aqui. Deixa
  // passar direto pro navegador tratar — senao "caches.match" sempre
  // retorna undefined e o service worker quebra com um erro pior do que
  // o proprio erro de rede (que o app ja sabe tratar).
  if (url.origin !== location.origin) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  )
})

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = {} }

  const options = {
    body: data.body || '',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    tag: data.tipo || 'impulse-generic',
    data: { url: data.url || '/' },
  }

  e.waitUntil(self.registration.showNotification(data.title || 'Impulse 2026', options))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus()
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
