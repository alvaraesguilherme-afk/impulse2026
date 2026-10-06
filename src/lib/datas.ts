// Datas no servidor sempre em horário de Brasília (o servidor roda em UTC).
const DIA_MS = 86400000;

export function hojeBRT(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const diaUTC = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

export function diffDiasISO(a: string, b: string) {
  return Math.round((diaUTC(a) - diaUTC(b)) / DIA_MS);
}

export function somaDiasISO(iso: string, n: number) {
  return new Date(diaUTC(iso) + n * DIA_MS).toISOString().slice(0, 10);
}

// Dia do evento (1..11) durante o evento; fora dele, um número único por data
// — a frase do dia continua existindo fora do evento, como no app antigo.
export function diaFrase(inicio: string, hoje = hojeBRT()) {
  const diff = diffDiasISO(hoje, inicio);
  if (diff >= 0 && diff <= 10) return diff + 1;
  return Math.floor(diaUTC(hoje) / DIA_MS);
}

// Dia no Feed: 0 = chegada (2 dias antes do início), 1..13 = do início até
// 2 dias depois do fim. Fora disso, null.
export function diaMural(inicio: string, data = hojeBRT()) {
  const diff = diffDiasISO(data, inicio);
  if (diff === -2 || diff === -1) return 0;
  if (diff >= 0 && diff <= 12) return diff + 1;
  return null;
}
