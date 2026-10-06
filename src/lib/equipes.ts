// As 4 equipes do Apoio revezam turnos (Manhã/Tarde/Noite/Folga). Os membros
// não ficam mais no código: são quem tem staff.equipe_atribuida = id da equipe,
// definido pelo supervisor na aba Equipes.
export const EQUIPES = [
  { id: "verde", nome: "Equipe Verde", offset: 0, cor: "#4ADE80", grad: "linear-gradient(135deg,#14532D,#16A34A)", emoji: "♣" },
  { id: "amarelo", nome: "Equipe Amarelo", offset: 1, cor: "#FCD34D", grad: "linear-gradient(135deg,#78350F,#F59E0B)", emoji: "♦" },
  { id: "azul", nome: "Equipe Azul", offset: 2, cor: "#60A5FA", grad: "linear-gradient(135deg,#0C4A6E,#0EA5E9)", emoji: "♠" },
  { id: "vermelho", nome: "Equipe Vermelho", offset: 3, cor: "#F87171", grad: "linear-gradient(135deg,#7F1D1D,#EF4444)", emoji: "♥" },
] as const;

export type Equipe = (typeof EQUIPES)[number];
export const IDS_EQUIPES: readonly string[] = EQUIPES.map((e) => e.id);

const CICLO = ["M", "T", "N", "F"] as const;

// diaIdx = 0 é o primeiro dia do evento (só a Vermelha serve, à noite).
export function getTurno(eq: { id: string; offset: number }, diaIdx: number) {
  if (diaIdx < 0 || diaIdx > 10) return null;
  if (eq.id === "vermelho" && diaIdx === 0) return "N";
  if (diaIdx === 0) return null;
  return CICLO[(diaIdx - 1 + eq.offset) % 4];
}
