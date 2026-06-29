export default function Config({ onVoltar, tema, setTema }) {
  return (
    <div style={{ background: 'var(--bg-tela)', minHeight: '100vh' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onVoltar} style={{ width: 36, height: 36, background: 'var(--bg-card)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none', color: 'var(--text)' }}>‹</button>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>Configurações</h2>
      </div>

      <div style={{ padding: '24px 22px 100px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Aparência</div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22 }}>{tema === 'light' ? '☀️' : '🌙'}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Tema {tema === 'light' ? 'Claro' : 'Escuro'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {tema === 'light' ? 'Modo claro ativado' : 'Modo escuro ativado'}
                </div>
              </div>
            </div>
            <div
              className={`toggle-track ${tema === 'light' ? 'active' : ''}`}
              onClick={() => setTema(tema === 'light' ? 'dark' : 'light')}
            >
              <div className="toggle-thumb" />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 28 }}>Sobre</div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '18px'
        }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Escola Impulse 2026</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            15 a 25 de julho · Rancho Império
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12 }}>
            Versão beta · Feito com carinho para o staff
          </div>
        </div>
      </div>
    </div>
  )
}
