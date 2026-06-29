import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const INICIO = new Date(2026, 6, 15)

const AUTORES_FRASE = {
  '1932': 'Alvarães',
  '6090': 'Danilo',
  '0404': 'Caetano',
  '2121': 'Alyson',
  '9089': 'Paula',
}
const SENHA_EDITAR = '1932'

function getDiaEvento() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  const diff = Math.round((hj.getTime() - INICIO.getTime()) / 86400000)
  if (diff >= 0 && diff <= 10) return diff + 1
  return 1
}

export default function Home({ onNavegar }) {
  const [avisos, setAvisos] = useState([])
  const [diasRestantes, setDiasRestantes] = useState(0)
  const [frase, setFrase] = useState(null)
  const [showFraseModal, setShowFraseModal] = useState(false)
  const [fraseInput, setFraseInput] = useState('')
  const [fraseSenha, setFraseSenha] = useState('')
  const [fraseErro, setFraseErro] = useState('')
  const [fotoDestaque, setFotoDestaque] = useState(null)
  const [votacao, setVotacao] = useState([])
  const [jaVotou, setJaVotou] = useState(false)

  const diaEvento = getDiaEvento()

  useEffect(() => {
    const hj = new Date()
    hj.setHours(0, 0, 0, 0)
    const d = Math.ceil((INICIO.getTime() - hj.getTime()) / 86400000)
    setDiasRestantes(d)
    supabase.from('avisos').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAvisos(data)
    })
    if (diaEvento) {
      supabase.from('frase_do_dia').select('*').eq('dia', diaEvento).maybeSingle().then(({ data }) => {
        if (data) setFrase(data)
      })
      if (diaEvento > 1) {
        supabase.from('foto_votacao').select('*').eq('dia', diaEvento - 1).order('votos', { ascending: false }).limit(1).then(({ data }) => {
          if (data && data.length > 0 && data[0].votos > 0) setFotoDestaque(data[0])
        })
      }
      supabase.from('foto_votacao').select('*').eq('dia', diaEvento).order('created_at', { ascending: true }).then(({ data }) => {
        if (data && data.length > 0) setVotacao(data)
      })
      const votouKey = `votou_dia_${diaEvento}`
      if (localStorage.getItem(votouKey)) setJaVotou(true)
    }
  }, [])

  function abrirFraseModal() {
    setShowFraseModal(true)
    setFraseInput(frase?.frase || '')
    setFraseSenha('')
    setFraseErro('')
  }

  async function salvarFrase() {
    if (!fraseSenha) { setFraseErro('Digite a senha.'); return }
    if (frase?.frase) {
      if (fraseSenha !== SENHA_EDITAR) { setFraseErro('Apenas o coordenador geral pode alterar.'); return }
    } else {
      if (!AUTORES_FRASE[fraseSenha]) { setFraseErro('Senha incorreta.'); return }
    }
    const autor = AUTORES_FRASE[fraseSenha]
    if (!fraseInput.trim()) { setFraseErro('Digite a frase.'); return }
    await supabase.from('frase_do_dia').upsert({ dia: diaEvento, frase: fraseInput.trim(), autor }, { onConflict: 'dia' })
    setFrase({ dia: diaEvento, frase: fraseInput.trim(), autor })
    setShowFraseModal(false)
  }

  async function votar(fotoId) {
    if (jaVotou) return
    const foto = votacao.find(f => f.id === fotoId)
    if (!foto) return
    await supabase.from('foto_votacao').update({ votos: (foto.votos || 0) + 1 }).eq('id', fotoId)
    localStorage.setItem(`votou_dia_${diaEvento}`, fotoId)
    setJaVotou(true)
    setVotacao(prev => prev.map(f => f.id === fotoId ? { ...f, votos: (f.votos || 0) + 1 } : f))
  }

  const totalVotos = votacao.reduce((s, f) => s + (f.votos || 0), 0)
  const votouEm = localStorage.getItem(`votou_dia_${diaEvento}`)

  const modulos = [
    { id: 'apoio', icon: '🙌', nome: 'Apoio', desc: 'Escalas e times', grad: 'linear-gradient(145deg,#4C1D95,#7C3AED)' },
    { id: 'staff', icon: '👤', nome: 'Staff', desc: 'Colaboradores', grad: 'linear-gradient(145deg,#0C4A6E,#0EA5E9)' },
    { id: 'midia', icon: '🎥', nome: 'Mídia', desc: 'Escalas e equipe', grad: 'linear-gradient(145deg,#78350F,#F59E0B)' },
    { id: 'mural', icon: '📸', nome: 'Feed Impulse', desc: 'Fotos do staff', grad: 'linear-gradient(145deg,#831843,#EC4899)' },
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--input-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-strong)', borderRadius: 30, padding: '6px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 20 }}>
            <div style={{ width: 7, height: 7, background: '#EF4444', borderRadius: '50%', boxShadow: '0 0 8px #EF4444', animation: 'blink 1.5s infinite' }} />
            {diasRestantes > 0 ? `${diasRestantes} dias para o evento` : 'Evento em andamento'}
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, marginBottom: 8 }}>
            Escola<br />
            <span style={{ background: 'linear-gradient(90deg,#A78BFA,#60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span><br />
            2026
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>15 a 25 de julho · Rancho Império</div>
        </div>

        {diaEvento && (
          <div onClick={abrirFraseModal} style={{
            margin: '32px 22px 0', borderRadius: 20, padding: '20px 18px',
            background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(167,139,250,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              ✦ Frase do Dia
            </div>
            {frase?.frase ? (
              <>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: 'var(--text)' }}>
                  "{frase.frase}"
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>— {frase.autor}</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>Toque para definir</div>
            )}
          </div>
        )}

        {fotoDestaque && (
          <div style={{ margin: '16px 22px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              ⭐ Foto Destaque — Dia {fotoDestaque.dia}
            </div>
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(245,158,11,0.3)' }}>
              <img src={fotoDestaque.foto_url} alt="" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, textAlign: 'center' }}>
              {fotoDestaque.votos} voto{fotoDestaque.votos !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {votacao.length > 0 && (
          <div style={{ margin: '24px 22px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(236,72,153,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              📸 Vote na Foto do Dia {diaEvento}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>
              {jaVotou ? `Você já votou! ${totalVotos} voto${totalVotos !== 1 ? 's' : ''} no total` : 'Toque na sua favorita'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {votacao.map((foto, i) => {
                const isVotada = votouEm === String(foto.id)
                return (
                  <div key={foto.id} onClick={() => votar(foto.id)} style={{
                    borderRadius: 16, overflow: 'hidden', cursor: jaVotou ? 'default' : 'pointer',
                    border: isVotada ? '2px solid #EC4899' : '1px solid var(--border)',
                    position: 'relative', gridColumn: i === 4 ? 'span 2' : undefined
                  }}>
                    <img src={foto.foto_url} alt="" style={{ width: '100%', display: 'block', aspectRatio: i === 4 ? '2/1' : '1/1', objectFit: 'cover' }} />
                    {jaVotou && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        padding: '20px 10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 700 }}>{foto.votos || 0} voto{(foto.votos || 0) !== 1 ? 's' : ''}</span>
                        {isVotada && <span style={{ fontSize: 10, background: '#EC4899', color: 'var(--text)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>Seu voto</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', padding: '24px 22px 14px' }}>Módulos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 22px 100px' }}>
          {modulos.map(m => (
            <div key={m.id} onClick={() => onNavegar(m.id)} className="card-modulo"
              style={{
                height: 140, borderRadius: 24, padding: 18,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                cursor: 'pointer', background: m.grad,
                border: '1px solid var(--border)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ fontSize: 28 }}>{m.icon}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{m.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showFraseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {frase?.frase ? 'Editar frase do dia' : 'Frase do dia'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {frase?.frase ? 'Apenas o coordenador geral pode alterar' : 'Defina a frase para o Dia ' + diaEvento}
            </p>
            <textarea
              value={fraseInput} onChange={e => setFraseInput(e.target.value)}
              placeholder="Digite a frase..." rows={3}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'Inter, sans-serif', resize: 'none' }}
            />
            <input
              type="password" value={fraseSenha}
              onChange={e => { setFraseSenha(e.target.value); setFraseErro('') }}
              onKeyDown={e => e.key === 'Enter' && salvarFrase()}
              placeholder="Sua senha" maxLength={10}
              style={{ width: '100%', padding: '14px 16px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 16, textAlign: 'center', letterSpacing: '.2em', outline: 'none', color: 'var(--text)', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}
            />
            {fraseErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{fraseErro}</p>}
            <button onClick={salvarFrase} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#7C3AED,#60A5FA)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'var(--text)', marginBottom: 10, fontFamily: 'Syne, sans-serif' }}>Salvar</button>
            <button onClick={() => setShowFraseModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  )
}
