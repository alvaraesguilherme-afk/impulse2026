import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function BackBtn({ onVoltar, titulo }) {
  return (
    <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'white' }}>‹</button>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
    </div>
  )
}

const avatarColors = ['linear-gradient(135deg,#7C3AED,#A78BFA)', 'linear-gradient(135deg,#0EA5E9,#38BDF8)', 'linear-gradient(135deg,#10B981,#34D399)', 'linear-gradient(135deg,#F59E0B,#FCD34D)', 'linear-gradient(135deg,#EF4444,#F87171)']

export default function Alunos({ onVoltar }) {
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase.from('alunos').select('*').order('nome_completo').then(({ data }) => {
      if (data) setAlunos(data)
      setLoading(false)
    })
  }, [])

  const alunosFiltrados = busca
    ? alunos.filter(a => a.nome_completo.toLowerCase().includes(busca.toLowerCase()))
    : alunos

  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <BackBtn onVoltar={onVoltar} titulo="Alunos" />

      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, background: 'linear-gradient(90deg,#F43F5E,#A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>
          {alunos.length}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>alunos cadastrados</div>

        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>🔍</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno..." style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 14, fontFamily: 'Inter, sans-serif', flex: 1 }} />
        </div>
      </div>

      <div style={{ padding: '0 22px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 30 }}>Carregando...</div>}
        {!loading && alunos.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 30 }}>⏳ Nenhum aluno cadastrado ainda</div>}
        {alunosFiltrados.map((a, i) => (
          <div key={a.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                {a.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>{a.nome_completo}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  <span style={{ background: a.genero === 'M' ? 'rgba(14,165,233,0.2)' : 'rgba(244,63,94,0.2)', color: a.genero === 'M' ? '#38BDF8' : '#FB7185', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    {a.genero === 'M' ? '👦 Masculino' : '👧 Feminino'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['Idade', a.idade + ' anos'], ['Telefone', a.telefone], ['CPF', a.cpf], ...(a.documento ? [['Doc', a.documento]] : [])].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.05em', minWidth: 65 }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}