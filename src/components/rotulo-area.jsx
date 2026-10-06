import { ICONE_AREA } from '@/lib/areas'

// Nome da area com o icone dela na frente (quando tiver icone).
export function RotuloArea({ area, tamanho = 14 }) {
  const icone = ICONE_AREA[area]
  if (!icone) return area
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <img src={icone} alt="" style={{ width: tamanho, height: tamanho, objectFit: 'contain' }} />
      {area}
    </span>
  )
}
