'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { AREAS, AREA_APOIO, ICONE_AREA } from '@/lib/areas'
import { EQUIPES } from '@/lib/equipes'
import { equipeComMenosGente } from '@/app/actions/supervisor'

// Opções de equipe do Apoio: as 4 equipes, sem escala, e "Aleatório" (a que tem menos gente)
const OPCOES_EQUIPE = [
  ...EQUIPES.map(e => ({ id: e.id, nome: e.nome.replace('Equipe ', ''), cor: e.cor })),
  { id: 'sem_escala', nome: 'Sem escala', cor: '#9CA3AF' },
  { id: 'aleatorio', nome: 'Aleatório', cor: '#A78BFA' },
]

const hue = nome => [...nome].reduce((h, c) => h + c.charCodeAt(0), 0) * 37 % 360
const iniciais = nome => nome.split(' ').map(p => p[0]).slice(0, 2).join('')

// Foto de perfil (vem do app da coordenação, em staff.avatar_url); sem foto, iniciais coloridas
export function AvatarPessoa({ nome, url, tamanho = 38 }) {
  return (
    <span style={{
      position: 'relative', flex: 'none', width: tamanho, height: tamanho, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center',
      fontWeight: 700, fontSize: tamanho * 0.36, background: `hsl(${hue(nome)} 50% 24%)`, color: `hsl(${hue(nome)} 90% 86%)`,
      boxShadow: `inset 0 0 0 1px hsl(${hue(nome)} 60% 40% / 0.5)`,
    }}>
      {url
        ? <Image src={url} alt="" fill sizes={`${tamanho * 2}px`} style={{ objectFit: 'cover', objectPosition: 'center 32%' }} />
        : iniciais(nome)}
    </span>
  )
}

// Foto redonda que, ao tocar, abre inteira em tela cheia (sem o recorte do círculo), como no perfil da coordenação.
// Sem foto, mostra só as iniciais. O overlay vai para o body para não ficar preso no portal do fluxo.
function FotoAmpliavel({ nome, url, tamanho }) {
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    if (!aberta) return
    const fechar = e => { if (e.key === 'Escape') setAberta(false) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [aberta])

  if (!url) return <AvatarPessoa nome={nome} url={null} tamanho={tamanho} />

  return (
    <>
      <button onClick={() => setAberta(true)} aria-label={`Ver foto de ${nome}`} style={{ padding: 0, border: 'none', background: 'none', borderRadius: '50%', cursor: 'zoom-in', display: 'block' }}>
        <AvatarPessoa nome={nome} url={url} tamanho={tamanho} />
      </button>
      {aberta && createPortal(
        <div role="dialog" aria-label={`Foto de ${nome}`} onClick={() => setAberta(false)} style={{
          position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px))',
        }}>
          <button onClick={() => setAberta(false)} style={{
            position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 12, minHeight: 44, padding: '0 16px', borderRadius: 12,
            border: '1px solid var(--border-strong)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Fechar</button>
          <div style={{ position: 'relative', width: '100%', maxWidth: 384, height: '68dvh' }}>
            <Image src={url} alt={nome} fill sizes="384px" style={{ objectFit: 'contain' }} />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

const botaoBase = { borderRadius: 14, fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 15, minHeight: 50, cursor: 'pointer', border: 'none' }

/**
 * Dá função a quem entrou no app, uma pessoa por vez (tela cheia).
 * `pessoas`: nomes na ordem da fila. `onSalvar(nome, areas, equipe)` devolve true se salvou.
 */
export function FluxoSemFuncao({ pessoas, onSalvar, onFechar, inicial, edicao = false }) {
  // Função e equipe que a pessoa já tem (vazio para quem está sem função)
  const base = n => {
    const c = inicial?.(n)
    return { areas: AREAS.filter(a => c?.areas_aprovadas?.includes(a)), equipe: c?.equipe_atribuida ?? null }
  }
  const [fila, setFila] = useState(pessoas)
  const [i, setI] = useState(0)
  const [pulados, setPulados] = useState([])
  const [salvos, setSalvos] = useState(0)
  const [areas, setAreas] = useState(() => base(pessoas[0]).areas)
  const [equipe, setEquipe] = useState(() => base(pessoas[0]).equipe)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(false)

  const nome = fila[i]
  const acabou = i >= fila.length

  function proximo(pulou) {
    if (pulou) setPulados(p => [...p, nome])
    const prox = base(fila[i + 1])
    setAreas(prox.areas); setEquipe(prox.equipe); setErro(false)
    setI(n => n + 1)
  }

  function alternar(area) {
    setAreas(atual => AREAS.filter(a => (a === area ? !atual.includes(a) : atual.includes(a))))
    if (area === AREA_APOIO) setEquipe(null)
  }

  async function escolherEquipe(id) {
    if (id !== 'aleatorio') return setEquipe(id)
    try { setEquipe(await equipeComMenosGente()) } catch { setEquipe('sem_escala') }
  }

  async function salvar() {
    setSalvando(true); setErro(false)
    const ok = await onSalvar(nome, areas, areas.includes(AREA_APOIO) ? (equipe || 'sem_escala') : null)
    setSalvando(false)
    if (!ok) return setErro(true)
    if (edicao) return onFechar()
    setSalvos(n => n + 1)
    proximo(false)
  }

  function voltarAosPulados() {
    const primeiro = base(pulados[0])
    setFila(pulados); setPulados([]); setI(0); setAreas(primeiro.areas); setEquipe(primeiro.equipe)
  }

  // Na edição pode salvar sem nenhuma função (tira a pessoa de todas)
  const podeSalvar = (edicao || areas.length > 0) && !salvando

  // Portal no body: um ancestral com transform (animação da aba) prenderia o position: fixed
  return createPortal(
    <div role="dialog" aria-label="Dar função a quem está sem função" style={{
      position: 'fixed', inset: 0, zIndex: 350, background: 'var(--bg-tela)', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 10px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {edicao ? 'Editar função' : acabou ? 'Sem função' : `Sem função · ${i + 1} de ${fila.length}`}
        </div>
        <button onClick={onFechar} style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Fechar
        </button>
      </div>

      {!acabou && !edicao && (
        <div style={{ display: 'flex', gap: 5, padding: '0 16px 6px' }} aria-hidden="true">
          {fila.map((_, k) => (
            <div key={k} style={{ flex: 1, height: 4, borderRadius: 4, background: k < i ? 'var(--accent)' : k === i ? 'var(--accent-light)' : 'var(--border-strong)' }} />
          ))}
        </div>
      )}

      {acabou ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.14)', color: '#4ADE80', display: 'grid', placeItems: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
          </div>
          <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 20, fontWeight: 700 }}>
            {salvos === 1 ? '1 pessoa com função' : `${salvos} pessoas com função`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280 }}>
            {pulados.length ? `${pulados.length} ficou${pulados.length === 1 ? '' : 'ram'} para depois e continua${pulados.length === 1 ? '' : 'm'} sem função.` : 'Quem entrar no app aparece aqui de novo.'}
          </div>
          {pulados.length > 0 && (
            <button onClick={voltarAosPulados} style={{ ...botaoBase, width: '100%', maxWidth: 280, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)' }}>
              Voltar aos pulados
            </button>
          )}
          <button onClick={onFechar} style={{ ...botaoBase, width: '100%', maxWidth: 280, background: 'var(--gradient)', color: '#fff' }}>Concluir</button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
              <FotoAmpliavel nome={nome} url={inicial?.(nome)?.avatar} tamanho={96} />
              <div style={{ fontFamily: 'var(--font-syne), sans-serif', fontSize: 22, fontWeight: 700 }}>{nome}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Que funções esta pessoa vai ter?</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {AREAS.map(area => {
                const on = areas.includes(area)
                return (
                  <button key={area} onClick={() => alternar(area)} aria-pressed={on} style={{
                    position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', minHeight: 56, borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                    border: on ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)', background: on ? 'var(--accent-bg)' : 'var(--bg-card)',
                    color: 'var(--text)', fontSize: 13, fontWeight: 600, lineHeight: 1.2, fontFamily: 'var(--font-inter), sans-serif',
                  }}>
                    {ICONE_AREA[area] && <img src={ICONE_AREA[area]} alt="" style={{ width: 30, height: 30, objectFit: 'contain', flex: 'none' }} />}
                    <span>{area}</span>
                    {on && (
                      <span style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {areas.includes(AREA_APOIO) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 14, background: 'var(--bg-card)', border: '1px dashed var(--border-strong)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equipe do Apoio</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {OPCOES_EQUIPE.map(e => {
                    const on = equipe === e.id
                    return (
                      <button key={e.id} onClick={() => escolherEquipe(e.id)} aria-pressed={on} style={{
                        display: 'flex', alignItems: 'center', gap: 7, minHeight: 38, padding: '8px 13px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        border: on ? `1px solid ${e.cor}` : '1px solid var(--border-strong)', background: on ? 'var(--accent-bg)' : 'var(--bg-card)', color: on ? '#fff' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-inter), sans-serif',
                      }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: e.cor }} />
                        {e.nome}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--nav-bg)', padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))' }}>
            {erro && <div style={{ fontSize: 12, color: '#F87171', textAlign: 'center', marginBottom: 10 }}>Não foi possível salvar agora. Verifique sua internet e tente de novo.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: edicao ? '1fr' : '1fr 1.6fr', gap: 8 }}>
              {!edicao && (
                <button onClick={() => proximo(true)} disabled={salvando} style={{ ...botaoBase, fontWeight: 600, fontSize: 14, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)' }}>
                  Pular
                </button>
              )}
              <button onClick={salvar} disabled={!podeSalvar} style={{
                ...botaoBase, color: podeSalvar ? '#fff' : 'var(--text-muted)',
                background: podeSalvar ? 'var(--gradient)' : 'var(--bg-card-hover)', cursor: podeSalvar ? 'pointer' : 'default',
              }}>
                {salvando ? 'Salvando...' : edicao ? 'Salvar' : i + 1 < fila.length ? 'Salvar e próximo' : 'Salvar e terminar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  )
}
