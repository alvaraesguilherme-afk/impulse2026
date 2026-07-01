import { useState, useEffect } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'
const STAFF_AREAS = [
  { area: '⛪ Liderança Pastoral', nomes: ['Pr. Júnior Bandeira', 'Pra. Stephanie Bandeira'] },
  { area: '🙌 Apoio', nomes: ['Alvarães','Clara Cunha','Emanuel','Francisco','Gabriel Gomes','Gustavo Massay','Hellen Borges','Hugo Lacroix','Isabely Matos','Jerônimo','Jhony','Joel Marcos','Letícia','Linda','Lívia Andréa','Lorena','Ludmyla','Maria Clara','Maria Júlia','Mariana Gabrielle','Matheus Almeida','Maurício','Nicoly','Rafael Chaves','Rennan','Ryan Guedes','Sthefany','Taiwa','Victória','Walterley'] },
  { area: '🎥 Mídia', nomes: ['Alyson','Caetano','Daniel','Joyce','Juliana','Sthefany','Victória','Taiwa','Maria Clara'] },
  { area: '🍳 Cozinha', nomes: ['Samuel Lopes'] },
  { area: '🛒 Cantina', nomes: ['Hadstton Capell'] },
  { area: '📋 Secretário', nomes: ['Danilo'] },
  { area: '📅 Programação', nomes: ['Eliel'] },
  { area: '🎤 Preletores', nomes: ['Paula'] },
  { area: '💡 Iluminação', nomes: ['Gustavo Borges'] },
  { area: '📦 Logística', nomes: ['Edson Jr.'] },
]

function BackBtn({ onVoltar, titulo, onAjuda }) {
  return (
    <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
      {onAjuda && (
        <button onClick={onAjuda} style={{ marginLeft: 'auto', width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>?</button>
      )}
    </div>
  )
}

export default function Staff({ onVoltar, onAjuda }) {
  const tx = useTexto()
  const [convidados, setConvidados] = useState([])

  useEffect(() => {
    supabase.from('convidados').select('nome').order('nome').then(({ data }) => {
      if (data) setConvidados(data.map(d => d.nome))
    })
  }, [])

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <BackBtn onVoltar={onVoltar} titulo={tx.staff} onAjuda={onAjuda} />
      <div style={{ padding: '24px 22px 100px' }}>
        {STAFF_AREAS.filter(s => s.nomes.length > 0).map(s => (
          <div key={s.area} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{s.area}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {s.nomes.map(n => (
                <span key={n} style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 20, padding: '6px 14px', color: 'var(--text-secondary)', fontWeight: 500 }}>{n}</span>
              ))}
            </div>
          </div>
        ))}

        {convidados.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>👤 Convidados</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {convidados.map(n => (
                <span key={n} style={{ fontSize: 12, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 20, padding: '6px 14px', color: '#C4B5FD', fontWeight: 500 }}>{n}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}