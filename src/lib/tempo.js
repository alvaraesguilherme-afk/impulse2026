export function rotuloRelativo(dataISO) {
  const agora = new Date()
  const data = new Date(dataISO)
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const diaData = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  const diffDias = Math.round((hoje - diaData) / 86400000)
  if (diffDias <= 0) return 'Hoje'
  if (diffDias === 1) return 'Ontem'
  return `Há ${diffDias} dias`
}

export function horasDesde(dataISO) {
  return (Date.now() - new Date(dataISO).getTime()) / (60 * 60 * 1000)
}
