import { AREAS_COMPRAS } from "./areas";

// Permissões vêm do login (staff.nivel + staff.areas_aprovadas), nunca de nome
// fixo no código. O nível é gravado no banco por quem libera o acesso.
export const NIVEIS = ["maximo", "alto", "basico", "staff"] as const;
export type Nivel = (typeof NIVEIS)[number];
export const NIVEIS_SUPERVISOR: readonly string[] = ["maximo", "alto", "basico"];

export type Sessao = { nome: string; nivel: string; areas: string[]; equipe: string | null };

export const ABAS_POR_NIVEL: Record<string, string[]> = {
  maximo: ["avisos", "chamada", "faltas", "senhas", "aprovacoes"],
  alto: ["avisos", "chamada", "faltas", "aprovacoes"],
  basico: ["avisos"],
};

export const ehSupervisor = (s: Pick<Sessao, "nivel"> | null | undefined) => NIVEIS_SUPERVISOR.includes(s?.nivel ?? "");
export const ehAdmin = (s: Pick<Sessao, "nivel"> | null | undefined) => s?.nivel === "maximo";
export const podeGerirEquipes = (s: Pick<Sessao, "nivel"> | null | undefined) => ["maximo", "alto"].includes(s?.nivel ?? "");

// Coordena a área: maximo/alto coordenam tudo; basico só as áreas aprovadas dele
export function coordenaArea(s: Sessao | null | undefined, area: string) {
  if (["maximo", "alto"].includes(s?.nivel ?? "")) return true;
  return s?.nivel === "basico" && (s?.areas ?? []).includes(area);
}

// Aba Programação: só coordenação geral e supervisores editam.
export const editaProgramacao = (s: Pick<Sessao, "nivel"> | null | undefined) => ["maximo", "alto"].includes(s?.nivel ?? "");

export const acessaCompras = (s: Sessao | null | undefined) =>
  ehAdmin(s) || (s?.areas ?? []).some((a) => AREAS_COMPRAS.includes(a));

// Coordenação geral (máximo) entra em quantos aparelhos quiser; supervisor em 2;
// o resto em 1.
export const limiteAparelhos = (nivel: string) =>
  nivel === "maximo" ? Infinity : nivel === "alto" ? 2 : 1;
