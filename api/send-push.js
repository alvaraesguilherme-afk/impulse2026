import webPush from 'web-push'
import { supabase } from '../src/lib/supabase.js'
import { VAPID_PUBLIC_KEY } from '../src/lib/vapid-public-key.js'

webPush.setVapidDetails(
  'mailto:contato.bellabarrosss@gmail.com',
  VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

async function resolverConteudo(body) {
  const { tipo } = body

  if (tipo === 'aviso') {
    const { data } = await supabase.from('avisos').select('texto').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!data) return null
    return { title: '📢 Novo aviso do supervisor', body: data.texto.slice(0, 120), equipeId: null }
  }

  if (tipo === 'frase') {
    const { data } = await supabase.from('frase_do_dia').select('frase').eq('dia', body.dia).maybeSingle()
    if (!data) return null
    return { title: '✨ Frase do dia atualizada', body: data.frase.slice(0, 120), equipeId: null }
  }

  if (tipo === 'programacao') {
    const { data } = await supabase.from('programacao').select('titulo').eq('dia', body.dia).eq('turno', body.turno).eq('tipo', body.tipoProg).maybeSingle()
    if (!data) return null
    return { title: '📅 Programação atualizada', body: data.titulo.slice(0, 120), equipeId: null }
  }

  if (tipo === 'equipe') {
    const { data } = await supabase.from('mensagens_equipe').select('autor,texto').eq('equipe_id', body.equipeId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!data) return null
    return { title: '💬 Mensagem da sua equipe', body: `${data.autor}: ${data.texto}`.slice(0, 120), equipeId: body.equipeId || null }
  }

  if (tipo === 'lista_compras') {
    // Mesma lista de acesso da Lista de Compras em Home.jsx — manter sincronizado
    return { title: '🛒 Nova lista de compras', body: 'Uma nova lista de compras foi criada.', nomes: ['Linda', 'Arthur Bolzan', 'Alvarães', 'Pr. Júnior'] }
  }

  if (tipo === 'cadastro_area') {
    // Lider(es) de cada area que pode ser escolhida no cadastro (src/lib/areas.js AREAS_CADASTRO) — manter sincronizado
    const LIDER_POR_AREA = {
      '🙌 Apoio': ['Alvarães'],
      '🎥 Mídia': ['Alyson', 'Caetano'],
    }
    const areas = Array.isArray(body.areas) ? body.areas : []
    const nomes = [...new Set(areas.flatMap(a => LIDER_POR_AREA[a] || []))]
    if (nomes.length === 0) return null
    return { title: '📝 Novo cadastro aguardando aprovação', body: 'Um novo cadastro foi feito e está aguardando aprovação de acesso.', nomes }
  }

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const conteudo = await resolverConteudo(req.body || {})
  if (!conteudo) return res.status(200).json({ ok: true, enviados: 0 })

  let query = supabase.from('push_subscriptions').select('*')
  if (conteudo.equipeId) query = query.eq('equipe_id', conteudo.equipeId)
  else if (conteudo.nomes) query = query.in('nome', conteudo.nomes)
  const { data: subs } = await query
  const lista = subs || []

  const payload = JSON.stringify({ title: conteudo.title, body: conteudo.body, url: '/', tipo: req.body?.tipo })

  const resultados = await Promise.allSettled(
    lista.map(s =>
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
  return res.status(200).json({ ok: true, enviados, total: lista.length })
}
