import { useState, useEffect, useRef } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'

const INICIO = new Date(2026, 6, 15)
const TOTAL_DIAS = 11
const DIAS = Array.from({ length: TOTAL_DIAS }, (_, i) => {
  const d = new Date(INICIO.getTime() + i * 86400000)
  return { num: i + 1, data: d, label: `${d.getDate()} Jul` }
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

const SENHA_COORD = '1932'
const MURAL_INICIO = new Date(2026, 6, 14)
const MURAL_FIM = new Date(2026, 6, 27)

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

function buildMosaico(fotos) {
  if (!fotos.length) return []
  const alvo = Math.min(Math.max(fotos.length, 36), 150)
  const result = []
  while (result.length < alvo) {
    const embaralhado = [...fotos].sort(() => Math.random() - 0.5)
    result.push(...embaralhado)
  }
  return result.slice(0, alvo)
}
const MOSAICO_TILES = buildMosaico(MOSAICO_FOTOS)

function podeMuralPostar() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  return hj >= MURAL_INICIO && hj <= MURAL_FIM
}

export default function Mural({ onVoltar }) {
  const tx = useTexto()
  const [diaSel, setDiaSel] = useState(getDiaAtual)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fotoAberta, setFotoAberta] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [modoSelecao, setModoSelecao] = useState(false)
  const [selecionadas, setSelecionadas] = useState([])
  const [showSenhaSelecao, setShowSenhaSelecao] = useState(false)
  const [senhaSelecao, setSenhaSelecao] = useState('')
  const [senhaSelecaoErro, setSenhaSelecaoErro] = useState('')
  const [jaTemVotacao, setJaTemVotacao] = useState(false)
  const [showNomePicker, setShowNomePicker] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [autorSelecionado, setAutorSelecionado] = useState(() => localStorage.getItem('mural_autor') || '')
  const [filtroAutor, setFiltroAutor] = useState('')
  const [modoTeste, setModoTeste] = useState(false)
  const [showSenhaTeste, setShowSenhaTeste] = useState(false)
  const [senhaTeste, setSenhaTeste] = useState('')
  const [senhaTesteErro, setSenhaTesteErro] = useState('')
  const inputGaleria = useRef(null)
  const inputCamera = useRef(null)
  const parallaxRef = useRef(null)
  const [mosaicoAltura, setMosaicoAltura] = useState(0)

  useEffect(() => { carregarFotos(); checarVotacao() }, [diaSel])

  useEffect(() => {
    function onScroll() {
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translateY(${window.scrollY * 0.25}px)`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function medirAltura() {
    if (parallaxRef.current) {
      const h = parallaxRef.current.offsetHeight
      if (h > 0) setMosaicoAltura(h)
    }
  }

  async function carregarFotos() {
    setLoading(true)
    const { data } = await supabase
      .from('mural_fotos')
      .select('*')
      .eq('dia', DIAS[diaSel].num)
      .order('created_at', { ascending: false })
    setFotos(data || [])
    setLoading(false)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (autorSelecionado) {
      uploadFoto(file, autorSelecionado)
    } else {
      setPendingFile(file)
      setShowNomePicker(true)
    }
  }

  function confirmarAutor(nome) {
    setAutorSelecionado(nome)
    localStorage.setItem('mural_autor', nome)
    setShowNomePicker(false)
    if (pendingFile) {
      uploadFoto(pendingFile, nome)
      setPendingFile(null)
    }
  }

  async function uploadFoto(file, autor) {
    setUploading(true)
    try {
      const blob = await comprimirImagem(file)
      const nome = `dia${DIAS[diaSel].num}_${Date.now()}.jpg`
      const { error } = await supabase.storage.from('mural').upload(nome, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('mural').getPublicUrl(nome)
      await supabase.from('mural_fotos').insert({ dia: DIAS[diaSel].num, url: urlData.publicUrl, arquivo: nome, autor })
      await carregarFotos()
    } catch (err) {
      console.error('Erro no upload:', err)
    }
    setUploading(false)
  }

  async function checarVotacao() {
    const { data } = await supabase.from('foto_votacao').select('id').eq('dia', DIAS[diaSel].num).limit(1)
    setJaTemVotacao(data && data.length > 0)
  }

  function iniciarSelecao() {
    setShowSenhaSelecao(true)
    setSenhaSelecao('')
    setSenhaSelecaoErro('')
  }

  function confirmarSenhaSelecao() {
    if (senhaSelecao === SENHA_COORD) {
      setShowSenhaSelecao(false)
      setModoSelecao(true)
      setSelecionadas([])
    } else {
      setSenhaSelecaoErro(tx.senhaIncorreta)
    }
  }

  function toggleSelecao(foto) {
    setSelecionadas(prev => {
      if (prev.find(f => f.id === foto.id)) return prev.filter(f => f.id !== foto.id)
      if (prev.length >= 5) return prev
      return [...prev, foto]
    })
  }

  async function enviarVotacao() {
    if (selecionadas.length === 0) return
    await supabase.from('foto_votacao').delete().eq('dia', DIAS[diaSel].num)
    const rows = selecionadas.map(f => ({ dia: DIAS[diaSel].num, foto_url: f.url, votos: 0 }))
    await supabase.from('foto_votacao').insert(rows)
    setModoSelecao(false)
    setSelecionadas([])
    setJaTemVotacao(true)
  }

  async function limparVotacao() {
    await supabase.from('foto_votacao').delete().eq('dia', DIAS[diaSel].num)
    setJaTemVotacao(false)
  }

  async function deletarFoto(foto) {
    await supabase.storage.from('mural').remove([foto.arquivo])
    await supabase.from('mural_fotos').delete().eq('id', foto.id)
    await supabase.from('foto_votacao').delete().eq('foto_url', foto.url)
    setFotoAberta(null)
    setConfirmDelete(false)
    carregarFotos()
    checarVotacao()
  }

  function trocarAutor() {
    setAutorSelecionado('')
    localStorage.removeItem('mural_autor')
  }

  function confirmarSenhaTeste() {
    if (senhaTeste === SENHA_COORD) {
      setModoTeste(true)
      setShowSenhaTeste(false)
    } else {
      setSenhaTesteErro(tx.senhaIncorreta)
    }
  }

  const SUPERVISORES = ['Alvarães', 'Danilo', 'Caetano', 'Alyson', 'Paula', 'Eliel', 'Edson', 'Pr. Júnior', 'Pra. Stephanie']
  const podeDeletar = fotoAberta && (fotoAberta.autor === autorSelecionado || SUPERVISORES.includes(autorSelecionado))

  const fotosExibidas = filtroAutor
    ? fotos.filter(f => f.autor === filtroAutor)
    : fotos

  const autoresUnicos = [...new Set(fotos.map(f => f.autor).filter(Boolean))]

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: mosaicoAltura > 0 ? mosaicoAltura : '100vh', position: 'relative' }}>
      {MOSAICO_FOTOS.length > 0 && (
        <div ref={parallaxRef} style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          columnCount: 3, columnGap: 3,
          zIndex: 0, willChange: 'transform'
        }}>
          {MOSAICO_TILES.map((src, i) => (
            <img key={i} src={src} alt="" onLoad={medirAltura} loading={i < 9 ? 'eager' : 'lazy'} decoding="async" style={{ width: '100%', display: 'block', marginBottom: 3, breakInside: 'avoid' }} />
          ))}
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '140%', background: 'rgba(5,5,20,0.78)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'rgba(8,8,20,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{tx.feedImpulse}</h2>
        {autorSelecionado && (
          <button onClick={trocarAutor} style={{
            marginLeft: 'auto', padding: '4px 10px', borderRadius: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)',
            color: 'var(--accent-light)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
          }}>{autorSelecionado} ✎</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {DIAS.map((d, i) => (
          <button key={i} onClick={() => { setDiaSel(i); setFiltroAutor('') }} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 16,
            border: diaSel === i ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.25)',
            background: diaSel === i ? 'var(--accent-bg)' : 'rgba(8,8,20,0.65)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            color: diaSel === i ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>Dia {d.num}</span>
            <span style={{ fontSize: 9, opacity: 0.85 }}>{d.label}</span>
          </button>
        ))}
      </div>

      {podeMuralPostar() || modoTeste ? (
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
      ) : (
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(8,8,20,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
            📷 {tx.uploadDisponivel}
          </div>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button onClick={() => { setShowSenhaTeste(true); setSenhaTeste(''); setSenhaTesteErro('') }} style={{
              background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline'
            }}>🔓 Coordenador</button>
          </div>
        </div>
      )}

      {uploading && (
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', borderRadius: 14, padding: '12px', fontSize: 13, color: 'var(--accent-light)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #C4B5FD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Enviando foto...
          </div>
        </div>
      )}

      {!modoSelecao && (fotos.length > 0 || jaTemVotacao) && (
        <div style={{ padding: '0 22px 12px' }}>
          {jaTemVotacao ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(16,185,129,0.7)', fontWeight: 600 }}>✓ Votação do Dia {DIAS[diaSel].num} definida</span>
              {fotos.length > 0 && (
                <button onClick={iniciarSelecao} style={{
                  marginLeft: 'auto', padding: '4px 10px', borderRadius: 10, border: '1px solid var(--border-strong)',
                  background: 'var(--bg-card)', color: 'var(--text-muted)',
                  fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                }}>{tx.refazer}</button>
              )}
              <button onClick={limparVotacao} style={{
                marginLeft: fotos.length > 0 ? 0 : 'auto', padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.1)', color: '#F87171',
                fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>Limpar</button>
            </div>
          ) : fotos.length > 0 ? (
            <button onClick={iniciarSelecao} style={{
              width: '100%', padding: '10px', borderRadius: 12,
              border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)',
              color: '#FBBF24', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif'
            }}>⭐ Selecionar fotos para votação</button>
          ) : null}
        </div>
      )}

      {modoSelecao && (
        <div style={{ padding: '0 22px 12px' }}>
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 12, color: '#FBBF24', fontWeight: 600 }}>{selecionadas.length}/5 selecionadas</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={enviarVotacao} disabled={selecionadas.length === 0} style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: selecionadas.length > 0 ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'var(--border-strong)',
                color: 'white', fontSize: 11, fontWeight: 700, cursor: selecionadas.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'Inter, sans-serif'
              }}>{tx.confirmar}</button>
              <button onClick={() => { setModoSelecao(false); setSelecionadas([]) }} style={{
                padding: '6px 14px', borderRadius: 10, border: '1px solid var(--border-strong)',
                background: 'var(--bg-card)', color: 'var(--text-muted)',
                fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>{tx.cancelar}</button>
            </div>
          </div>
        </div>
      )}

      {autoresUnicos.length > 1 && !modoSelecao && (
        <div style={{ display: 'flex', gap: 6, padding: '0 22px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setFiltroAutor('')} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            border: !filtroAutor ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.25)',
            background: !filtroAutor ? 'var(--accent-bg)' : 'rgba(8,8,20,0.65)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            color: !filtroAutor ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif'
          }}>{tx.todos}</button>
          {autoresUnicos.map(a => (
            <button key={a} onClick={() => setFiltroAutor(a)} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              border: filtroAutor === a ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.25)',
              background: filtroAutor === a ? 'var(--accent-bg)' : 'rgba(8,8,20,0.65)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              color: filtroAutor === a ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif'
            }}>{a}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '0 22px 12px', fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
        {loading ? 'Carregando...' : `${fotosExibidas.length} foto${fotosExibidas.length !== 1 ? 's' : ''}${filtroAutor ? ` · ${filtroAutor}` : ` · Dia ${DIAS[diaSel].num}`}`}
      </div>

      {!loading && fotosExibidas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 22px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.85 }}>📷</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{tx.nenhumaFoto}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>Seja o primeiro a postar no Dia {DIAS[diaSel].num}!</div>
        </div>
      )}

      <div style={{ padding: '0 22px 100px', columnCount: 2, columnGap: 8 }}>
        {fotosExibidas.map(foto => {
          const estaSelecionada = selecionadas.find(f => f.id === foto.id)
          return (
            <div key={foto.id} onClick={() => modoSelecao ? toggleSelecao(foto) : (setFotoAberta(foto), setConfirmDelete(false))} style={{
              breakInside: 'avoid', marginBottom: 8, borderRadius: 14, overflow: 'hidden',
              cursor: 'pointer', position: 'relative',
              border: estaSelecionada ? '2px solid #F59E0B' : '1px solid var(--border)',
              background: 'var(--bg-card)'
            }}>
              <img src={foto.url} alt="" loading="lazy" style={{ width: '100%', display: 'block', opacity: modoSelecao && !estaSelecionada && selecionadas.length >= 5 ? 0.3 : 1 }} />
              {modoSelecao && estaSelecionada && (
                <div style={{
                  position: 'absolute', top: 8, right: 8, width: 24, height: 24,
                  background: '#F59E0B', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#000'
                }}>{selecionadas.findIndex(f => f.id === foto.id) + 1}</div>
              )}
              <div style={{ padding: '8px 10px' }}>
                {foto.autor && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{foto.autor}</div>}
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                  {new Date(foto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {fotoAberta && (
        <div onClick={() => { setFotoAberta(null); setConfirmDelete(false) }} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <button onClick={e => { e.stopPropagation(); setFotoAberta(null); setConfirmDelete(false) }} style={{
            position: 'absolute', top: 20, right: 20, width: 36, height: 36,
            background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: 'none',
            color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>✕</button>

          <img src={fotoAberta.url} alt="" onClick={e => e.stopPropagation()} style={{
            maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, objectFit: 'contain'
          }} />

          {fotoAberta.autor && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              📸 {fotoAberta.autor}
            </div>
          )}

          {podeDeletar && (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 12, marginTop: 12 }}>
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

          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Dia {DIAS[diaSel].num} · {new Date(fotoAberta.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
      )}

      {showNomePicker && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overlay-enter" style={{ background: 'var(--overlay-bg)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '24px 20px', width: '90%', maxWidth: 340, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>📸</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>Quem é você?</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>{tx.selecioneNome}</p>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', padding: '4px 0' }}>
              {STAFF_NOMES.map(n => (
                <button key={n} onClick={() => confirmarAutor(n)} style={{
                  padding: '6px 12px', borderRadius: 14, border: '1px solid var(--border-strong)',
                  background: 'var(--bg-card)', color: 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                }}>{n}</button>
              ))}
            </div>
            <button onClick={() => { setShowNomePicker(false); setPendingFile(null) }} style={{
              marginTop: 12, background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer'
            }}>{tx.cancelar}</button>
          </div>
        </div>
      )}

      {showSenhaSelecao && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overlay-enter" style={{ background: 'var(--overlay-bg)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Foto do Dia</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Senha do coordenador geral</p>
            <input
              type="password" value={senhaSelecao}
              onChange={e => { setSenhaSelecao(e.target.value); setSenhaSelecaoErro('') }}
              onKeyDown={e => e.key === 'Enter' && confirmarSenhaSelecao()}
              placeholder="••••" maxLength={10} autoFocus
              style={{ width: '100%', padding: '14px 16px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: '.3em', outline: 'none', color: 'var(--text)', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}
            />
            {senhaSelecaoErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{senhaSelecaoErro}</p>}
            <button onClick={confirmarSenhaSelecao} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#F59E0B,#EF4444)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>{tx.entrar}</button>
            <button onClick={() => setShowSenhaSelecao(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer' }}>{tx.cancelar}</button>
          </div>
        </div>
      )}

      {showSenhaTeste && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overlay-enter" style={{ background: 'var(--overlay-bg)', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔓</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Liberar postagem de teste</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Senha do coordenador geral</p>
            <input
              type="password" value={senhaTeste}
              onChange={e => { setSenhaTeste(e.target.value); setSenhaTesteErro('') }}
              onKeyDown={e => e.key === 'Enter' && confirmarSenhaTeste()}
              placeholder="••••" maxLength={10} autoFocus
              style={{ width: '100%', padding: '14px 16px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: '.3em', outline: 'none', color: 'var(--text)', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}
            />
            {senhaTesteErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{senhaTesteErro}</p>}
            <button onClick={confirmarSenhaTeste} style={{ width: '100%', padding: 14, background: 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>{tx.entrar}</button>
            <button onClick={() => setShowSenhaTeste(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer' }}>{tx.cancelar}</button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
