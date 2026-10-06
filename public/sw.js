const CACHE_ESTATICO = 'escola-next-estatico-v1'
const CACHE_PAGINAS = 'escola-next-paginas-v1'
const CACHES = [CACHE_ESTATICO, CACHE_PAGINAS]

self.addEventListener('install', () => self.skipWaiting())

// Apaga os caches do app antigo (impulse2026-v7 etc.) ao trocar de versão
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !CACHES.includes(k)).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname === '/sair') return

  // Arquivos do build (nome muda a cada deploy) e imagens fixas: cache primeiro
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/mosaico/') || /\.(png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE_ESTATICO).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone())
          return res
        }))
      )
    )
    return
  }

  // Abrir uma tela: rede primeiro; sem sinal, a última versão guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok && !res.redirected) {
            const copia = res.clone()
            caches.open(CACHE_PAGINAS).then(c => c.put(req, copia))
          }
          return res
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    )
  }
})

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = {} }
  e.waitUntil(self.registration.showNotification(data.title || 'Escola Impulse', {
    body: data.body || '',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    tag: data.tipo || 'impulse-generic',
    data: { url: data.url || '/' },
  }))
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
