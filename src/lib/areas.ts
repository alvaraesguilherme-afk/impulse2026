// Funções de quem serve na Escola. Programação e Preletores NÃO são função:
// Programação é uma aba (editada pela coordenação geral e supervisores, ver
// editaProgramacao em permissoes.ts) e Preletores é conteúdo dessa aba.
export const AREAS = [
  "Apoio",
  "Mídia",
  "Cozinha",
  "Cantina",
  "Secretário",
  "Iluminação",
  "Logística",
] as const;

export const AREA_APOIO = "Apoio";
export const AREA_MIDIA = "Mídia";
export const AREAS_COMPRAS: readonly string[] = ["Cozinha", "Cantina"];

// Icone de cada area em /public/icons. Area sem icone mostra so o nome.
export const ICONE_AREA: Record<string, string> = {
  Apoio: "/icons/apoio.png",
  Mídia: "/icons/midia.png",
  Cozinha: "/icons/cozinha.png",
  Cantina: "/icons/cantina.png",
  Iluminação: "/icons/iluminacao.png",
  Logística: "/icons/logistica.png",
};
