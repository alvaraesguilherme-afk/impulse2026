'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTexto } from '@/lib/i18n'
import { thumbUrl, onThumbError } from '@/lib/imageThumb'
import { ehAdmin, ehSupervisor } from '@/lib/permissoes'
import { TOTAL_DIAS } from '@/lib/calendario'
import { executar } from '@/lib/offline'
import { useEstadoServidor } from '@/lib/hooks'
import { enviarFoto } from '@/app/actions/mural'
import { guardarFoto, contarFotos, montarForm, processarFotos } from '@/lib/fotos-offline'

/* eslint-disable @next/next/no-img-element -- fotos do Supabase: miniatura via render do Storage */

// Mural de madeira com polaroids presas, em zigue-zague (uma por vez, alternando
// os lados) e ligadas por raízes. Cada foto tem um jeito fixo de ser presa,
// inclinação, dobra e balanço sorteados a partir do id, então não mudam entre
// visitas. Foto nova (do próprio usuário ou que chegou ao atualizar) é colada
// com animação: a raiz cresce, a polaroid desce e é presa. Estilos em
// globals.css (.mural, .polaroid, .mural-*).

const LARGURA_MAX = 520
const PRENDEDORES = ['tacha', 'fitas', 'clipe', 'fita', 'tacha', 'fita-canto', 'clipe']
const DOBRAS = ['', 'tr', '', 'br', '', '', 'bl']
const RABISCOS = ['♥', '★', ':)', '♥♥']
const TACHAS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']

// Aleatório com semente; descarta as primeiras saídas (com semente pequena elas
// saem quase iguais e todas as fotos tombavam pro mesmo lado).
function rng(seed) {
  let s = (Math.abs(seed) % 2147483646) + 1
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  r(); r(); r()
  return r
}

function gerarMadeira() {
  const W = 360, H = 720, c = document.createElement('canvas')
  c.width = W * 2; c.height = H * 2
  const g = c.getContext('2d'); g.scale(2, 2)
  const r = rng(7)
  const tons = ['#8A5A32', '#7E5230', '#93613A', '#845634', '#7A4F2D']
  const alt = 90
  for (let y = 0, k = 0; y < H; y += alt, k++) {
    g.fillStyle = tons[k % tons.length]; g.fillRect(0, y, W, alt)
    for (let v = 0; v < 26; v++) {
      const base = y + r() * alt, amp = 1 + r() * 4, freq = 0.01 + r() * 0.03, fase = r() * 10
      g.beginPath()
      for (let x = 0; x <= W; x += 6) g.lineTo(x, base + Math.sin(x * freq + fase) * amp + Math.sin(x * 0.07 + fase) * 0.8)
      g.strokeStyle = r() > 0.5 ? 'rgba(60,32,14,0.22)' : 'rgba(190,140,90,0.12)'
      g.lineWidth = 0.6 + r() * 1.4; g.stroke()
    }
    if (r() > 0.35) {
      const nx = 30 + r() * (W - 60), ny = y + 20 + r() * (alt - 40)
      for (let a = 7; a > 0; a--) { g.beginPath(); g.ellipse(nx, ny, a * 3.2, a * 1.6, 0, 0, Math.PI * 2); g.strokeStyle = `rgba(55,28,12,${0.12 + a * 0.02})`; g.lineWidth = 1; g.stroke() }
      g.beginPath(); g.ellipse(nx, ny, 4, 2.2, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(45,22,10,0.55)'; g.fill()
    }
    g.fillStyle = 'rgba(25,12,5,0.75)'; g.fillRect(0, y + alt - 2, W, 2)
    g.fillStyle = 'rgba(255,220,180,0.08)'; g.fillRect(0, y, W, 1)
    const junta = 40 + r() * (W - 80); g.fillStyle = 'rgba(25,12,5,0.6)'; g.fillRect(junta, y, 2, alt)
    ;[[junta - 9, y + 12], [junta + 11, y + 12], [junta - 9, y + alt - 14], [junta + 11, y + alt - 14]].forEach(([px, py]) => {
      g.beginPath(); g.arc(px, py, 2.2, 0, Math.PI * 2); g.fillStyle = '#3b2a1e'; g.fill()
      g.beginPath(); g.arc(px - 0.6, py - 0.6, 0.9, 0, Math.PI * 2); g.fillStyle = 'rgba(255,240,220,0.35)'; g.fill()
    })
  }
  return c.toDataURL('image/jpeg', 0.85)
}

// Posição e "personalidade" de cada polaroid
function montarLayout(fotos, largura) {
  const w = Math.round(Math.min(160, Math.max(118, largura * 0.38)))
  let y = 34
  return fotos.map((f, k) => {
    const r = rng(f.id * 7919 + 13)
    const x = k % 2 === 0 ? 18 + r() * 28 : largura - w - 18 - r() * 28
    const prendedor = PRENDEDORES[f.id % PRENDEDORES.length]
    const giro = (r() < 0.5 ? -1 : 1) * (1.5 + r() * 7)
    const balanca = (prendedor === 'tacha' || prendedor === 'clipe') && r() < 0.45
    const item = {
      foto: f, x, y, w, giro, prendedor, balanca,
      dobra: DOBRAS[(f.id * 3) % DOBRAS.length],
      rabisco: f.id % 4 === 2 ? { txt: RABISCOS[f.id % RABISCOS.length], lado: k % 2 ? 'left' : 'right' } : null,
      amp: (r() < 0.5 ? -1 : 1) * (3 + r() * 3), dur: 3 + r() * 2.2,
      cor: TACHAS[f.id % TACHAS.length],
    }
    y += w * 0.9 + r() * 28
    return item
  })
}

function bez(p0, p1, p2, p3, t) { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3 }

// Raiz entre duas fotos: caminho principal, raizinhas e folhinhas
function gerarRaiz(a, b, seed) {
  const r = rng(seed)
  const dx = b.x - a.x, dy = b.y - a.y
  const c1 = { x: a.x + dx * 0.15 + (r() - 0.5) * 70, y: a.y + Math.max(40, dy * 0.45) }
  const c2 = { x: b.x - dx * 0.15 + (r() - 0.5) * 70, y: b.y - Math.max(40, dy * 0.45) }
  const d = `M${a.x} ${a.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`
  const ramos = []
  for (let k = 0, n = 3 + Math.floor(r() * 3); k < n; k++) {
    const t = 0.15 + r() * 0.7
    const x = bez(a.x, c1.x, c2.x, b.x, t), y = bez(a.y, c1.y, c2.y, b.y, t)
    const lado = r() > 0.5 ? 1 : -1, comp = 16 + r() * 26
    const ex = x + lado * comp, ey = y + (r() - 0.3) * comp
    ramos.push({ d: `M${x} ${y} Q${x + lado * comp * 0.5} ${y + (r() - 0.5) * 14} ${ex} ${ey}`, w: 1.2 + r() * 1.4 })
    if (r() > 0.4) ramos.push({ d: `M${ex} ${ey} q${lado * 6} ${4 + r() * 6} ${lado * (8 + r() * 6)} ${2 + r() * 8}`, w: 0.9, escuro: true })
  }
  const folhas = []
  for (let k = 0, n = 1 + Math.floor(r() * 3); k < n; k++) {
    const t = 0.2 + r() * 0.6
    const x = a.x + dx * t + (r() - 0.5) * 30, y = a.y + dy * t
    folhas.push({ x, y, ang: r() * 120 - 60, cor: '#6BA34E' }, { x, y, ang: r() * 120 + 120, cor: '#4D7C3A' })
  }
  return { d, ramos, folhas }
}

function Raiz({ raiz, nova }) {
  return (
    <g className={nova ? 'raiz-nova' : undefined}>
      <path className="raiz-linha" pathLength={1} d={raiz.d} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={7.5} strokeLinecap="round" transform="translate(2 4)" />
      <path className="raiz-linha" pathLength={1} d={raiz.d} fill="none" stroke="#2B1A0F" strokeWidth={6.5} strokeLinecap="round" />
      <path className="raiz-linha" pathLength={1} d={raiz.d} fill="none" stroke="#7A4E26" strokeWidth={4.5} strokeLinecap="round" />
      <path className="raiz-linha" pathLength={1} d={raiz.d} fill="none" stroke="#A87443" strokeWidth={1.3} strokeLinecap="round" opacity={0.8} transform="translate(-1 -1)" />
      {raiz.ramos.map((m, i) => <path key={i} className="raiz-linha" pathLength={1} d={m.d} fill="none" stroke={m.escuro ? '#2B1A0F' : '#7A4E26'} strokeWidth={m.w} strokeLinecap="round" />)}
      {raiz.folhas.map((f, i) => <ellipse key={i} className="raiz-folha" cx={f.x} cy={f.y} rx={7} ry={3.2} fill={f.cor} transform={`rotate(${f.ang} ${f.x} ${f.y}) translate(7 0)`} />)}
    </g>
  )
}

function Prendedor({ tipo, cor }) {
  if (tipo === 'tacha') return <span className="tacha" style={{ background: `radial-gradient(circle at 35% 35%, #fff8, ${cor} 45%)` }} />
  if (tipo === 'fita') return <span className="fita" />
  if (tipo === 'fitas') return <><span className="fita esq" /><span className="fita dir" /></>
  if (tipo === 'fita-canto') return <><span className="fita esq" /><span className="fita baixo" /></>
  return <span className="clipe" />
}

const fmt = (iso, op) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...op })
function rotuloDia(dia) {
  if (dia === 0) return 'Chegada'
  if (dia <= TOTAL_DIAS) return `Dia ${dia} da Escola`
  return 'Depois da Escola'
}
const dataBR = iso => iso.split('-').reverse().join('/')

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

export function Mural({ sessao, fase, liberaEm, fotos: fotosServidor }) {
  const tx = useTexto()
  const router = useRouter()
  const [fotos, setFotos] = useEstadoServidor(fotosServidor)
  const [madeira, setMadeira] = useState(null)
  const [largura, setLargura] = useState(360)
  const [aberta, setAberta] = useState(null)        // índice da foto aberta
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [chegando, setChegando] = useState(() => new Set())
  const [escolhendo, setEscolhendo] = useState(false)
  const [modoTeste, setModoTeste] = useState(false)
  const [pendente, setPendente] = useState(null)    // { file, preview }
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState(false)
  const [guardadaOffline, setGuardadaOffline] = useState(false)
  const [naFila, setNaFila] = useState(0)
  const quadro = useRef(null)
  const conhecidas = useRef(null)
  const inputGaleria = useRef(null)
  const inputCamera = useRef(null)

  const podePostar = fase === 'aberto' || modoTeste

  // eslint-disable-next-line react-hooks/set-state-in-effect -- canvas só existe no navegador
  useEffect(() => { setMadeira(gerarMadeira()) }, [])

  useLayoutEffect(() => {
    const el = quadro.current?.parentElement
    if (!el) return
    const medir = () => setLargura(Math.min(LARGURA_MAX, el.clientWidth))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    contarFotos().then(setNaFila)
    const atualizar = () => contarFotos().then(setNaFila)
    window.addEventListener('impulse-fila', atualizar)
    return () => window.removeEventListener('impulse-fila', atualizar)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('foto-aberta', aberta !== null)
    return () => document.body.classList.remove('foto-aberta')
  }, [aberta])

  const layout = useMemo(() => montarLayout(fotos, largura), [fotos, largura])
  const raizes = useMemo(() => layout.slice(1).map((p, k) => {
    const ant = layout[k]
    return { id: p.foto.id, raiz: gerarRaiz({ x: ant.x + ant.w / 2, y: ant.y + ant.w + 16 }, { x: p.x + p.w / 2, y: p.y + 4 }, p.foto.id * 53 + 1) }
  }), [layout])
  const ultimo = layout[layout.length - 1]
  const altura = ultimo ? ultimo.y + ultimo.w + 200 : 460

  // Foto que não estava no mural quando a tela abriu é "colada" com animação
  useEffect(() => {
    if (conhecidas.current === null) { conhecidas.current = new Set(fotos.map(f => f.id)); return }
    const novas = fotos.filter(f => !conhecidas.current.has(f.id))
    if (novas.length === 0) return
    novas.forEach(f => conhecidas.current.add(f.id))
    setChegando(new Set(novas.map(f => f.id)))
    const alvo = layout.find(p => p.foto.id === novas[novas.length - 1].id)
    if (alvo && quadro.current) {
      const topo = quadro.current.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: Math.max(0, topo + alvo.y - 180), behavior: 'smooth' })
    }
    const t = setTimeout(() => setChegando(new Set()), 1900)
    return () => clearTimeout(t)
  }, [fotos, layout])

  function escolherArquivo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    setEscolhendo(false)
    if (!file) return
    setPendente({ file, preview: URL.createObjectURL(file) })
  }

  function cancelarEnvio() {
    if (pendente) URL.revokeObjectURL(pendente.preview)
    setPendente(null)
  }

  async function colarFoto() {
    if (!pendente) return
    const file = pendente.file
    cancelarEnvio()
    setEnviando(true)
    setErroEnvio(false)
    setGuardadaOffline(false)
    const arquivo = `dia0_${Date.now()}.jpg`
    let blob
    try { blob = await comprimirImagem(file) } catch { setErroEnvio(true); setEnviando(false); return }
    const item = { blob, arquivo, legenda: '' }

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        if (!navigator.onLine) break
        await enviarFoto(montarForm(item))
        setEnviando(false)
        router.refresh()
        return
      } catch (err) {
        if (!(err instanceof TypeError)) { setErroEnvio(true); setEnviando(false); return }
        if (tentativa < 2) await new Promise(r => setTimeout(r, 1200))
      }
    }
    // Sem sinal: guarda no aparelho e sobe sozinha quando a conexão voltar
    try {
      await guardarFoto(item)
      setNaFila(await contarFotos())
      setGuardadaOffline(true)
      processarFotos()
    } catch {
      setErroEnvio(true)
    }
    setEnviando(false)
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

  function apagarFoto(foto) {
    setAberta(null)
    setConfirmarExclusao(false)
    setFotos(prev => prev.filter(f => f.id !== foto.id))
    executar('mural.deletarFoto', foto.id)
  }

  const fotoAberta = aberta !== null ? fotos[aberta] : null
  const podeApagar = fotoAberta && (fotoAberta.autor === sessao.nome || ehSupervisor(sessao))
  const mudarAberta = passo => { setConfirmarExclusao(false); setAberta(i => (i + passo + fotos.length) % fotos.length) }

  return (
    <div className="mural tela-enter-mural" style={madeira ? { backgroundImage: `url(${madeira})` } : undefined}>
      <div className="mural-cab">
        <h2>{tx.feedImpulse}</h2>
        <span>{fotos.length} {fotos.length === 1 ? tx.foto : tx.fotos}</span>
      </div>

      <div className="mural-avisos">
        {fase === 'antes' && fotos.length > 0 && !modoTeste && <div className="mural-aviso">📷 As fotos serão liberadas em {dataBR(liberaEm)}</div>}
        {fase === 'depois' && fotos.length > 0 && !modoTeste && <div className="mural-aviso">O mural foi fechado pra novas fotos</div>}
        {enviando && <div className="mural-aviso"><span style={{ width: 14, height: 14, border: '2px solid #FDEBD3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Colando sua foto...</div>}
        {erroEnvio && <div className="mural-aviso erro">Não deu pra enviar a foto. Tente de novo.</div>}
        {guardadaOffline && <div className="mural-aviso atencao">Sinal fraco: sua foto ficou guardada no aparelho e vai pro mural sozinha quando a conexão voltar.</div>}
        {!enviando && naFila > 0 && <div className="mural-aviso atencao">{naFila} foto{naFila > 1 ? 's' : ''} esperando conexão pra ir pro mural</div>}
      </div>

      <div className="mural-quadro" ref={quadro} style={{ width: largura, height: altura }}>
        <svg className="mural-raizes" viewBox={`0 0 ${largura} ${altura}`} aria-hidden="true">
          {raizes.map(({ id, raiz }) => <Raiz key={id} raiz={raiz} nova={chegando.has(id)} />)}
        </svg>

        {fotos.length === 0 && (
          <div className="mural-bilhete" style={{ top: 70 }}>
            {fase === 'antes' && !modoTeste ? (
              <>As fotos serão liberadas em {dataBR(liberaEm)}<small>a partir da chegada na Escola</small></>
            ) : fase === 'depois' && !modoTeste ? (
              <>O mural foi fechado<small>obrigado por cada momento ♥</small></>
            ) : (
              <>Ainda não tem fotos no mural<small>coloque a primeira!</small></>
            )}
            {fase !== 'aberto' && !modoTeste && ehAdmin(sessao) && (
              <div><button type="button" onClick={() => setModoTeste(true)}>Liberar postagem</button></div>
            )}
          </div>
        )}

        {layout.map((p, k) => {
          const nova = chegando.has(p.foto.id)
          const classe = ['polaroid', nova ? 'chegando' : p.balanca ? 'balanca' : '', p.dobra ? `dobra-${p.dobra}` : ''].filter(Boolean).join(' ')
          return (
            <button key={p.foto.id} type="button" className={classe}
              aria-label={`Abrir foto de ${p.foto.autor ?? 'alguém'}`}
              onClick={() => { setAberta(k); setConfirmarExclusao(false) }}
              style={{ left: p.x, top: p.y, width: p.w, '--g': `${p.giro}deg`, '--amp': `${p.amp}deg`, '--dur': `${p.dur}s` }}>
              <Prendedor tipo={p.prendedor} cor={p.cor} />
              <img className="foto" src={thumbUrl(p.foto.url, { width: 320, height: 320 })} onError={onThumbError(p.foto.url)} alt="" loading="lazy" decoding="async" />
              <span className="leg">{p.foto.autor ?? ''}</span>
              {p.rabisco && <span className="rabisco" style={{ [p.rabisco.lado]: -5 }}>{p.rabisco.txt}</span>}
            </button>
          )
        })}
      </div>

      {podePostar && (
        <>
          {escolhendo && (
            <div className="mural-escolha">
              <button type="button" onClick={() => inputCamera.current?.click()}>📷 Tirar foto</button>
              <button type="button" onClick={() => inputGaleria.current?.click()}>🖼️ Escolher da galeria</button>
            </div>
          )}
          <button type="button" className="mural-fab" aria-label="Colocar foto no mural" aria-expanded={escolhendo} disabled={enviando}
            onClick={() => setEscolhendo(v => !v)}>{escolhendo ? '×' : '+'}</button>
          <input ref={inputGaleria} type="file" accept="image/*" onChange={escolherArquivo} hidden />
          <input ref={inputCamera} type="file" accept="image/*" capture="environment" onChange={escolherArquivo} hidden />
        </>
      )}

      {pendente && (
        <div className="mural-modal">
          <div className="mural-grande">
            <span className="fita" />
            <img src={pendente.preview} alt="Foto que vai pro mural" />
            <div className="autor">vai pro mural com o nome<span>{sessao.nome}</span></div>
          </div>
          <div className="mural-acoes">
            <button type="button" onClick={cancelarEnvio}>Cancelar</button>
            <button type="button" className="perigo-forte" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={colarFoto}>Colar no mural</button>
          </div>
        </div>
      )}

      {fotoAberta && (
        <div className="mural-modal" onClick={e => { if (e.target === e.currentTarget) setAberta(null) }}>
          <div className="mural-grande" key={fotoAberta.id}>
            <span className="fita" />
            <img src={thumbUrl(fotoAberta.url, { width: 800, height: 800 })} onError={onThumbError(fotoAberta.url)} alt="" decoding="async" />
            <div className="diaesc">{rotuloDia(fotoAberta.dia)}</div>
            <div className="dados">
              <span><b>Hora</b>{fmt(fotoAberta.created_at, { hour: '2-digit', minute: '2-digit' })}</span>
              <span><b>Dia</b>{fmt(fotoAberta.created_at, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
            {fotoAberta.autor && <div className="autor">postada por<span>{fotoAberta.autor}</span></div>}
            {fotoAberta.legenda && <div className="legenda">{fotoAberta.legenda}</div>}
          </div>
          <div className="mural-acoes">
            {fotos.length > 1 && <button type="button" aria-label="Foto anterior" onClick={() => mudarAberta(-1)}>‹</button>}
            <button type="button" onClick={() => setAberta(null)}>Fechar</button>
            {fotos.length > 1 && <button type="button" aria-label="Próxima foto" onClick={() => mudarAberta(1)}>›</button>}
          </div>
          <div className="mural-acoes">
            <button type="button" onClick={() => baixarFoto(fotoAberta.url)}>Baixar</button>
            {podeApagar && (!confirmarExclusao
              ? <button type="button" className="perigo" onClick={() => setConfirmarExclusao(true)}>Excluir</button>
              : <>
                  <button type="button" className="perigo-forte" onClick={() => apagarFoto(fotoAberta)}>{tx.confirmarExclusao}</button>
                  <button type="button" onClick={() => setConfirmarExclusao(false)}>{tx.cancelar}</button>
                </>)}
          </div>
        </div>
      )}
    </div>
  )
}
