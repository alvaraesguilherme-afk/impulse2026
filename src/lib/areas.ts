// Funções de quem serve na Escola.
export const AREAS = [
  "Apoio",
  "Mídia",
  "Cozinha",
  "Cantina",
  "Secretário",
  "Iluminação",
  "Logística",
  "Mesa dos preletores",
] as const;

export const AREA_APOIO = "Apoio";
export const AREA_MIDIA = "Mídia";

// Icone de cada area em /public/icons. Area sem icone mostra so o nome.
export const ICONE_AREA: Record<string, string> = {
  Apoio: "/icons/apoio.png",
  Mídia: "/icons/midia.png",
  Cozinha: "/icons/cozinha.png",
  Cantina: "/icons/cantina.png",
  Secretário: "/icons/secretario.png",
  Iluminação: "/icons/iluminacao.png",
  Logística: "/icons/logistica.png",
  "Mesa dos preletores": "/icons/mesa-preletores.png",
};
