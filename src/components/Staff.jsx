const STAFF_AREAS = [
  { area: '👑 Liderança Geral', nomes: ['Alvarães', 'Danilo', 'Eliel'] },
  { area: '🙌 Apoio', nomes: ['Clara Cunha','Emanuel','Francisco','Gustavo Massay','Hellen Borges','Hugo Lacroix','Isabely Matos','Jerônimo','Jhony','Joel Marcos','Letícia','Linda','Lívia Andréa','Lorena','Ludmyla','Maria Clara','Maria Júlia','Mariana Gabrielle','Matheus Almeida','Maurício','Nicoly','Rafael Chaves','Rennan','Ryan Guedes','Stephany','Taiwa','Victória','Walterley'] },
  { area: '🎥 Mídia', nomes: ['Alyson','Caetano','Daniel','Joyce','Juliana'] },
  { area: '🍳 Cozinha', nomes: ['Samuel Lopes'] },
  { area: '🛒 Cantina', nomes: ['Hadstton Capell'] },
  { area: '🎤 Preletores', nomes: ['Paula'] },
  { area: '💡 Iluminação', nomes: ['Gustavo Borges'] },
  { area: '📦 Logística', nomes: ['Edson Jr.'] },
]

function BackBtn({ onVoltar, titulo }) {
  return (
    <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'white' }}>‹</button>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{titulo}</h2>
    </div>
  )
}

export default function Staff({ onVoltar }) {
  return (
    <div style={{ background: '#080C14', minHeight: '100vh' }}>
      <BackBtn onVoltar={onVoltar} titulo="Staff" />
      <div style={{ padding: '24px 22px 100px' }}>
        {STAFF_AREAS.filter(s => s.nomes.length > 0).map(s => (
          <div key={s.area} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{s.area}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {s.nomes.map(n => (
                <span key={n} style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{n}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}