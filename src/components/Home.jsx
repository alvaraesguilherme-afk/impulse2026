import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { syncOp } from '../lib/offlineSync'
import { useTexto } from '../lib/i18n'
import { vibrar } from '../lib/haptics'

const INICIO = new Date(2026, 6, 15)
const FIM = new Date(2026, 6, 25, 23, 59, 59)

const NIVEIS_SUPERVISOR = ['maximo', 'alto', 'medio', 'basico']

function getDiaEvento() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  if (diff >= 0 && diff <= 10) return diff + 1
  return 1
}

function getDiaFrase() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  if (diff >= 0 && diff <= 10) return diff + 1
  return Math.floor(hj.getTime() / 86400000)
}

function foraDoEvento() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  return diff < 0 || diff > 10
}

function useContador() {
  const [agora, setAgora] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = INICIO.getTime() - agora.getTime()
  const diffFim = agora.getTime() - FIM.getTime()
  if (diff > 0) {
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return { fase: 'antes', dias: d, horas: h, minutos: m, segundos: s }
  }
  if (diffFim <= 0) {
    const diaAtual = Math.floor((agora.getTime() - INICIO.getTime()) / 86400000) + 1
    return { fase: 'durante', diaAtual, totalDias: 11 }
  }
  return { fase: 'depois' }
}

function ContadorSection() {
  const tx = useTexto()
  const contador = useContador()
  if (contador.fase === 'antes') {
    return (
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '18px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Faltam</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          {[[contador.dias, tx.dias],[contador.horas, tx.hrs],[contador.minutos, tx.min],[contador.segundos, tx.seg]].map(([v, l]) => (
            <div key={l} style={{ minWidth: 52, padding: '8px 4px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--accent-light)' }}>{String(v).padStart(2, '0')}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (contador.fase === 'durante') {
    return (
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 7, height: 7, background: '#EF4444', borderRadius: '50%', boxShadow: '0 0 8px #EF4444', animation: 'blink 1.5s infinite', flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--accent-light)' }}>Dia {contador.diaAtual} de {contador.totalDias}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tx.eventoEmAndamento}</div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '18px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>💜</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--accent-light)' }}>{tx.saudades}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{tx.saudadesMsg}</div>
    </div>
  )
}

export default function Home({ onNavegar, sessao }) {
  const tx = useTexto()
  const [avisos, setAvisos] = useState([])
  const [frase, setFrase] = useState(null)
  const [showFraseModal, setShowFraseModal] = useState(false)
  const [fraseInput, setFraseInput] = useState('')
  const [fraseErro, setFraseErro] = useState('')
  const [fotoDestaque, setFotoDestaque] = useState(null)

  const nivelSupervisor = NIVEIS_SUPERVISOR.includes(sessao?.nivel)
  const nivelMaximo = sessao?.nivel === 'maximo'
  const podeEscreverFrase = !frase && nivelSupervisor
  const podeEditarFrase = !!frase && nivelMaximo
  const fraseClicavel = podeEscreverFrase || podeEditarFrase

  const diaEvento = getDiaEvento()
  const diaFrase = getDiaFrase()

  useEffect(() => {
    supabase.from('avisos').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAvisos(data)
    })
    supabase.from('frase_do_dia').select('*').eq('dia', diaFrase).maybeSingle().then(({ data }) => {
      setFrase(data || null)
    })
    if (diaEvento) {
      const diaDestaque = foraDoEvento() ? diaEvento : diaEvento - 1
      if (diaEvento > 1 || foraDoEvento()) {
        supabase.from('mural_fotos').select('*').eq('dia', diaDestaque).order('curtidas', { ascending: false }).limit(1).then(({ data }) => {
          if (data && data.length > 0 && (data[0].curtidas || 0) > 0) setFotoDestaque(data[0])
        })
      }
    }
  }, [])

  function abrirFraseModal() {
    if (!fraseClicavel) return
    setShowFraseModal(true)
    setFraseInput(frase?.frase || '')
    setFraseErro('')
  }

  async function salvarFrase() {
    if (!fraseInput.trim()) { setFraseErro('Digite a frase.'); return }
    const autor = sessao?.nome || 'Supervisor'
    await syncOp('upsert', 'frase_do_dia', { dia: diaFrase, frase: fraseInput.trim(), autor }, { onConflict: 'dia' })
    setFrase({ dia: diaFrase, frase: fraseInput.trim(), autor })
    setShowFraseModal(false)
  }

  async function excluirFrase() {
    await syncOp('delete', 'frase_do_dia', { dia: diaFrase })
    setFrase(null)
    setFraseInput('')
    setShowFraseModal(false)
  }

  const modulos = [
    { id: 'apoio', icon: '🦺', nome: tx.apoio, desc: tx.escalasETimes, grad: 'linear-gradient(145deg,rgba(76,29,149,0.55),rgba(124,58,237,0.55))', foto: '/pexels-bulat843-1243575272-37704234.jpg' },
    { id: 'staff', icon: '👥', nome: tx.staff, desc: tx.colaboradores, grad: 'linear-gradient(145deg,rgba(12,74,110,0.55),rgba(14,165,233,0.55))' },
    { id: 'midia', icon: '📹', nome: tx.midia, desc: tx.escalasEEquipe, grad: 'linear-gradient(145deg,rgba(120,53,15,0.55),rgba(245,158,11,0.55))', foto: '/pexels-brunomassao-2095597.jpg' },
    { id: 'mural', icon: '📸', nome: tx.feedImpulse, desc: tx.fotosDoStaff, grad: 'linear-gradient(145deg,rgba(131,24,67,0.55),rgba(236,72,153,0.55))', foto: '/pexels-alejandro-aznar-155337093-16055216.jpg' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 300, height: 300, background: '#5B21B6', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, background: '#0EA5E9', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, bottom: 200, left: -60 }} />
        <div style={{ position: 'absolute', width: 150, height: 150, background: '#F59E0B', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, bottom: 300, right: -40 }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span>Escola Impulse</span>
        </div>
        <div style={{ padding: '24px 22px 0' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, marginBottom: 8 }}>
            Escola<br />
            <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span><br />
            2026
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 24 }}>15 a 25 de julho · Rancho Império</div>

          <ContadorSection />
        </div>

        {diaEvento && (
          <div onClick={abrirFraseModal} style={{
            margin: '24px 22px 0', borderRadius: 20, padding: '20px 18px',
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            cursor: fraseClicavel ? 'pointer' : 'default'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-light)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              ✦ Frase do Dia
            </div>
            {frase?.frase ? (
              <>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: 'var(--text)' }}>
                  "{frase.frase}"
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>{tx.toquePraDefinir}</div>
            )}
          </div>
        )}

        {avisos.length > 0 && (
          <div style={{ margin: '24px 22px 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => onNavegar('supervisor')}>
            <div style={{ fontSize: 20 }}>📢</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{avisos[0].texto}</p>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{avisos[0].data} às {avisos[0].hora}</span>
            </div>
            <div style={{ fontSize: 18, color: 'var(--text-faint)' }}>›</div>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', padding: '24px 22px 14px' }}>{tx.modulos}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 22px' }}>
          {modulos.map(m => (
            <div key={m.id} onClick={() => { vibrar(); onNavegar(m.id) }} className="card-modulo card-glass"
              style={{
                height: 140, borderRadius: 24, padding: 18,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                cursor: 'pointer',
                background: m.foto ? `${m.grad}, url(${m.foto}) center/cover` : m.grad,
                border: '1px solid rgba(255,255,255,0.25)',
                borderTop: '1px solid rgba(255,255,255,0.55)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -12px 20px -10px rgba(0,0,0,0.25)',
                backdropFilter: 'blur(22px) saturate(200%)',
                WebkitBackdropFilter: 'blur(22px) saturate(200%)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{m.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {fotoDestaque && (
          <div style={{ margin: '24px 22px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              ⭐ Foto Destaque — Dia {fotoDestaque.dia}
            </div>
            {fotoDestaque.autor && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>📸 {fotoDestaque.autor}</div>
            )}
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(245,158,11,0.3)' }}>
              <img src={fotoDestaque.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, textAlign: 'center' }}>
              ❤️ {fotoDestaque.curtidas} curtida{fotoDestaque.curtidas !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>

      {showFraseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {podeEditarFrase ? 'Editar frase do dia' : 'Frase do dia'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {podeEditarFrase ? `Editando como ${sessao?.nome}` : `Definindo como ${sessao?.nome}`}
            </p>
            <textarea
              value={fraseInput} onChange={e => setFraseInput(e.target.value)}
              placeholder="Digite a frase..." rows={3}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'Inter, sans-serif', resize: 'none' }}
            />
            {fraseErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{fraseErro}</p>}
            <button onClick={salvarFrase} style={{ width: '100%', padding: 14, background: 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'var(--text)', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>Salvar</button>
            {podeEditarFrase && (
              <button onClick={excluirFrase} style={{ width: '100%', padding: 14, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#F87171', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>Excluir frase</button>
            )}
            <button onClick={() => setShowFraseModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  )
}
