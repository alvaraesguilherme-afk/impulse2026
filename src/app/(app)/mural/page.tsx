import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { diaMural, diffDiasISO, hojeBRT, somaDiasISO } from "@/lib/datas";
import { Mural } from "@/components/telas/mural";

// Mural de polaroids: todas as fotos num lugar só, em ordem de envio (a mais
// nova entra embaixo, onde a raiz termina). Sem separar por dia. Postar fica
// liberado do Dia 0 (chegada, 2 dias antes) até 12 dias depois do início.
export default async function MuralPage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);
  const hoje = hojeBRT();
  const aberto = diaMural(inicio, hoje) !== null;
  const fase = aberto ? "aberto" : diffDiasISO(hoje, inicio) < 0 ? "antes" : "depois";

  const fotos = await prisma.mural_fotos.findMany({ orderBy: { created_at: "asc" }, take: 600 });

  return (
    <Mural
      sessao={sessao}
      fase={fase}
      liberaEm={somaDiasISO(inicio, -2)}
      fotos={fotos.map((f) => ({
        id: Number(f.id), dia: f.dia, url: f.url, autor: f.autor, legenda: f.legenda,
        created_at: (f.created_at ?? new Date()).toISOString(),
      }))}
    />
  );
}
