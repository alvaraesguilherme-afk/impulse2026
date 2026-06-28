import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ACOMODACOES = [
  { id: 'f1', nome: 'Quarto F1', tipo: 'quarto', genero: 'F', cor: '#ec4899', label: 'Rosa' },
  { id: 'f2', nome: 'Quarto F2', tipo: 'quarto', genero: 'F', cor: '#7c3aed', label: 'Roxo' },
  { id: 'f3', nome: 'Quarto F3', tipo: 'quarto', genero: 'F', cor: '#dc2626', label: 'Vermelho' },
  { id: 'm1', nome: 'Quarto M1', tipo: 'quarto', genero: 'M', cor: '#2563eb', label: 'Azul' },
  { id: 'm2', nome: 'Quarto M2', tipo: 'quarto', genero: 'M', cor: '#16a34a', label: 'Verde' },
  { id: 'm3', nome: 'Quarto M3', tipo: 'quarto', genero: 'M', cor: '#ca8a04', label: 'Amarelo' },
  { id: 'bf', nome: 'Barraca Feminina', tipo: 'barraca', genero: 'F', cor: '#ea580c', label: 'Laranja' },
  { id: 'bm', nome: 'Barraca Masculina', tipo: 'barraca', genero: 'M', cor: '#1e293b', label: 'Preto' },
]

const EQUIPES = [
  { nome: 'Equipe Verde', lideres: 'Jhony e Linda', membros: ['Emanuel','Hellen Borges','Isabely Matos','Joel Marcos','Jeronimo','Livia Andrea'] },
  { nome: 'Equipe Amarelo', lideres: 'Gustavo e Taiwa', membros: ['Hugo Lacroix','Lorena','Maria Clara','Matheus Almeida','Stephany'] },
  { nome: 'Equipe Azul', lideres: 'Walterley e Maria Julia', membros: ['Ludymila','Mariana Gabrielle','Mauricio','Rafael','Ryan Guedes'] },
  { nome: 'Equipe Vermelho', lideres: 'Francisco e Clara Cunha', membros: ['Gabriel Mendes','Leticia Nascimento','Nicoly','Rennan','Vic'] },
]
const MIDIA = ['Alyson','Joyce','Caetano','Daniel','Juliana']

function todoStaff() {
  const lista = []
  EQUIPES.forEach(eq => {
    eq.lideres.split(' e ').forEach(l => lista.push({ nome: l.trim(), area: eq.nome + ' (líder)' }))
    eq.membros.forEach(m => lista.push({ nome: m, area: eq.nome }))
  })
  MIDIA.forEach(m => lista.push({ nome: m, area: 'Mídia' }))
  lista.push({ nome: 'Samuel Lopes', area: 'Cozinha' })
  lista.push({ nome: 'Hadstton', area: 'Cantina' })
  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return lista
}

function BackBtn({ onVoltar, titulo }) {
  return (
    <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'white' }}>‹</button>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
    </div>
  )
}

function AcomSelect({ valor, onSave }) {
  return (
    <select defaultValue={valor} onChange={e => onSave(e.target.value)} style={{ width: '100%', marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.7)', outline: 'none', fontFamily: 'Inter, sans-serif' }}>
      <option value="">Acomodação...</option>
      {[{ label: '🏠 Quartos Femininos', gen: 'F', tipo: 'quarto' }, { label: '🏠 Quartos Masculinos', gen: 'M', tipo: 'quarto' }, { label: '⛺ Barracas Femininas', gen: 'F', tipo: 'barraca' }, { label: '⛺ Barracas Masculinas', gen: 'M', tipo: 'barraca' }].map(g => (
        <optgroup key={g.label} label={g.label}>
          {ACOMODACOES.filter(a => a.tipo === g.tipo && a.genero === g.gen).map(a => (
            <option key={a.id} value={a.id}>{a.nome} ({a.label})</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export default function Checkin({ onVoltar }) {
  const [aba, setAba] = useState('staff')
  const [busca, setBusca] = useState('')
  const [staffCache, setStaffCache] = useState({})
  const [alunosLista, setAlunosLista] = useState([])
  const [alunosCache, setAlunosCache] = useState({})

  useEffect(() => {
    supabase.from('checkin').select('*').then(({ data }) => {
      const cache = {}
      if (data) data.forEach(r => { cache[r.chave] = { status: r.status, acom: r.acomodacao || '' } })
      setStaffCache(cache)
    })
    supabase.from('alunos').select('nome_completo,genero').order('nome_completo').then(({ data }) => {
      if (data) setAlunosLista(data)
    })
    supabase.from('checkin_alunos').select('*').then(({ data }) => {
      const cache = {}
      if (data) data.forEach(r => { cache[r.nome] = { status: r.status, acom: r.acomodacao || '' } })
      setAlunosCache(cache)
    })
  }, [])

  async function marcarStaff(nome) {
    const chave = 'staff_' + nome
    const atual = staffCache[chave]?.status || ''
    const novo = atual === 'sim' ? '' : 'sim'
    const acom = staffCache[chave]?.acom || ''
    setStaffCache(prev => ({ ...prev, [chave]: { status: novo, acom } }))
    await supabase.from('checkin').upsert({ chave, status: novo, acomodacao: acom }, { onConflict: 'chave' })
  }

  async function salvarAcomStaff(nome, val) {
    const chave = 'staff_' + nome
    const status = staffCache[chave]?.status || ''
    setStaffCache(prev => ({ ...prev, [chave]: { status, acom: val } }))
    await supabase.from('checkin').upsert({ chave, status, acomodacao: val }, { onConflict: 'chave' })
  }

  async function marcarAluno(nome) {
    const atual = alunosCache[nome]?.status || ''
    const novo = atual === 'sim' ? '' : 'sim'
    const acom = alunosCache[nome]?.acom || ''
    setAlunosCache(prev => ({ ...prev, [nome]: { status: novo, acom } }))
    await supabase.from('checkin_alunos').upsert({ nome, status: novo, acomodacao: acom }, { onConflict: 'nome' })
  }

  async function salvarAcomAluno(nome, val) {
    const status = alunosCache[nome]?.status || ''
    setAlunosCache(prev => ({ ...prev, [nome]: { status, acom: val } }))
    await supabase.from('checkin_alunos').upsert({ nome, status, acomodacao: val }, { onConflict: 'nome' })
  }

  const staff = todoStaff()
  const staffFiltrado = busca ? staff.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())) : staff
  const staffChegou = staff.filter(p => staffCache['staff_' + p.nome]?.status === 'sim').length
  const alunosFiltrados = busca ? alunosLista.filter(a => a.nome_completo.toLowerCase().includes(busca.toLowerCase())) : alunosLista
  const alunosChegou = alunosLista.filter(a => alunosCache[a.nome_completo]?.status === 'sim').length

  const total = aba === 'staff' ? staff.length : alunosLista.length
  const chegou = aba === 'staff' ? staffChegou : alunosChegou
  const pct = total > 0 ? Math.round((chegou / total) * 100) : 0

  const avatarColors = ['linear-gradient(135deg,#7C3AED,#A78BFA)', 'linear-gradient(135deg,#0EA5E9,#38BDF8)', 'linear-gradient(135deg,#10B981,#34D399)', 'linear-gradient(135deg,#F59E0B,#FCD34D)', 'linear-gradient(135deg,#EF4444,#F87171)']

  return (
    <div style={{ background: '#0A0A14', minHeight: '100vh' }}>
      <BackBtn onVoltar={onVoltar} titulo="Check-in" />

      {/* HERO */}
      <div style={{ padding: '24px 22px 0' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 52, fontWeight: 800, background: 'linear-gradient(90deg,#A78BFA,#60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
          {chegou}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: -4, marginBottom: 16 }}>
          de {total} {aba === 'staff' ? 'colaboradores' : 'alunos'} chegaram
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, height: 10, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#7C3AED,#60A5FA)', borderRadius: 16, width: pct + '%', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <span>{pct}% chegaram</span>
          <span>{total - chegou} pendentes</span>
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 22px' }}>
        {[['staff','👥 Staff'],['alunos','🎒 Alunos']].map(([id, label]) => (
          <button key={id} onClick={() => { setAba(id); setBusca('') }} style={{ flex: 1, padding: '10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: aba === id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', color: aba === id ? '#C4B5FD' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      {/* BUSCA */}
      <div style={{ margin: '0 22px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>🔍</span>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome..." style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 14, fontFamily: 'Inter, sans-serif', flex: 1 }} />
      </div>

      {/* LISTA STAFF */}
      {aba === 'staff' && (
        <div style={{ padding: '0 22px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {staffFiltrado.map((p, i) => {
            const chave = 'staff_' + p.nome
            const c = staffCache[chave] || { status: '', acom: '' }
            const acom = ACOMODACOES.find(a => a.id === c.acom)
            const iniciais = p.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            return (
              <div key={p.nome} style={{ background: c.status === 'sim' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)', border: c.status === 'sim' ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{iniciais}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{p.area}{acom ? ' · ' + acom.nome : ''}</div>
                  </div>
                  <div onClick={() => marcarStaff(p.nome)} style={{ fontSize: 22 }}>{c.status === 'sim' ? '✅' : '⭕'}</div>
                </div>
                <AcomSelect valor={c.acom} onSave={val => salvarAcomStaff(p.nome, val)} />
              </div>
            )
          })}
        </div>
      )}

      {/* LISTA ALUNOS */}
      {aba === 'alunos' && (
        <div style={{ padding: '0 22px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alunosLista.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 30 }}>⏳ Nenhum aluno cadastrado ainda</div>}
          {alunosFiltrados.map((a, i) => {
            const c = alunosCache[a.nome_completo] || { status: '', acom: '' }
            const acom = ACOMODACOES.find(ac => ac.id === c.acom)
            const iniciais = a.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            return (
              <div key={a.nome_completo} style={{ background: c.status === 'sim' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)', border: c.status === 'sim' ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{iniciais}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{a.nome_completo}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{a.genero === 'M' ? '👦 Masculino' : '👧 Feminino'}{acom ? ' · ' + acom.nome : ''}</div>
                  </div>
                  <div onClick={() => marcarAluno(a.nome_completo)} style={{ fontSize: 22 }}>{c.status === 'sim' ? '✅' : '⭕'}</div>
                </div>
                <AcomSelect valor={c.acom} onSave={val => salvarAcomAluno(a.nome_completo, val)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}