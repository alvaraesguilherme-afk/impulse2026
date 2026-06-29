import { useState, useEffect, useRef } from 'react'
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

function podeMuralPostar() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  return hj >= MURAL_INICIO && hj <= MURAL_FIM
}

export default function Mural({ onVoltar }) {
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
  const inputGaleria = useRef(null)
  const inputCamera = useRef(null)
  const diasRef = useRef(null)

  useEffect(() => { carregarFotos(); checarVotacao() }, [diaSel])

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

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const blob = await comprimirImagem(file)
      const nome = `dia${DIAS[diaSel].num}_${Date.now()}.jpg`
      const { error } = await supabase.storage.from('mural').upload(nome, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('mural').getPublicUrl(nome)
      await supabase.from('mural_fotos').insert({ dia: DIAS[diaSel].num, url: urlData.publicUrl, arquivo: nome })
      await carregarFotos()
    } catch (err) {
      console.error('Erro no upload:', err)
    }
    setUploading(false)
    e.target.value = ''
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
      setSenhaSelecaoErro('Senha incorreta.')
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

  async function deletarFoto(foto) {
    await supabase.storage.from('mural').remove([foto.arquivo])
    await supabase.from('mural_fotos').delete().eq('id', foto.id)
    setFotoAberta(null)
    setConfirmDelete(false)
    carregarFotos()
  }

  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'white' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>Mural de Fotos</h2>
      </div>

      <div ref={diasRef} style={{ display: 'flex', gap: 6, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {DIAS.map((d, i) => (
          <button key={i} onClick={() => setDiaSel(i)} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 16,
            border: diaSel === i ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
            background: diaSel === i ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
            color: diaSel === i ? '#C4B5FD' : 'rgba(255,255,255,0.5)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Dia {d.num}</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{d.label}</span>
          </button>
        ))}
      </div>

      {podeMuralPostar() ? (
        <div style={{ display: 'flex', gap: 10, padding: '0 22px 16px' }}>
          <button onClick={() => inputGaleria.current?.click()} disabled={uploading} style={{
            flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
            fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: uploading ? 0.5 : 1, fontFamily: 'Inter, sans-serif'
          }}>
            🖼️ Galeria
          </button>
          <button onClick={() => inputCamera.current?.click()} disabled={uploading} style={{
            flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(124,58,237,0.4)',
            background: 'rgba(124,58,237,0.15)', color: '#C4B5FD',
            fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: uploading ? 0.5 : 1, fontFamily: 'Inter, sans-serif'
          }}>
            📷 Câmera
          </button>
          <input ref={inputGaleria} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          <input ref={inputCamera} type="file" accept="image/*" capture="environment" onChange={handleUpload} style={{ display: 'none' }} />
        </div>
      ) : (
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{
            padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.3)',
            textAlign: 'center'
          }}>
            📷 Upload disponível de 14 a 27 de julho
          </div>
        </div>
      )}

      {uploading && (
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '12px', fontSize: 13, color: '#C4B5FD', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #C4B5FD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Enviando foto...
          </div>
        </div>
      )}

      {!modoSelecao && fotos.length > 0 && (
        <div style={{ padding: '0 22px 12px' }}>
          {jaTemVotacao ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(16,185,129,0.7)', fontWeight: 600 }}>✓ Votação do Dia {DIAS[diaSel].num} definida</span>
              <button onClick={iniciarSelecao} style={{
                marginLeft: 'auto', padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
                fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>Refazer</button>
            </div>
          ) : (
            <button onClick={iniciarSelecao} style={{
              width: '100%', padding: '10px', borderRadius: 12,
              border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)',
              color: '#FBBF24', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif'
            }}>⭐ Selecionar fotos para votação</button>
          )}
        </div>
      )}

      {modoSelecao && (
        <div style={{ padding: '0 22px 12px' }}>
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 12, color: '#FBBF24', fontWeight: 600 }}>
              {selecionadas.length}/5 selecionadas
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={enviarVotacao} disabled={selecionadas.length === 0} style={{
                padding: '6px 14px', borderRadius: 10, border: 'none',
                background: selecionadas.length > 0 ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'rgba(255,255,255,0.1)',
                color: 'white', fontSize: 11, fontWeight: 700, cursor: selecionadas.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'Inter, sans-serif'
              }}>Confirmar</button>
              <button onClick={() => { setModoSelecao(false); setSelecionadas([]) }} style={{
                padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 22px 12px', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
        {loading ? 'Carregando...' : `${fotos.length} foto${fotos.length !== 1 ? 's' : ''} · Dia ${DIAS[diaSel].num}`}
      </div>

      {!loading && fotos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 22px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>📷</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Nenhuma foto ainda</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Seja o primeiro a postar no Dia {DIAS[diaSel].num}!</div>
        </div>
      )}

      <div style={{ padding: '0 22px 100px', columnCount: 2, columnGap: 8 }}>
        {fotos.map(foto => {
          const estaSelecionada = selecionadas.find(f => f.id === foto.id)
          return (
            <div key={foto.id} onClick={() => modoSelecao ? toggleSelecao(foto) : (setFotoAberta(foto), setConfirmDelete(false))} style={{
              breakInside: 'avoid', marginBottom: 8, borderRadius: 14, overflow: 'hidden',
              cursor: 'pointer', position: 'relative',
              border: estaSelecionada ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)'
            }}>
              <img src={foto.url} alt="" loading="lazy" style={{ width: '100%', display: 'block', opacity: modoSelecao && !estaSelecionada && selecionadas.length >= 5 ? 0.3 : 1 }} />
              {modoSelecao && estaSelecionada && (
                <div style={{
                  position: 'absolute', top: 8, right: 8, width: 24, height: 24,
                  background: '#F59E0B', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#000'
                }}>{selecionadas.findIndex(f => f.id === foto.id) + 1}</div>
              )}
              <div style={{ padding: '8px 10px', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                {new Date(foto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
            maxWidth: '100%', maxHeight: '75vh', borderRadius: 12, objectFit: 'contain'
          }} />

          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 12, marginTop: 20 }}>
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
                }}>Confirmar exclusão</button>
                <button onClick={() => setConfirmDelete(false)} style={{
                  padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)', color: 'white',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                }}>Cancelar</button>
              </>
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Dia {DIAS[diaSel].num} · {new Date(fotoAberta.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
      )}

      {showSenhaSelecao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Foto do Dia</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Senha do coordenador geral</p>
            <input
              type="password" value={senhaSelecao}
              onChange={e => { setSenhaSelecao(e.target.value); setSenhaSelecaoErro('') }}
              onKeyDown={e => e.key === 'Enter' && confirmarSenhaSelecao()}
              placeholder="••••" maxLength={10} autoFocus
              style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: '.3em', outline: 'none', color: 'white', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}
            />
            {senhaSelecaoErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{senhaSelecaoErro}</p>}
            <button onClick={confirmarSenhaSelecao} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#F59E0B,#EF4444)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>Entrar</button>
            <button onClick={() => setShowSenhaSelecao(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
