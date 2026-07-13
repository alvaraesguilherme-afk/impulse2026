import webPush from 'web-push'
import { supabase } from '../src/lib/supabase.js'
import { VAPID_PUBLIC_KEY } from '../src/lib/vapid-public-key.js'

webPush.setVapidDetails(
  'mailto:contato.bellabarrosss@gmail.com',
  VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Mesma janela do Feed Impulse (src/components/Mural.jsx) — manter sincronizado
const MURAL_INICIO_DIA = 13
const MURAL_FIM_DIA = 27

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end()
  }

  const diaHoje = new Date().getUTCDate()
  if (diaHoje < MURAL_INICIO_DIA || diaHoje > MURAL_FIM_DIA) {
    return res.status(200).json({ ok: true, enviados: 0 })
  }

  const { data: fotosHoje } = await supabase.from('mural_fotos').select('autor').eq('dia', diaHoje)
  const postaram = new Set((fotosHoje || []).map(f => f.autor).filter(Boolean))

  const { data: subs } = await supabase.from('push_subscriptions').select('*').not('nome', 'is', null)
  const faltam = (subs || []).filter(s => !postaram.has(s.nome))

  if (faltam.length === 0) return res.status(200).json({ ok: true, enviados: 0 })

  const payload = JSON.stringify({
    title: '📸 Que tal salvar memórias?',
    body: 'Uma foto sua pra galera no Feed Impulse?',
    url: '/',
    tipo: 'lembrete_foto',
  })

  const resultados = await Promise.allSettled(
    faltam.map(s =>
      webPush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        .catch(async err => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id)
          }
          throw err
        })
    )
  )

  const enviados = resultados.filter(r => r.status === 'fulfilled').length
  return res.status(200).json({ ok: true, enviados, total: faltam.length })
}
