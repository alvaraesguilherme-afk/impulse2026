import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";

const INICIO_PADRAO = "2027-07-14";

function comLimite<T>(promessa: Promise<T>, ms: number) {
  return Promise.race([promessa, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

// Data de início da Escola (tabela configuracao_escola, id=1) no formato
// YYYY-MM-DD. Muda raramente, então fica em cache por horas. Todo o resto
// do calendário (11 dias de evento, dias do Feed) é derivado dela no cliente,
// no fuso do aparelho. Com limite de tempo: banco fora do ar não trava a tela.
export async function getInicioEvento(): Promise<string> {
  "use cache";
  cacheLife("hours");
  cacheTag("evento");
  try {
    const conf = await comLimite(
      prisma.configuracao_escola.findUnique({ where: { id: 1 }, select: { data_inicio: true } }),
      1500,
    );
    return conf?.data_inicio.toISOString().slice(0, 10) ?? INICIO_PADRAO;
  } catch {
    return INICIO_PADRAO;
  }
}
