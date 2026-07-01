import { useState, useEffect, useRef } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'

const INICIO = new Date(2026, 6, 14)
const TOTAL_DIAS = 14
const DIAS = Array.from({ length: TOTAL_DIAS }, (_, i) => {
  const d = new Date(INICIO.getTime() + i * 86400000)
  return { num: d.getDate(), data: d, label: `${d.getDate()} Jul`, labelDia: `Dia ${i}` }
})

function getDiaAtual() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  if (diff >= 0 && diff < TOTAL_DIAS) return diff
  return 0
}

function comprimirImagem(file, maxKB = 500) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      const MAX = 1200
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      let quality = 0.8
      const tentar = () => {
        canvas.toBlob(blob => {
          if (blob.size > maxKB * 1024 && quality > 0.3) { quality -= 0.1; tentar() }
          else resolve(blob)
        }, 'image/jpeg', quality)
      }
      tentar()
    }
    img.src = url
  })
}

const MURAL_INICIO = new Date(2026, 6, 14)
const MURAL_FIM = new Date(2026, 6, 27)
const RECAP_INICIO = new Date(2026, 6, 28)
function isRecapDisponivel() { return new Date() >= RECAP_INICIO }

const STAFF_NOMES = [
  'Pr. Júnior','Pra. Stephanie',
  'Alvarães','Alyson','Caetano','Clara Cunha','Daniel','Danilo','Edson Jr.',
  'Eliel','Emanuel','Francisco','Gabriel Gomes','Gustavo Borges','Gustavo Massay',
  'Hadstton Capell','Hellen Borges','Hugo Lacroix','Isabely Matos','Jerônimo',
  'Jhony','Joel Marcos','Joyce','Juliana','Letícia','Linda','Lívia Andréa',
  'Lorena','Ludmyla','Maria Clara','Maria Júlia','Mariana Gabrielle',
  'Matheus Almeida','Maurício','Nicoly','Paula','Rafael Chaves','Rennan',
  'Ryan Guedes','Samuel Lopes','Stephany','Taiwa','Victória','Walterley'
]

const MOSAICO_GLOB = import.meta.glob('/src/assets/mosaico/*.{jpg,jpeg,jfif,png,webp,JPG,JPEG,JFIF,PNG,WEBP}', { eager: true })
const MOSAICO_FOTOS = Object.values(MOSAICO_GLOB).map(m => m.default)

const COLUNAS_MOSAICO = 3
function buildMosaico(fotos) {
  if (!fotos.length) return []
  const alvo = 180 // múltiplo de 3 pra fechar igualmente as colunas
  // distMin >= alvo/3 garante que a mesma foto nunca cai na mesma linha visual
  const distMin = Math.max(Math.ceil(alvo / COLUNAS_MOSAICO), fotos.length)
  const result = []
  const ultimaPos = new Array(fotos.length).fill(-distMin - 1)

  while (result.length < alvo) {
    const pos = result.length
    let candidatos = fotos
      .map((f, i) => ({ f, i }))
      .filter(({ i }) => pos - ultimaPos[i] >= distMin)
    if (candidatos.length === 0) {
      // sem candidatos ideais: pega os 20% mais antigos para manter variedade
      candidatos = fotos
        .map((f, i) => ({ f, i }))
        .sort((a, b) => ultimaPos[a.i] - ultimaPos[b.i])
        .slice(0, Math.max(1, Math.ceil(fotos.length * 0.2)))
    }
    const { f, i } = candidatos[Math.floor(Math.random() * candidatos.length)]
    result.push(f)
    ultimaPos[i] = pos
  }

  return result
}
const MOSAICO_TILES = buildMosaico(MOSAICO_FOTOS)

function podeMuralPostar() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  return hj >= MURAL_INICIO && hj <= MURAL_FIM
}

export default function Mural({ onVoltar, autor, onAjuda }) {
  const tx = useTexto()
  const [diaSel, setDiaSel] = useState(getDiaAtual)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fotoAberta, setFotoAberta] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [curtidas, setCurtidas] = useState(() => {
    const set = new Set()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('curtiu_')) set.add(k.replace('curtiu_', ''))
    }
    return set
  })
  const [filtroAutor, setFiltroAutor] = useState('')
  const [todosOsDias, setTodosOsDias] = useState(false)
  const [modoRecap, setModoRecap] = useState(false)
  const [modoTeste, setModoTeste] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreview, setPendingPreview] = useState(null)
  const [pendingLegenda, setPendingLegenda] = useState('')
  const [showLegendaModal, setShowLegendaModal] = useState(false)
  const inputGaleria = useRef(null)
  const inputCamera = useRef(null)

  useEffect(() => { carregarFotos(diaSel, todosOsDias, filtroAutor, modoRecap) }, [diaSel, todosOsDias, filtroAutor, modoRecap])

  useEffect(() => {
    if (fotoAberta) {
      document.body.classList.add('foto-aberta')
    } else {
      document.body.classList.remove('foto-aberta')
    }
    return () => document.body.classList.remove('foto-aberta')
  }, [fotoAberta])

  async function carregarFotos(diaIdx = diaSel, todos = todosOsDias, autorFiltro = filtroAutor, recap = modoRecap) {
    setLoading(true)
    let query = supabase.from('mural_fotos').select('*')
    if (recap) {
      query = query.order('curtidas', { ascending: false }).limit(30)
    } else if (todos && autorFiltro) {
      query = query.eq('autor', autorFiltro).order('created_at', { ascending: false })
    } else {
      query = query.eq('dia', DIAS[diaIdx].num).order('created_at', { ascending: false })
    }
    const { data } = await query
    setFotos(data || [])
    setLoading(false)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const previewUrl = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingPreview(previewUrl)
    setPendingLegenda('')
    setShowLegendaModal(true)
  }

  function publicarFoto() {
    if (!pendingFile) return
    setShowLegendaModal(false)
    const file = pendingFile
    const legenda = pendingLegenda.trim()
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setPendingLegenda('')
    uploadFoto(file, autor || 'Anônimo', legenda)
  }

  function cancelarUpload() {
    setShowLegendaModal(false)
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setPendingLegenda('')
  }

  async function uploadFoto(file, autorNome, legenda) {
    setUploading(true)
    try {
      const blob = await comprimirImagem(file)
      const nome = `dia${DIAS[diaSel].num}_${Date.now()}.jpg`
      const { error } = await supabase.storage.from('mural').upload(nome, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('mural').getPublicUrl(nome)
      await supabase.from('mural_fotos').insert({ dia: DIAS[diaSel].num, url: urlData.publicUrl, arquivo: nome, autor: autorNome, legenda: legenda || null })
      await carregarFotos()
    } catch (err) {
      console.error('Erro no upload:', err)
    }
    setUploading(false)
  }

  async function deletarFoto(foto) {
    setFotoAberta(null)
    setConfirmDelete(false)
    setFotos(prev => prev.filter(f => f.id !== foto.id))
    await Promise.all([
      supabase.storage.from('mural').remove([foto.arquivo]),
      supabase.from('mural_fotos').delete().eq('id', foto.id)
    ])
  }

  async function curtirFoto(foto) {
    const id = String(foto.id)
    const jaCurtiu = curtidas.has(id)
    const novas = jaCurtiu
      ? Math.max(0, (foto.curtidas || 0) - 1)
      : (foto.curtidas || 0) + 1
    await supabase.from('mural_fotos').update({ curtidas: novas }).eq('id', foto.id)
    if (jaCurtiu) {
      localStorage.removeItem(`curtiu_${id}`)
      setCurtidas(prev => { const s = new Set(prev); s.delete(id); return s })
    } else {
      localStorage.setItem(`curtiu_${id}`, '1')
      setCurtidas(prev => new Set([...prev, id]))
    }
    setFotos(prev => prev.map(f => f.id === foto.id ? { ...f, curtidas: novas } : f))
    if (fotoAberta?.id === foto.id) setFotoAberta(prev => ({ ...prev, curtidas: novas }))
  }

  const SUPERVISORES = ['Alvarães', 'Danilo', 'Caetano', 'Alyson', 'Paula', 'Eliel', 'Edson', 'Pr. Júnior', 'Pra. Stephanie']
  const podeDeletar = fotoAberta && (fotoAberta.autor === autor || SUPERVISORES.includes(autor))

  const fotosExibidas = (!todosOsDias && filtroAutor)
    ? fotos.filter(f => f.autor === filtroAutor)
    : fotos

  const autoresUnicos = [...new Set(fotos.map(f => f.autor).filter(Boolean))]

  return (
    <div style={{ background: '#05051a', minHeight: '100vh', position: 'relative' }}>
      {MOSAICO_FOTOS.length > 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          columnCount: 3, columnGap: 3, zIndex: 0
        }}>
          {MOSAICO_TILES.map((src, i) => (
            <img key={i} src={src} alt="" loading={i < 9 ? 'eager' : 'lazy'} decoding="async" style={{ width: '100%', display: 'block', marginBottom: 3, breakInside: 'avoid' }} />
          ))}
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10000px', background: 'rgba(5,5,20,0.70)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'rgba(8,8,20,0.88)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{tx.feedImpulse}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {autor && (
            <div style={{ padding: '4px 10px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', color: 'var(--accent-light)', fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{autor}</div>
          )}
          {onAjuda && (
            <button onClick={onAjuda} style={{ width: 32, height: 32, background: 'rgba(8,8,20,0.88)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700 }}>?</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {filtroAutor && (
          <button onClick={() => setTodosOsDias(true)} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 16,
            border: todosOsDias ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.2)',
            background: todosOsDias ? 'var(--accent-bg)' : 'rgba(8,8,20,0.88)',
            color: todosOsDias ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>📅 Todos</span>
            <span style={{ fontSize: 9, opacity: 0.65 }}>os dias</span>
          </button>
        )}
        {DIAS.map((d, i) => (
          <button key={i} onClick={() => { setDiaSel(i); setTodosOsDias(false); setModoRecap(false) }} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 16,
            border: !todosOsDias && !modoRecap && diaSel === i ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.2)',
            background: !todosOsDias && !modoRecap && diaSel === i ? 'var(--accent-bg)' : 'rgba(8,8,20,0.88)',
            color: !todosOsDias && !modoRecap && diaSel === i ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{d.label}</span>
            <span style={{ fontSize: 9, opacity: 0.65 }}>{d.labelDia}</span>
          </button>
        ))}
        {isRecapDisponivel() && (
          <button onClick={() => { setModoRecap(true); setTodosOsDias(false); setFiltroAutor('') }} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 16,
            border: modoRecap ? '1px solid #FFD700' : '1px solid rgba(255,215,0,0.35)',
            background: modoRecap ? 'rgba(255,215,0,0.18)' : 'rgba(8,8,20,0.88)',
            color: modoRecap ? '#FFD700' : 'rgba(255,215,0,0.7)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>🏆 Recap</span>
            <span style={{ fontSize: 9, opacity: 0.8 }}>Top 30</span>
          </button>
        )}
      </div>

      {!modoRecap && (podeMuralPostar() || modoTeste) ? (
        <div style={{ display: 'flex', gap: 10, padding: '0 22px 16px' }}>
          <button onClick={() => inputGaleria.current?.click()} disabled={uploading} style={{
            flex: 1, padding: '14px', borderRadius: 16, border: '1px solid var(--border-strong)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: uploading ? 0.5 : 1, fontFamily: 'Inter, sans-serif'
          }}>🖼️ Galeria</button>
          <button onClick={() => inputCamera.current?.click()} disabled={uploading} style={{
            flex: 1, padding: '14px', borderRadius: 16, border: '1px solid var(--accent-border)',
            background: 'var(--accent-bg)', color: 'var(--accent-light)',
            fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: uploading ? 0.5 : 1, fontFamily: 'Inter, sans-serif'
          }}>📷 Câmera</button>
          <input ref={inputGaleria} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
          <input ref={inputCamera} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>
      ) : !modoRecap ? (
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(8,8,20,0.88)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
            📷 {tx.uploadDisponivel}
          </div>
          {autor === 'Alvarães' && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => setModoTeste(true)} style={{
                background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline'
              }}>🔓 Liberar postagem</button>
            </div>
          )}
        </div>
      )}

      {!modoRecap && uploading && (
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', borderRadius: 14, padding: '12px', fontSize: 13, color: 'var(--accent-light)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #C4B5FD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Enviando foto...
          </div>
        </div>
      )}

      {!modoRecap && (autor || autoresUnicos.length > 1) && (
        <div style={{ display: 'flex', gap: 6, padding: '0 22px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => { setFiltroAutor(''); setTodosOsDias(false) }} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            border: !filtroAutor ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.2)',
            background: !filtroAutor ? 'var(--accent-bg)' : 'rgba(8,8,20,0.88)',
            color: !filtroAutor ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif'
          }}>{tx.todos}</button>
          {autor && (
            <button onClick={() => { setFiltroAutor(autor); setTodosOsDias(false) }} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              border: filtroAutor === autor ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.2)',
              background: filtroAutor === autor ? 'var(--accent-bg)' : 'rgba(8,8,20,0.88)',
              color: filtroAutor === autor ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif'
            }}>👤 Minhas</button>
          )}
          {autoresUnicos.filter(a => a !== autor).map(a => (
            <button key={a} onClick={() => { setFiltroAutor(a); setTodosOsDias(false) }} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              border: filtroAutor === a ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.2)',
              background: filtroAutor === a ? 'var(--accent-bg)' : 'rgba(8,8,20,0.88)',
              color: filtroAutor === a ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif'
            }}>{a}</button>
          ))}
        </div>
      )}

      {modoRecap ? (
        <div style={{ padding: '0 16px 100px' }}>
          <div style={{ textAlign: 'center', padding: '18px 0 28px' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🏆</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 21, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Top 30 do Impulso 2026</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.4 }}>as fotos mais curtidas do evento</div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Carregando...</div>
          ) : fotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 22px', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Nenhuma foto ainda</div>
          ) : (
            <>
              {fotos[0] && (
                <div className="recap-card" style={{ animationDelay: '0s', position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: 8, cursor: 'pointer', border: '2px solid #FFD700', boxShadow: '0 0 28px rgba(255,215,0,0.25)' }} onClick={() => { setFotoAberta(fotos[0]); setConfirmDelete(false) }}>
                  <img src={fotos[0].url} alt="" loading="eager" style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 10, left: 10, background: '#FFD700', borderRadius: 10, padding: '4px 10px', fontSize: 12, fontWeight: 800, color: '#000', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>🥇 #1</div>
                  <div style={{ padding: '10px 14px', background: 'linear-gradient(0deg,rgba(0,0,0,0.85),rgba(0,0,0,0.4))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        {fotos[0].legenda && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>{fotos[0].legenda}</div>}
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{fotos[0].autor}</div>
                      </div>
                      <div style={{ fontSize: 15, color: '#FFD700', fontWeight: 800 }}>❤️ {fotos[0].curtidas || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              {fotos.slice(1, 3).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  {fotos.slice(1, 3).map((foto, i) => {
                    const MEDALS = ['🥈', '🥉']
                    const CORES = ['#C0C0C0', '#CD7F32']
                    return (
                      <div key={foto.id} className="recap-card" style={{ animationDelay: `${(i + 1) * 0.09}s`, position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${CORES[i]}`, boxShadow: `0 0 16px ${CORES[i]}55` }} onClick={() => { setFotoAberta(foto); setConfirmDelete(false) }}>
                        <img src={foto.url} alt="" loading="eager" style={{ width: '100%', display: 'block', height: 150, objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: 7, left: 7, background: CORES[i], borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 800, color: '#000' }}>{MEDALS[i]} #{i + 2}</div>
                        <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.7)' }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 2 }}>{foto.autor}</div>
                          <div style={{ fontSize: 11, color: CORES[i], fontWeight: 800 }}>❤️ {foto.curtidas || 0}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {fotos.slice(3).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {fotos.slice(3).map((foto, i) => (
                    <div key={foto.id} className="recap-card" style={{ animationDelay: `${(i + 3) * 0.05}s`, position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => { setFotoAberta(foto); setConfirmDelete(false) }}>
                      <img src={foto.url} alt="" loading="lazy" style={{ width: '100%', display: 'block' }} />
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.72)', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.85)' }}>#{i + 4}</div>
                      <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.65)' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{foto.autor}</div>
                        <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.9)', fontWeight: 700 }}>❤️ {foto.curtidas || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div style={{ padding: '0 22px 12px', fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            {loading ? 'Carregando...' : `${fotosExibidas.length} foto${fotosExibidas.length !== 1 ? 's' : ''}${filtroAutor ? ` · ${filtroAutor}${todosOsDias ? ' · todos os dias' : ` · ${DIAS[diaSel].labelDia}`}` : ` · ${DIAS[diaSel].labelDia}`}`}
          </div>

          {!loading && fotosExibidas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 22px' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.85 }}>📷</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{tx.nenhumaFoto}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>Seja o primeiro a postar em {DIAS[diaSel].label}!</div>
            </div>
          )}

          <div style={{ padding: '0 22px 100px', columnCount: 2, columnGap: 8 }}>
            {fotosExibidas.map(foto => (
              <div key={foto.id} onClick={() => (setFotoAberta(foto), setConfirmDelete(false))} style={{
                breakInside: 'avoid', marginBottom: 8, borderRadius: 14, overflow: 'hidden',
                cursor: 'pointer', position: 'relative',
                border: '1px solid var(--border)', background: 'var(--bg-card)'
              }}>
                <img src={foto.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block' }} />
                <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 4 }}>
                    {foto.legenda && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{foto.legenda}</div>}
                    {foto.autor && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 1 }}>{foto.autor}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                      {new Date(foto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); curtirFoto(foto) }} className="btn-curtida" style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 4px', flexShrink: 0
                  }}>
                    <span style={{ fontSize: 22 }}>{curtidas.has(String(foto.id)) ? '❤️' : '🤍'}</span>
                    {(foto.curtidas || 0) > 0 && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 700 }}>{foto.curtidas}</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {fotoAberta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
          {/* Cabeçalho fixo — botão fechar sempre visível */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px 0', flexShrink: 0 }}>
            <button onClick={() => { setFotoAberta(null); setConfirmDelete(false) }} style={{
              width: 36, height: 36, background: 'rgba(255,255,255,0.1)', borderRadius: 12,
              border: 'none', color: 'white', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>✕</button>
          </div>

          {/* Corpo scrollável */}
          <div onClick={() => { setFotoAberta(null); setConfirmDelete(false) }} style={{
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '12px 20px 48px', gap: 12
          }}>
            <img src={fotoAberta.url} alt="" decoding="async" onClick={e => e.stopPropagation()} style={{
              maxWidth: '100%', maxHeight: '60vh', borderRadius: 12, objectFit: 'contain'
            }} />

            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
              {fotoAberta.autor && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  📸 {fotoAberta.autor}
                </div>
              )}
              <button onClick={() => curtirFoto(fotoAberta)} className="btn-curtida" style={{
                marginLeft: 'auto', background: curtidas.has(String(fotoAberta.id)) ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                border: curtidas.has(String(fotoAberta.id)) ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 14, padding: '12px 22px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                color: 'white', fontSize: 18, fontWeight: 600, fontFamily: 'Inter, sans-serif'
              }}>
                <span style={{ fontSize: 22 }}>{curtidas.has(String(fotoAberta.id)) ? '❤️' : '🤍'}</span>
                <span>{fotoAberta.curtidas || 0}</span>
              </button>
            </div>

            {fotoAberta.legenda && (
              <div onClick={e => e.stopPropagation()} style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                {fotoAberta.legenda}
              </div>
            )}

            {podeDeletar && (
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 12 }}>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} style={{
                    padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.15)', color: '#F87171',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                  }}>🗑️ Excluir</button>
                ) : (
                  <>
                    <button onClick={() => deletarFoto(fotoAberta)} style={{
                      padding: '10px 20px', borderRadius: 14, border: 'none',
                      background: '#EF4444', color: 'white',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                    }}>{tx.confirmarExclusao}</button>
                    <button onClick={() => setConfirmDelete(false)} style={{
                      padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.08)', color: 'white',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                    }}>{tx.cancelar}</button>
                  </>
                )}
              </div>
            )}

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {DIAS[diaSel].labelDia} · {new Date(fotoAberta.created_at).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      )}

      </div>

      {showLegendaModal && pendingPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ width: '100%', maxWidth: 340, background: 'rgba(8,8,20,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', textAlign: 'center' }}>Nova foto</div>
            <img src={pendingPreview} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 220, objectFit: 'cover' }} />
            <textarea
              value={pendingLegenda}
              onChange={e => setPendingLegenda(e.target.value)}
              placeholder="Adicione uma legenda... (opcional)"
              maxLength={200}
              rows={3}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, fontSize: 13, color: '#fff', outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
            />
            <button onClick={publicarFoto} style={{ padding: 14, background: 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', fontFamily: 'Syne, sans-serif' }}>
              Publicar
            </button>
            <button onClick={cancelarUpload} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
