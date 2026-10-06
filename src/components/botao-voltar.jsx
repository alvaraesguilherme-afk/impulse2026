import Link from 'next/link'

export function BotaoVoltar({ claro = false }) {
  return (
    <Link href="/" aria-label="Voltar" style={{
      width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, textDecoration: 'none', flexShrink: 0,
      background: claro ? 'rgba(8,8,20,0.88)' : 'var(--input-bg)',
      border: claro ? '1px solid rgba(255,255,255,0.2)' : 'none',
      color: claro ? '#fff' : 'var(--text)'
    }}>‹</Link>
  )
}
