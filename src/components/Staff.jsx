import { useState, useEffect } from 'react'
import { useTexto } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { AREAS } from '../lib/areas'
import { EQUIPES } from '../lib/equipes'
const STAFF_AREAS = [
  { area: '⛪ Liderança Pastoral', nomes: ['Pr. Júnior Bandeira', 'Pra. Stephanie Bandeira'] },
  { area: AREAS[0], nomes: ['Alvarães','Ana Luiza','Clara Cunha','Emanuel','Francisco','Gabriel Gomes','Gabriel Mendes','Gustavo Massay','Hadassa','Hellen Borges','Hugo Lacroix','Jerônimo','Jhony','Joel Marcos','Júlio','Linda','Lívia Andréa','Lorena','Ludmyla','Maria Clara','Maria Júlia','Mariana Gabrielle','Matheus Almeida','Maurício','Nicoly','Rafael Chaves','Rennan','Riana','Ryan Guedes','Samuel Lopes','Sthefany','Victória','Walterley'] },
  { area: AREAS[1], nomes: ['Alyson','Caetano','Daniel','Joyce','Juliana','Sthefany','Victória','Maria Clara'] },
  { area: AREAS[2], nomes: ['Linda'] },
  { area: AREAS[3], nomes: ['Guilherme Valentim', 'Hadstton Capell'] },
  { area: AREAS[4], nomes: ['Danilo'] },
  { area: AREAS[5], nomes: ['Eliel'] },
  { area: AREAS[6], nomes: ['Isabely Matos','Paula'] },
  { area: AREAS[7], nomes: ['Gustavo Borges'] },
  { area: AREAS[8], nomes: ['Arthur Bolzan', 'Edson Jr.'] },
]

function BackBtn({ onVoltar, titulo, onAjuda, total }) {
  return (
    <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--input-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {total !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', borderRadius: 20, padding: '5px 12px' }}>👥 {total}</span>
        )}
        {onAjuda && (
          <button onClick={onAjuda} style={{ width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>?</button>
        )}
      </div>
    </div>
  )
}

export default function Staff({ onVoltar, onAjuda }) {
  const tx = useTexto()
  const [aprovados, setAprovados] = useState([])

  useEffect(() => {
    supabase.from('convidados').select('nome, areas_aprovadas, equipe_atribuida').order('nome').then(({ data }) => {
      if (data) setAprovados(data)
    })
  }, [])

  const convidadosSemArea = aprovados.filter(c => (c.areas_aprovadas || []).length === 0).map(c => c.nome)
  const totalStaff = new Set([...STAFF_AREAS.flatMap(s => s.nomes), ...aprovados.map(c => c.nome)]).size

  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <BackBtn onVoltar={onVoltar} titulo={tx.staff} onAjuda={onAjuda} total={totalStaff} />
      <div style={{ padding: '24px 22px 100px' }}>
        {STAFF_AREAS.map(s => {
          const extras = aprovados.filter(c => (c.areas_aprovadas || []).includes(s.area))
          if (s.nomes.length === 0 && extras.length === 0) return null
          return (
            <div key={s.area} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{s.area}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {s.nomes.map(n => (
                  <span key={n} style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 20, padding: '6px 14px', color: 'var(--text-secondary)', fontWeight: 500 }}>{n}</span>
                ))}
                {extras.map(c => {
                  const equipe = s.area === AREAS[0] && c.equipe_atribuida ? EQUIPES.find(e => e.id === c.equipe_atribuida) : null
                  return (
                    <span key={c.nome} style={{ fontSize: 12, background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 20, padding: '6px 14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {c.nome}{equipe ? ` · ${equipe.nome.replace('Equipe ', '')}` : ''}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}

        {convidadosSemArea.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>👤 Convidados</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {convidadosSemArea.map(n => (
                <span key={n} style={{ fontSize: 12, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 20, padding: '6px 14px', color: '#C4B5FD', fontWeight: 500 }}>{n}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}