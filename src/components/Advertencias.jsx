import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const NIVEIS_SUPERVISOR = ['maximo', 'alto', 'medio', 'basico']

function CartaoAdv({ adv, onToggle, onConfirmar, onNegar, isSupervisor }) {
  const hora = new Date(adv.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const aguardando = adv.status === 'aguardando'
  const negada = adv.status === 'negada'

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 16, marginBottom: 8,
      background: aguardando
        ? 'rgba(234,179,8,0.07)'
        : negada
          ? 'rgba(100,100,100,0.06)'
          : adv.pago
            ? 'var(--bg-card)'
            : 'rgba(239,68,68,0.08)',
      border: aguardando
        ? '1px solid rgba(234,179,8,0.3)'
        : negada
          ? '1px solid var(--border)'
          : adv.pago
            ? '1px solid var(--border)'
            : '1px solid rgba(239,68,68,0.28)',
      opacity: (adv.pago || negada) ? 0.45 : 1,
      transition: 'opacity 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text)',
            fontFamily: 'Syne, sans-serif',
            textDecoration: (adv.pago || negada) ? 'line-through' : 'none'
          }}>{adv.aluno}</div>
          {adv.motivo && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
              {adv.motivo}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🕐 {hora}</span>
            {aguardando && <span style={{ color: '#EAB308', fontWeight: 700 }}>· Aguardando avaliação</span>}
            {negada && <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>· Não considerada</span>}
          </div>
        </div>

        {/* Botão pago — só para aprovadas */}
        {!aguardando && !negada && (
          <button onClick={() => onToggle(adv)} title={adv.pago ? 'Desfazer' : 'Marcar como paga'} style={{
            width: 40, height: 40, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
            border: adv.pago ? '1px solid var(--border)' : '1px solid rgba(34,197,94,0.4)',
            background: adv.pago ? 'var(--bg-card)' : 'rgba(34,197,94,0.12)',
            color: adv.pago ? 'var(--text-faint)' : '#4ADE80',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {adv.pago ? '↩' : '✓'}
          </button>
        )}
      </div>

      {/* Botões de avaliação — só para supervisores em advertências aguardando */}
      {isSupervisor && aguardando && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onConfirmar(adv)} style={{
            flex: 1, padding: '10px', borderRadius: 12, border: 'none',
            background: 'rgba(34,197,94,0.15)', color: '#4ADE80',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            border: '1px solid rgba(34,197,94,0.3)'
          }}>✓ Confirmar</button>
          <button onClick={() => onNegar(adv)} style={{
            flex: 1, padding: '10px', borderRadius: 12, border: 'none',
            background: 'rgba(100,100,100,0.12)', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            border: '1px solid var(--border)'
          }}>✕ Negar</button>
        </div>
      )}
    </div>
  )
}

export default function Advertencias({ onVoltar, sessao }) {
  const [alunos, setAlunos] = useState([])
  const [advertencias, setAdvertencias] = useState([])
  const [alunoSel, setAlunoSel] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const isSupervisor = NIVEIS_SUPERVISOR.includes(sessao?.nivel)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)
    const [{ data: al }, { data: adv }] = await Promise.all([
      supabase.from('alunos').select('*').order('nome'),
      supabase.from('advertencias').select('*').order('created_at', { ascending: false })
    ])
    setAlunos(al || [])
    setAdvertencias(adv || [])
    setLoading(false)
  }

  async function salvarNovoAluno() {
    const nome = novoNome.trim()
    if (!nome) return
    const { data, error } = await supabase.from('alunos').insert({ nome }).select().single()
    if (!error && data) {
      setAlunos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setAlunoSel(nome)
    }
    setNovoNome('')
    setShowInput(false)
  }

  async function registrarAdvertencia() {
    if (!alunoSel || salvando) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('advertencias')
      .insert({ aluno: alunoSel, motivo: motivo.trim() || null, pago: false, status: 'aguardando' })
      .select()
      .single()
    if (!error && data) setAdvertencias(prev => [data, ...prev])
    setAlunoSel(null)
    setMotivo('')
    setSalvando(false)
  }

  async function confirmarAdvertencia(adv) {
    setAdvertencias(prev => prev.map(a => a.id === adv.id ? { ...a, status: 'confirmada' } : a))
    await supabase.from('advertencias').update({ status: 'confirmada' }).eq('id', adv.id)
  }

  async function negarAdvertencia(adv) {
    setAdvertencias(prev => prev.map(a => a.id === adv.id ? { ...a, status: 'negada' } : a))
    await supabase.from('advertencias').update({ status: 'negada' }).eq('id', adv.id)
  }

  async function togglePago(adv) {
    const novoPago = !adv.pago
    setAdvertencias(prev => prev.map(a => a.id === adv.id ? { ...a, pago: novoPago } : a))
    await supabase.from('advertencias').update({ pago: novoPago }).eq('id', adv.id)
  }

  const aguardando = advertencias.filter(a => a.status === 'aguardando')
  const pendentes  = advertencias.filter(a => a.status === 'confirmada' && !a.pago)
  const pagas      = advertencias.filter(a => a.status === 'confirmada' && a.pago)
  const negadas    = advertencias.filter(a => a.status === 'negada')

  const totalAguardando = aguardando.length

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-tela)', zIndex: 10 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--bg-card)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: '1px solid var(--border)', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Advertências</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {pendentes.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F87171' }}>
              {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
            </span>
          )}
          {isSupervisor && totalAguardando > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#EAB308' }}>
              · {totalAguardando} em avaliação
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 22px 0' }}>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
          Registrar advertência
        </div>

        {/* Chips de alunos */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {alunos.map(a => (
            <button key={a.id} onClick={() => { setAlunoSel(alunoSel === a.nome ? null : a.nome); setMotivo('') }} style={{
              padding: '9px 18px', borderRadius: 22,
              border: alunoSel === a.nome ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
              background: alunoSel === a.nome ? 'var(--accent-bg)' : 'var(--bg-card)',
              color: alunoSel === a.nome ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s ease'
            }}>{a.nome}</button>
          ))}

          {!showInput ? (
            <button onClick={() => setShowInput(true)} style={{
              padding: '9px 18px', borderRadius: 22,
              border: '1.5px dashed var(--border-strong)',
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}>+ novo aluno</button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 4 }}>
              <input
                autoFocus
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') salvarNovoAluno()
                  if (e.key === 'Escape') { setShowInput(false); setNovoNome('') }
                }}
                placeholder="Nome do aluno..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12,
                  background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
                  color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif'
                }}
              />
              <button onClick={salvarNovoAluno} style={{
                padding: '10px 16px', borderRadius: 12, border: 'none',
                background: 'var(--accent)', color: 'white',
                fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}>OK</button>
              <button onClick={() => { setShowInput(false); setNovoNome('') }} style={{
                padding: '10px 12px', borderRadius: 12,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer'
              }}>✕</button>
            </div>
          )}
        </div>

        {/* Motivo + botão registrar */}
        {alunoSel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
            <textarea
              autoFocus
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder={`Motivo da advertência de ${alunoSel}...`}
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 14,
                background: 'var(--input-bg)', border: '1px solid var(--border-strong)',
                color: 'var(--text)', fontSize: 14, outline: 'none',
                resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', lineHeight: 1.5
              }}
            />
            <button onClick={registrarAdvertencia} disabled={salvando} style={{
              width: '100%', padding: '15px', borderRadius: 16, border: 'none',
              background: salvando ? 'rgba(220,38,38,0.5)' : '#DC2626',
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: salvando ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne, sans-serif', boxShadow: '0 4px 20px rgba(220,38,38,0.3)'
            }}>
              ⚠️ Registrar advertência para {alunoSel}
            </button>
          </div>
        )}
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 0' }} />

      {/* Lista */}
      <div style={{ padding: '20px 22px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
        ) : advertencias.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma advertência registrada</div>
          </div>
        ) : (
          <>
            {/* Em avaliação */}
            {aguardando.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#EAB308', marginBottom: 12 }}>
                  Em avaliação · {aguardando.length}
                </div>
                {aguardando.map(adv => (
                  <CartaoAdv key={adv.id} adv={adv} onToggle={togglePago} onConfirmar={confirmarAdvertencia} onNegar={negarAdvertencia} isSupervisor={isSupervisor} />
                ))}
              </div>
            )}

            {/* Pendentes */}
            {pendentes.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#F87171', marginBottom: 12 }}>
                  Pendentes · {pendentes.length}
                </div>
                {pendentes.map(adv => (
                  <CartaoAdv key={adv.id} adv={adv} onToggle={togglePago} onConfirmar={confirmarAdvertencia} onNegar={negarAdvertencia} isSupervisor={isSupervisor} />
                ))}
              </div>
            )}

            {/* Pagas */}
            {pagas.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Penalidade cumprida · {pagas.length}
                </div>
                {pagas.map(adv => (
                  <CartaoAdv key={adv.id} adv={adv} onToggle={togglePago} onConfirmar={confirmarAdvertencia} onNegar={negarAdvertencia} isSupervisor={isSupervisor} />
                ))}
              </div>
            )}

            {/* Negadas */}
            {negadas.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Não consideradas · {negadas.length}
                </div>
                {negadas.map(adv => (
                  <CartaoAdv key={adv.id} adv={adv} onToggle={togglePago} onConfirmar={confirmarAdvertencia} onNegar={negarAdvertencia} isSupervisor={isSupervisor} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
