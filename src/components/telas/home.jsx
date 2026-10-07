'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useTexto } from '@/lib/i18n'
import { rotuloRelativo, horasDesde } from '@/lib/tempo'
import { ehAdmin, ehSupervisor } from '@/lib/permissoes'
import { dataLocal, diffDias, hojeLocal, TOTAL_DIAS } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useMontado, useEstadoServidor } from '@/lib/hooks'

function useContador(inicioISO) {
  const montado = useMontado()
  const [tick, setAgora] = useState(null)
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const agora = tick ?? (montado ? new Date() : null)
  if (!agora) return null

  const inicio = dataLocal(inicioISO)
  const diff = inicio.getTime() - agora.getTime()
  if (diff > 0) {
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return { fase: 'antes', dias: d, horas: h, minutos: m, segundos: s }
  }
  const diasPassados = Math.floor((agora.getTime() - inicio.getTime()) / 86400000)
  if (diasPassados < TOTAL_DIAS) return { fase: 'durante', diaAtual: diasPassados + 1, totalDias: TOTAL_DIAS }
  if (diasPassados === TOTAL_DIAS) return { fase: 'diversao' }
  return { fase: 'depois' }
}

function ContadorSection({ inicio }) {
  const tx = useTexto()
  const contador = useContador(inicio)
  if (!contador) return <div style={{ height: 150 }} />
  if (contador.fase === 'antes') {
    return (
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '18px 16px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: 'var(--accent-light)', textAlign: 'center' }}>&quot;{tx.naoAndeisAnsiosos}&quot;</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>Fp 4:6</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{tx.faltam}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          {[[contador.dias, tx.dias], [contador.horas, tx.hrs], [contador.minutos, tx.min], [contador.segundos, tx.seg]].map(([v, l]) => (
            <div key={l} style={{ minWidth: 52, padding: '8px 4px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--accent-light)' }}>{String(v).padStart(2, '0')}</div>
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
          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--accent-light)' }}>{tx.dia} {contador.diaAtual} {tx.de} {contador.totalDias}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tx.eventoEmAndamento}</div>
        </div>
      </div>
    )
  }
  if (contador.fase === 'diversao') {
    return (
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '20px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
        <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--accent-light)', lineHeight: 1.4 }}>{tx.diaDeDiversao}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{tx.aproveiteCadaMomento}</div>
      </div>
    )
  }
  return (
    <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '20px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>💜</div>
      <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--accent-light)', lineHeight: 1.4 }}>{tx.estaFoiNossaEscola}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>{tx.obrigadoServirConosco}<br />{tx.aguardamosEscola2027}</div>
    </div>
  )
}

export function Home({ sessao, inicio, diaFrase, aviso, frase: fraseServidor, destaque }) {
  const tx = useTexto()
  const montado = useMontado()
  const [frase, setFrase] = useEstadoServidor(fraseServidor)
  const [showFraseModal, setShowFraseModal] = useState(false)
  const [fraseInput, setFraseInput] = useState('')
  const [fraseErro, setFraseErro] = useState('')
  const [salvandoFrase, startSalvar] = useTransition()
  const posEvento = montado && diffDias(hojeLocal(), dataLocal(inicio)) > TOTAL_DIAS

  const nivelSupervisor = ehSupervisor(sessao)
  const podeEscreverFrase = !frase
  const podeEditarFrase = !!frase && nivelSupervisor
  const fraseClicavel = podeEscreverFrase || podeEditarFrase
  const modoRestrito = posEvento && !nivelSupervisor

  function abrirFraseModal() {
    if (!fraseClicavel) return
    setShowFraseModal(true)
    setFraseInput(frase?.frase || '')
    setFraseErro('')
  }

  function salvarFrase() {
    if (!fraseInput.trim()) { setFraseErro(tx.digiteAFrasePonto); return }
    const texto = fraseInput.trim()
    startSalvar(async () => {
      await executar('home.salvarFrase', diaFrase, texto)
      setFrase({ frase: texto, autor: sessao.nome })
      setShowFraseModal(false)
    })
  }

  function excluirFrase() {
    startSalvar(async () => {
      await executar('home.excluirFrase', diaFrase)
      setFrase(null)
      setFraseInput('')
      setShowFraseModal(false)
    })
  }

  const avisoRecente = aviso && horasDesde(aviso.created_at) < 24

  const cartaoAviso = avisoRecente && (
    <div style={{ marginBottom: 24, background: 'rgba(239,68,68,0.14)', border: '2px solid rgba(239,68,68,0.6)', boxShadow: '0 0 16px rgba(239,68,68,0.2)', borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text)' }}>
      <div style={{ fontSize: 20 }}>📢</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{aviso.texto}</p>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#F87171' }}>{rotuloRelativo(aviso.created_at)}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}> · {aviso.hora}</span>
      </div>
      <div style={{ fontSize: 18, color: 'var(--text-faint)' }}>›</div>
    </div>
  )

  return (
    <div className="tela-enter" style={{ minHeight: '100vh', background: 'var(--bg-app)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 300, height: 300, background: '#5B21B6', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, background: '#0EA5E9', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, bottom: 200, left: -60 }} />
        <div style={{ position: 'absolute', width: 150, height: 150, background: '#F59E0B', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.35, bottom: 300, right: -40 }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span suppressHydrationWarning>{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{tx.oi}, {sessao.nome.split(' ')[0]}!</span>
        </div>
        <div style={{ padding: '24px 22px 0' }}>
          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 42, fontWeight: 800, lineHeight: 1.0, letterSpacing: -1, marginBottom: 8 }}>
            Escola<br />
            <span style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Impulse</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 24 }}>{tx.datasEventoLocal}</div>

          {!modoRestrito && cartaoAviso && (
            nivelSupervisor
              ? <Link href="/supervisor" style={{ textDecoration: 'none' }}>{cartaoAviso}</Link>
              : cartaoAviso
          )}

          <ContadorSection inicio={inicio} />
        </div>

        {!modoRestrito && (
          <div onClick={abrirFraseModal} style={{
            margin: '24px 22px 0', borderRadius: 20, padding: '20px 18px',
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            cursor: fraseClicavel ? 'pointer' : 'default'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-light)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {tx.fraseDoDia}
            </div>
            {frase?.frase ? (
              <>
                <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: 'var(--text)' }}>
                  &quot;{frase.frase}&quot;
                </div>
                {ehAdmin(sessao) && frase.autor && (
                  <div style={{ fontSize: 10, color: 'var(--accent-light)', opacity: 0.6, marginTop: 8, fontWeight: 600 }}>
                    {tx.por} {frase.autor}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>{tx.toquePraDefinir}</div>
            )}
          </div>
        )}


        {!modoRestrito && destaque && (
          <div style={{ margin: '24px 22px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {tx.fotoDestaque} — {tx.dia} {destaque.dia}
            </div>
            {destaque.autor && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>📸 {destaque.autor}</div>
            )}
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(245,158,11,0.3)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={destaque.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, textAlign: 'center' }}>
              ❤️ {destaque.curtidas} {destaque.curtidas !== 1 ? tx.curtidas : tx.curtida}
            </div>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>

      {showFraseModal && (
        <div className="overlay-bg" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="overlay-enter" style={{ background: '#1a1a2e', border: '1px solid var(--border-strong)', borderRadius: 24, padding: '28px 24px', width: '90%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <h2 style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {podeEditarFrase ? tx.editarFrase : tx.fraseDoDiaTitulo}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              {podeEditarFrase ? `${tx.editandoComo} ${sessao.nome}` : `${tx.definindoComo} ${sessao.nome}`}
            </p>
            <textarea
              value={fraseInput} onChange={e => setFraseInput(e.target.value)}
              placeholder={tx.digiteFrase} rows={3}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--border-strong)', borderRadius: 14, fontSize: 14, color: 'var(--text)', outline: 'none', marginBottom: 12, fontFamily: 'var(--font-inter), sans-serif', resize: 'none' }}
            />
            {fraseErro && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 10 }}>{fraseErro}</p>}
            <button onClick={salvarFrase} disabled={salvandoFrase} style={{ width: '100%', padding: 14, background: 'var(--gradient)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: salvandoFrase ? 'not-allowed' : 'pointer', opacity: salvandoFrase ? 0.6 : 1, color: 'var(--text)', marginBottom: 10, fontFamily: 'var(--font-syne), sans-serif' }}>{salvandoFrase ? tx.salvando : tx.salvar}</button>
            {podeEditarFrase && (
              <button onClick={excluirFrase} disabled={salvandoFrase} style={{ width: '100%', padding: 14, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: salvandoFrase ? 'not-allowed' : 'pointer', opacity: salvandoFrase ? 0.6 : 1, color: '#F87171', marginBottom: 10, fontFamily: 'var(--font-syne), sans-serif' }}>{tx.excluirFrase}</button>
            )}
            <button onClick={() => setShowFraseModal(false)} disabled={salvandoFrase} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: salvandoFrase ? 'not-allowed' : 'pointer' }}>{tx.cancelar}</button>
          </div>
        </div>
      )}
    </div>
  )
}
