// Calendário do evento, calculado no aparelho (fuso local) a partir da data de
// início que vem do banco ("YYYY-MM-DD"). Substitui as datas de 2026 que
// ficavam fixas em cada tela.
export const TOTAL_DIAS = 11
export const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MESES_C = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const DIAS_SEMANA = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
export const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const DIA_MS = 86400000

export function dataLocal(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function hojeLocal() {
  const hj = new Date()
  hj.setHours(0, 0, 0, 0)
  return hj
}

export function addDias(data, n) {
  const d = new Date(data)
  d.setDate(d.getDate() + n)
  return d
}

// Diferença em dias (arredondada, imune a horário de verão)
export function diffDias(a, b) {
  return Math.round((a.getTime() - b.getTime()) / DIA_MS)
}

// Os 11 dias do evento: idx 0..10
export function diasDoEvento(inicioISO) {
  const inicio = dataLocal(inicioISO)
  return Array.from({ length: TOTAL_DIAS }, (_, i) => addDias(inicio, i))
}

// Índice do dia de hoje no evento, ou 0 fora do evento
export function idxHoje(inicioISO) {
  const diff = diffDias(hojeLocal(), dataLocal(inicioISO))
  return diff >= 0 && diff < TOTAL_DIAS ? diff : 0
}

export function rotuloDia(data) {
  return `${data.getDate()} de ${MESES[data.getMonth()]}`
}
