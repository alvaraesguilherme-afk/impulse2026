export default function Escola({ onVoltar, onAbrirArea }) {
  const areas = [
    { id: 'apoio', emoji: '🙌', nome: 'Apoio', desc: 'Times e escalas de serviço', bg: '#dbeafe' },
    { id: 'midia', emoji: '🎥', nome: 'Mídia', desc: 'Membros e escalas', bg: '#f3e8ff' },
    { id: 'louvor', emoji: '🎵', nome: 'Louvor', desc: 'Louvor e Ministrações', bg: '#fef9c3' },
    { id: 'staff', emoji: '👤', nome: 'Staff', desc: 'Lista completa de colaboradores', bg: '#f1f5f9' },
    { id: 'checkin', emoji: '✅', nome: 'Check-in', desc: 'Chegada de staff e alunos', bg: '#dcfce7', lock: true },
    { id: 'alunos', emoji: '🎒', nome: 'Alunos', desc: 'Dados e identificação', bg: '#fce7f3', lock: true },
  ]

  return (
    <div>
      <div onClick={onVoltar} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 18px', cursor: 'pointer', marginBottom: 0 }}>
        <span style={{ fontSize: 18, color: '#2563eb', fontWeight: 800 }}>←</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Eventos</span>
      </div>
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '20px 18px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Escola Impulse 2026</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>15 a 25 de julho</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Áreas</div>
        {areas.map(a => (
          <div key={a.id} onClick={() => onAbrirArea(a.id)} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{a.emoji}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{a.nome}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{a.desc}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 18, color: '#cbd5e1' }}>{a.lock ? '🔒' : '→'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}