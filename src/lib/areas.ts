export const AREAS = [
  "Apoio",
  "Mídia",
  "Cozinha",
  "Cantina",
  "Secretário",
  "Programação",
  "Preletores",
  "Iluminação",
  "Logística",
] as const;

export const AREA_APOIO = AREAS[0];
export const AREA_MIDIA = AREAS[1];
export const AREA_PROGRAMACAO = AREAS[5];
export const AREAS_COMPRAS: readonly string[] = [AREAS[2], AREAS[3]];

// Icone de cada area em /public/icons. Area sem icone mostra so o nome.
export const ICONE_AREA: Record<string, string> = {
  [AREAS[0]]: "/icons/apoio.png",
  [AREAS[1]]: "/icons/midia.png",
  [AREAS[2]]: "/icons/cozinha.png",
  [AREAS[3]]: "/icons/cantina.png",
  [AREAS[5]]: "/icons/programacao.png",
  [AREAS[6]]: "/icons/preletores.png",
  [AREAS[7]]: "/icons/iluminacao.png",
  [AREAS[8]]: "/icons/logistica.png",
};
