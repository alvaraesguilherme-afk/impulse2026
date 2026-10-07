'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTexto } from '@/lib/i18n'
import { thumbUrl, onThumbError } from '@/lib/imageThumb'
import { ehAdmin, ehSupervisor } from '@/lib/permissoes'
import { dataLocal, addDias, MESES_C } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor } from '@/lib/hooks'
import { enviarFoto } from '@/app/actions/mural'
import { guardarFoto, contarFotos, montarForm, processarFotos } from '@/lib/fotos-offline'

/* eslint-disable @next/next/no-img-element -- fotos do Supabase: miniatura via render do Storage */


function montarDias(inicioISO) {
  const inicio = dataLocal(inicioISO)
  const rot = d => `${d.getDate()} ${MESES_C[d.getMonth()]}`
  const chegada1 = addDias(inicio, -2), chegada2 = addDias(inicio, -1)
  return [
    { label: `${chegada1.getDate()}-${chegada2.getDate()} ${MESES_C[chegada2.getMonth()]}`, labelDia: 'Dia 0' },
    ...Array.from({ length: 13 }, (_, i) => ({ label: rot(addDias(inicio, i)), labelDia: `Dia ${i + 1}` })),
  ]
}

function comprimirImagem(file, maxKB = 500) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onerror = reject
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

function lerCurtidas() {
  const set = new Set()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('curtiu_')) set.add(k.replace('curtiu_', ''))
    }
  } catch { /* ignora */ }
  return set
}

const chipBase = ativo => ({
  flexShrink: 0, padding: '8px 14px', borderRadius: 16,
  border: ativo ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.2)',
  background: ativo ? 'var(--accent-bg)' : 'rgba(8,8,20,0.88)',
  color: ativo ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)',
  fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
})
const chipAutor = ativo => ({
  flexShrink: 0, padding: '5px 12px', borderRadius: 14, fontSize: 10, fontWeight: 700, cursor: 'pointer',
  border: ativo ? '1px solid var(--accent-border)' : '1px solid rgba(255,255,255,0.2)',
  background: ativo ? 'var(--accent-bg)' : 'rgba(8,8,20,0.88)',
  color: ativo ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-inter), sans-serif'
})
const aviso = (bg, borda, cor) => ({ background: bg, border: `1px solid ${borda}`, borderRadius: 14, padding: '12px', fontSize: 13, color: cor, textAlign: 'center' })

export function Mural({ sessao, inicio, dia, diaHoje, recap, recapLiberado, filtroAutor, todosOsDias, autores, fotos: fotosServidor }) {
  const tx = useTexto()
  const router = useRouter()
  const autor = sessao.nome
  const DIAS = useMemo(() => montarDias(inicio), [inicio])
  const [carregando, startNavegar] = useTransition()
  const montado = useMontado()
  const [fotos, setFotos] = useEstadoServidor(fotosServidor)
  const [uploading, setUploading] = useState(false)
  const [erroUpload, setErroUpload] = useState(false)
  const [fotoPendenteAvisada, setFotoPendenteAvisada] = useState(false)
  const [pendingFotos, setPendingFotos] = useState(0)
  const [fotoAberta, setFotoAberta] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [curtidasEscolhidas, setCurtidas] = useState(null)
  const curtidasSalvas = useMemo(() => (montado ? lerCurtidas() : new Set()), [montado])
  const curtidas = curtidasEscolhidas ?? curtidasSalvas
  const [modoTeste, setModoTeste] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreview, setPendingPreview] = useState(null)
  const [pendingLegenda, setPendingLegenda] = useState('')
  const inputGaleria = useRef(null)
  const inputCamera = useRef(null)

  useEffect(() => {
    contarFotos().then(setPendingFotos)
    const atualizar = () => contarFotos().then(setPendingFotos)
    window.addEventListener('impulse-fila', atualizar)
    return () => window.removeEventListener('impulse-fila', atualizar)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('foto-aberta', !!fotoAberta)
    return () => document.body.classList.remove('foto-aberta')
  }, [fotoAberta])

  function navegar(params) {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== false) q.set(k, v === true ? '1' : String(v)) })
    startNavegar(() => router.push(`/mural?${q.toString()}`, { scroll: false }))
  }

  const podePostar = diaHoje !== null || modoTeste

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
    setPendingLegenda('')
  }

  function cancelarUpload() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setPendingLegenda('')
  }

  async function publicarFoto() {
    if (!pendingFile) return
    const file = pendingFile
    const legenda = pendingLegenda.trim()
    cancelarUpload()
    setUploading(true)
    setErroUpload(false)
    setFotoPendenteAvisada(false)
    const arquivo = `dia${diaHoje ?? 0}_${Date.now()}.jpg`
    let blob
    try { blob = await comprimirImagem(file) } catch { setErroUpload(true); setUploading(false); return }
    const item = { blob, arquivo, legenda }

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        if (!navigator.onLine) break
        await enviarFoto(montarForm(item))
        setUploading(false)
        router.refresh()
        return
      } catch (err) {
        if (!(err instanceof TypeError)) { setErroUpload(true); setUploading(false); return }
        if (tentativa < 2) await new Promise(r => setTimeout(r, 1200))
      }
    }
    // Sem sinal: guarda no aparelho e sobe sozinha quando a conexão voltar
    try {
      await guardarFoto(item)
      setPendingFotos(await contarFotos())
      setFotoPendenteAvisada(true)
      processarFotos()
    } catch {
      setErroUpload(true)
    }
    setUploading(false)
  }

  function deletarFoto(foto) {
    setFotoAberta(null)
    setConfirmDelete(false)
    setFotos(prev => prev.filter(f => f.id !== foto.id))
    executar('mural.deletarFoto', foto.id)
  }

  async function baixarFoto(url) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'escola-impulse.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
  }

  function curtirFoto(foto) {
    const id = String(foto.id)
    const jaCurtiu = curtidas.has(id)
    const novas = jaCurtiu ? Math.max(0, foto.curtidas - 1) : foto.curtidas + 1
    try {
      if (jaCurtiu) localStorage.removeItem(`curtiu_${id}`)
      else localStorage.setItem(`curtiu_${id}`, '1')
    } catch { /* ignora */ }
    setCurtidas(() => { const s = new Set(curtidas); if (jaCurtiu) s.delete(id); else s.add(id); return s })
    setFotos(prev => prev.map(f => f.id === foto.id ? { ...f, curtidas: novas } : f))
    if (fotoAberta?.id === foto.id) setFotoAberta(prev => ({ ...prev, curtidas: novas }))
    executar('mural.curtirFoto', foto.id, jaCurtiu ? -1 : 1)
  }

  const podeDeletar = fotoAberta && (fotoAberta.autor === autor || ehSupervisor(sessao))
  const autoresUnicos = [...new Set(autores)]
  const rotuloDiaFoto = f => DIAS[f.dia]?.labelDia ?? ''

  return (
    <div style={{ background: '#05051a', minHeight: '100vh', position: 'relative' }} className="tela-enter-mural">

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{tx.feedImpulse}</h2>
          <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', color: 'var(--accent-light)', fontSize: 10, fontWeight: 600 }}>{autor}</div>
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {filtroAutor && (
            <button onClick={() => navegar({ autor: filtroAutor, todos: true })} style={chipBase(todosOsDias)}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>📅 Todos</span>
              <span style={{ fontSize: 9, opacity: 0.65 }}>os dias</span>
            </button>
          )}
          {DIAS.map((d, i) => (
            <button key={i} onClick={() => navegar({ dia: i })} style={chipBase(!todosOsDias && !recap && dia === i)}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{d.label}</span>
              <span style={{ fontSize: 9, opacity: 0.65 }}>{d.labelDia}</span>
            </button>
          ))}
          {recapLiberado && (
            <button onClick={() => navegar({ recap: true })} style={{
              ...chipBase(false),
              border: recap ? '1px solid #FFD700' : '1px solid rgba(255,215,0,0.35)',
              background: recap ? 'rgba(255,215,0,0.18)' : 'rgba(8,8,20,0.88)',
              color: recap ? '#FFD700' : 'rgba(255,215,0,0.7)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>🏆 Recap</span>
              <span style={{ fontSize: 9, opacity: 0.8 }}>Top 100</span>
            </button>
          )}
        </div>

        {!recap && (podePostar ? (
          <div style={{ display: 'flex', gap: 10, padding: '0 22px 16px' }}>
            <button onClick={() => inputGaleria.current?.click()} disabled={uploading} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid var(--border-strong)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: uploading ? 0.5 : 1 }}>🖼️ Galeria</button>
            <button onClick={() => inputCamera.current?.click()} disabled={uploading} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid var(--accent-border)', background: 'var(--accent-bg)', color: 'var(--accent-light)', fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: uploading ? 0.5 : 1 }}>📷 Câmera</button>
            <input ref={inputGaleria} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            <input ref={inputCamera} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>
        ) : (
          <div style={{ padding: '0 22px 16px' }}>
            <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(8,8,20,0.88)', border: '1px solid rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>📷 {tx.uploadDisponivel}</div>
            {ehAdmin(sessao) && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button onClick={() => setModoTeste(true)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}>🔓 Liberar postagem</button>
              </div>
            )}
          </div>
        ))}

        {!recap && uploading && (
          <div style={{ padding: '0 22px 16px' }}>
            <div style={{ ...aviso('var(--accent-bg)', 'var(--accent-glow)', 'var(--accent-light)'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, border: '2px solid #C4B5FD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Enviando foto...
            </div>
          </div>
        )}
        {!recap && erroUpload && <div style={{ padding: '0 22px 16px' }}><div style={aviso('rgba(239,68,68,0.1)', 'rgba(239,68,68,0.3)', '#F87171')}>⚠️ Não foi possível enviar a foto. Tente de novo.</div></div>}
        {!recap && fotoPendenteAvisada && <div style={{ padding: '0 22px 16px' }}><div style={aviso('rgba(245,158,11,0.1)', 'rgba(245,158,11,0.3)', '#FBBF24')}>📶 Sinal fraco — sua foto foi guardada no aparelho e será enviada automaticamente assim que a conexão melhorar.</div></div>}
        {!recap && !uploading && pendingFotos > 0 && (
          <div style={{ padding: '0 22px 16px' }}>
            <div style={{ ...aviso('rgba(245,158,11,0.08)', 'rgba(245,158,11,0.25)', '#FBBF24'), padding: '10px 12px', fontSize: 12 }}>⏳ {pendingFotos} foto{pendingFotos > 1 ? 's' : ''} aguardando conexão pra enviar</div>
          </div>
        )}

        {!recap && (
          <div style={{ display: 'flex', gap: 6, padding: '0 22px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button onClick={() => navegar({ dia })} style={chipAutor(!filtroAutor)}>{tx.todos}</button>
            <button onClick={() => navegar({ dia, autor })} style={chipAutor(filtroAutor === autor)}>👤 Minhas</button>
            {autoresUnicos.filter(a => a !== autor).map(a => (
              <button key={a} onClick={() => navegar({ dia, autor: a })} style={chipAutor(filtroAutor === a)}>{a}</button>
            ))}
          </div>
        )}

        {recap ? (
          <div style={{ padding: '0 16px 100px', opacity: carregando ? 0.5 : 1, transition: 'opacity .2s' }}>
            <div style={{ textAlign: 'center', padding: '18px 0 28px' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🏆</div>
              <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 21, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Top 100 do Impulso</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.4 }}>as fotos mais curtidas do evento</div>
            </div>
            {fotos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 22px', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Nenhuma foto ainda</div>
            ) : (
              <>
                {fotos[0] && (
                  <div className="recap-card" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: 8, cursor: 'pointer', border: '2px solid #FFD700', boxShadow: '0 0 28px rgba(255,215,0,0.25)' }} onClick={() => { setFotoAberta(fotos[0]); setConfirmDelete(false) }}>
                    <img src={thumbUrl(fotos[0].url, { width: 800, height: 300 })} onError={onThumbError(fotos[0].url)} alt="" style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 10, left: 10, background: '#FFD700', borderRadius: 10, padding: '4px 10px', fontSize: 12, fontWeight: 800, color: '#000' }}>🥇 #1</div>
                    <div style={{ padding: '10px 14px', background: 'linear-gradient(0deg,rgba(0,0,0,0.85),rgba(0,0,0,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        {fotos[0].legenda && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>{fotos[0].legenda}</div>}
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{fotos[0].autor}</div>
                      </div>
                      <div style={{ fontSize: 15, color: '#FFD700', fontWeight: 800 }}>❤️ {fotos[0].curtidas}</div>
                    </div>
                  </div>
                )}
                {fotos.slice(1, 3).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {fotos.slice(1, 3).map((foto, i) => {
                      const CORES = ['#C0C0C0', '#CD7F32']
                      return (
                        <div key={foto.id} className="recap-card" style={{ animationDelay: `${(i + 1) * 0.09}s`, position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${CORES[i]}` }} onClick={() => { setFotoAberta(foto); setConfirmDelete(false) }}>
                          <img src={thumbUrl(foto.url, { width: 500, height: 300 })} onError={onThumbError(foto.url)} alt="" style={{ width: '100%', display: 'block', height: 150, objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: 7, left: 7, background: CORES[i], borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 800, color: '#000' }}>{['🥈', '🥉'][i]} #{i + 2}</div>
                          <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.7)' }}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 2 }}>{foto.autor}</div>
                            <div style={{ fontSize: 11, color: CORES[i], fontWeight: 800 }}>❤️ {foto.curtidas}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {fotos.slice(3).map((foto, i) => (
                    <div key={foto.id} className="recap-card" style={{ animationDelay: `${(i + 3) * 0.05}s`, position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => { setFotoAberta(foto); setConfirmDelete(false) }}>
                      <img src={thumbUrl(foto.url, { width: 480 })} onError={onThumbError(foto.url)} alt="" loading="lazy" style={{ width: '100%', display: 'block' }} />
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.72)', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.85)' }}>#{i + 4}</div>
                      <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.65)' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{foto.autor}</div>
                        <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.9)', fontWeight: 700 }}>❤️ {foto.curtidas}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={{ padding: '0 22px 12px', fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              {carregando ? 'Carregando...' : `${fotos.length} foto${fotos.length !== 1 ? 's' : ''}${filtroAutor ? ` · ${filtroAutor}${todosOsDias ? ' · todos os dias' : ` · ${DIAS[dia].labelDia}`}` : ` · ${DIAS[dia].labelDia}`}`}
            </div>

            {!carregando && fotos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 22px' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.85 }}>📷</div>
                <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#fff' }}>{tx.nenhumaFoto}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Seja o primeiro a postar em {DIAS[dia].label}!</div>
              </div>
            )}

            <div style={{ padding: '0 22px 100px', columnCount: 2, columnGap: 8, opacity: carregando ? 0.5 : 1, transition: 'opacity .2s' }}>
              {fotos.map((foto, i) => (
                <div key={foto.id} className="recap-card" onClick={() => { setFotoAberta(foto); setConfirmDelete(false) }} style={{ breakInside: 'avoid', marginBottom: 8, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative', animationDelay: `${Math.min(i, 12) * 0.04}s`, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <img src={thumbUrl(foto.url, { width: 480 })} onError={onThumbError(foto.url)} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block' }} />
                  <div style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 4 }}>
                      {foto.legenda && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{foto.legenda}</div>}
                      {foto.autor && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 1 }}>{foto.autor}</div>}
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }} suppressHydrationWarning>
                        {todosOsDias || dia === 0
                          ? new Date(foto.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : new Date(foto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); curtirFoto(foto) }} className="btn-curtida" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 4px', flexShrink: 0 }}>
                      <span style={{ fontSize: 22 }}>{curtidas.has(String(foto.id)) ? '❤️' : '🤍'}</span>
                      {foto.curtidas > 0 && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 700 }}>{foto.curtidas}</span>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {fotoAberta && (
          <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 16px 0', flexShrink: 0 }}>
              <button onClick={() => baixarFoto(fotoAberta.url)} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: 'none', color: 'white', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⬇️</button>
              <button onClick={() => { setFotoAberta(null); setConfirmDelete(false) }} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div onClick={() => { setFotoAberta(null); setConfirmDelete(false) }} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px 48px', gap: 12 }}>
              <img src={fotoAberta.url} alt="" decoding="async" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 12, objectFit: 'contain' }} />
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 380 }}>
                {fotoAberta.autor && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>📸 {fotoAberta.autor}</div>}
                <button onClick={() => curtirFoto(fotoAberta)} className="btn-curtida" style={{
                  marginLeft: 'auto', background: curtidas.has(String(fotoAberta.id)) ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                  border: curtidas.has(String(fotoAberta.id)) ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 14, padding: '12px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontSize: 18, fontWeight: 600
                }}>
                  <span style={{ fontSize: 22 }}>{curtidas.has(String(fotoAberta.id)) ? '❤️' : '🤍'}</span>
                  <span>{fotoAberta.curtidas}</span>
                </button>
              </div>
              {fotoAberta.legenda && <div onClick={e => e.stopPropagation()} style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>{fotoAberta.legenda}</div>}
              {podeDeletar && (
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 12 }}>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} style={{ padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.15)', color: '#F87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🗑️ Excluir</button>
                  ) : (
                    <>
                      <button onClick={() => deletarFoto(fotoAberta)} style={{ padding: '10px 20px', borderRadius: 14, border: 'none', background: '#EF4444', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{tx.confirmarExclusao}</button>
                      <button onClick={() => setConfirmDelete(false)} style={{ padding: '10px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{tx.cancelar}</button>
                    </>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }} suppressHydrationWarning>{rotuloDiaFoto(fotoAberta)} · {new Date(fotoAberta.created_at).toLocaleString('pt-BR')}</div>
            </div>
          </div>
        )}
      </div>

      {pendingPreview && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div className="overlay-enter" style={{ width: '100%', maxWidth: 340, background: 'rgba(8,8,20,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', textAlign: 'center' }}>Nova foto</div>
            <img src={pendingPreview} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 220, objectFit: 'cover' }} />
            <textarea value={pendingLegenda} onChange={e => setPendingLegenda(e.target.value)} placeholder="Adicione uma legenda... (opcional)" maxLength={200} rows={3}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, fontSize: 13, color: '#fff', outline: 'none', resize: 'none', fontFamily: 'var(--font-inter), sans-serif' }} />
            <button onClick={publicarFoto} style={{ padding: 14, background: 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'white', fontFamily: 'var(--font-syne), sans-serif' }}>Publicar</button>
            <button onClick={cancelarUpload} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
