import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { syncOp } from '../lib/offlineSync'

const CATEGORIAS = [
  { id: 'comida', label: '🍽️ Comida' },
  { id: 'limpeza', label: '🧽 Limpeza' },
]

const CACHE_KEY = 'impulse_lista_compras_cache'

function tituloLista(dataISO) {
  const d = new Date(dataISO)
  return `Lista de ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function agruparPorCategoria(lista) {
  return CATEGORIAS
    .map(cat => ({
      ...cat,
      itens: lista
        .filter(i => i.categoria === cat.id)
        .sort((a, b) => (a.comprado === b.comprado) ? 0 : a.comprado ? 1 : -1)
    }))
    .filter(g => g.itens.length > 0)
}

function ItemCard({ item, onToggle, onExcluir }) {
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 14, marginBottom: 8,
      background: item.comprado ? 'var(--bg-card)' : 'rgba(16,185,129,0.06)',
      border: item.comprado ? '1px solid var(--border)' : '1px solid rgba(16,185,129,0.25)',
      opacity: item.comprado ? 0.5 : 1, transition: 'opacity 0.2s'
    }}>
      <button onClick={() => onToggle(item)} title={item.comprado ? 'Desfazer' : 'Marcar como comprado'} style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
        border: item.comprado ? '1px solid var(--border)' : '1px solid rgba(16,185,129,0.4)',
        background: item.comprado ? 'var(--input-bg)' : 'rgba(16,185,129,0.15)',
        color: item.comprado ? 'var(--text-faint)' : '#4ADE80',
        fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {item.comprado ? '↩' : '✓'}
      </button>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textDecoration: item.comprado ? 'line-through' : 'none' }}>{item.item}</div>
        {item.quantidade && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.quantidade}</div>
        )}
      </div>

      {!confirmExcluir ? (
        <button onClick={() => setConfirmExcluir(true)} style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
          border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)',
          color: '#F87171', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>🗑️</button>
      ) : (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => { onExcluir(item); setConfirmExcluir(false) }} style={{
            padding: '6px 10px', borderRadius: 10, border: 'none',
            background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer'
          }}>Excluir</button>
          <button onClick={() => setConfirmExcluir(false)} style={{
            padding: '6px 10px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer'
          }}>Cancelar</button>
        </div>
      )}
    </div>
  )
}

function ListaCard({ lista, onToggle, onExcluir }) {
  const compradosCount = lista.itensDaLista.filter(i => i.comprado).length
  const grupos = agruparPorCategoria(lista.itensDaLista)

  return (
    <div style={{ background: 'rgba(250,204,21,0.04)', border: '1.5px solid rgba(250,204,21,0.5)', borderRadius: 20, padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{tituloLista(lista.criadoEm)}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: lista.todosComprados ? '#4ADE80' : 'var(--text-muted)' }}>
          {compradosCount} de {lista.itensDaLista.length} comprados
        </div>
      </div>
      {grupos.map(grupo => (
        <div key={grupo.id} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>
            {grupo.label} · {grupo.itens.length}
          </div>
          {grupo.itens.map(item => (
            <ItemCard key={item.id} item={item} onToggle={onToggle} onExcluir={onExcluir} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function ListaCompras({ onVoltar, sessao }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState('pendentes')

  const [itensRascunho, setItensRascunho] = useState([])
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [categoriaSel, setCategoriaSel] = useState(CATEGORIAS[0].id)
  const [criando, setCriando] = useState(false)

  useEffect(() => { carregarItens() }, [])

  useEffect(() => {
    if (!loading) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(itens)) } catch { /* localStorage indisponivel */ }
    }
  }, [itens, loading])

  async function carregarItens() {
    setLoading(true)
    const { data } = await supabase.from('lista_compras').select('*').order('created_at', { ascending: false })
    if (data) {
      setItens(data)
    } else {
      let cache = []
      try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || [] } catch { /* cache vazio/corrompido */ }
      setItens(cache)
    }
    setLoading(false)
  }

  function adicionarAoRascunho() {
    const nomeItem = nome.trim()
    if (!nomeItem) return
    setItensRascunho(prev => [...prev, { tempId: `rascunho_${Date.now()}`, item: nomeItem, quantidade: quantidade.trim() || null, categoria: categoriaSel }])
    setNome('')
    setQuantidade('')
  }

  function removerDoRascunho(tempId) {
    setItensRascunho(prev => prev.filter(i => i.tempId !== tempId))
  }

  async function criarLista() {
    if (itensRascunho.length === 0 || criando) return
    setCriando(true)
    const listaId = crypto.randomUUID()
    const agora = new Date().toISOString()
    const novosItens = itensRascunho.map((i, idx) => ({
      id: `tmp_${Date.now()}_${idx}`, item: i.item, quantidade: i.quantidade, categoria: i.categoria,
      comprado: false, criado_por: sessao?.nome || null, lista_id: listaId, created_at: agora
    }))
    setItens(prev => [...novosItens, ...prev])
    await syncOp('insert', 'lista_compras', novosItens.map(({ id: _id, ...linha }) => linha))
    setItensRascunho([])
    setCriando(false)
    setAba('pendentes')
  }

  async function toggleComprado(item) {
    const novoComprado = !item.comprado
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, comprado: novoComprado } : i))
    await syncOp('update', 'lista_compras', { values: { comprado: novoComprado }, filters: { id: item.id } })
  }

  async function excluirItem(item) {
    setItens(prev => prev.filter(i => i.id !== item.id))
    await syncOp('delete', 'lista_compras', { id: item.id })
  }

  const listasMap = {}
  itens.forEach(i => {
    const key = i.lista_id || 'sem-lista'
    if (!listasMap[key]) listasMap[key] = []
    listasMap[key].push(i)
  })
  const listas = Object.entries(listasMap)
    .map(([id, itensDaLista]) => ({ id, itensDaLista, criadoEm: itensDaLista[0]?.created_at, todosComprados: itensDaLista.every(i => i.comprado) }))
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))

  const listasPendentes = listas.filter(l => !l.todosComprados)
  const listasHistorico = listas.filter(l => l.todosComprados)
  const listasExibidas = aba === 'pendentes' ? listasPendentes : listasHistorico

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-tela)', zIndex: 10 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--bg-card)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: '1px solid var(--border)', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Lista de Compras</h2>
      </div>

      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
          Nova lista
        </div>

        {/* Categorias */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {CATEGORIAS.map(cat => (
            <button key={cat.id} onClick={() => setCategoriaSel(cat.id)} style={{
              padding: '9px 16px', borderRadius: 22,
              border: categoriaSel === cat.id ? '1px solid var(--accent-border)' : '1px solid var(--border-strong)',
              background: categoriaSel === cat.id ? 'var(--accent-bg)' : 'var(--bg-card)',
              color: categoriaSel === cat.id ? 'var(--accent-light)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s ease'
            }}>{cat.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarAoRascunho()}
            placeholder="Nome do item..."
            style={{ width: '100%', padding: '12px 14px', borderRadius: 14, background: 'var(--input-bg)', border: '1px solid var(--border-strong)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
          />
          <input
            value={quantidade}
            onChange={e => setQuantidade(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarAoRascunho()}
            placeholder="Quantidade (ex: 5kg, 2 caixas)..."
            style={{ width: '100%', padding: '12px 14px', borderRadius: 14, background: 'var(--input-bg)', border: '1px solid var(--border-strong)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
          />
          <button onClick={adicionarAoRascunho} disabled={!nome.trim()} style={{
            width: '100%', padding: '12px', borderRadius: 14, border: '1px dashed var(--border-strong)',
            background: 'transparent', color: !nome.trim() ? 'var(--text-faint)' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 700, cursor: !nome.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif'
          }}>
            + Adicionar item à lista
          </button>
        </div>

        {/* Rascunho */}
        {itensRascunho.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              Itens dessa lista · {itensRascunho.length}
            </div>
            {itensRascunho.map(i => (
              <div key={i.tempId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{i.item}</span>
                  {i.quantidade && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> · {i.quantidade}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}>{CATEGORIAS.find(c => c.id === i.categoria)?.label}</span>
                </div>
                <button onClick={() => removerDoRascunho(i.tempId)} style={{ background: 'none', border: 'none', color: '#F87171', fontSize: 13, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            <button onClick={criarLista} disabled={criando} style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none', marginTop: 8,
              background: criando ? 'var(--input-bg)' : 'var(--gradient)',
              color: criando ? 'var(--text-faint)' : 'white',
              fontSize: 15, fontWeight: 700, cursor: criando ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif'
            }}>
              {criando ? 'Criando...' : '🛒 Criar lista de compras'}
            </button>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 0' }} />

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, padding: 4, margin: '16px 22px 0', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
        {[{ id: 'pendentes', label: `Pendentes${listasPendentes.length ? ` · ${listasPendentes.length}` : ''}` }, { id: 'historico', label: 'Histórico' }].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flex: 1, minWidth: 0, padding: '10px 6px', borderRadius: 12, border: 'none', background: aba === a.id ? 'var(--accent-glow)' : 'transparent', color: aba === a.id ? 'var(--accent-light)' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 22px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</div>
        ) : listasExibidas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{aba === 'pendentes' ? '🛒' : '📦'}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{aba === 'pendentes' ? 'Nenhuma lista pendente' : 'Nenhuma lista no histórico ainda'}</div>
          </div>
        ) : (
          listasExibidas.map(lista => (
            <ListaCard key={lista.id} lista={lista} onToggle={toggleComprado} onExcluir={excluirItem} />
          ))
        )}
      </div>
    </div>
  )
}
