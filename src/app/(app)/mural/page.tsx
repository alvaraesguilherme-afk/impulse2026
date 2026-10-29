import { getSessao } from "@/lib/dal";
import { getInicioEvento, getMuralAberto } from "@/lib/evento";
import { somaDiasISO } from "@/lib/datas";
import { prisma } from "@/lib/prisma";
import { Mural } from "@/components/telas/mural";

// Mural de polaroids: todas as fotos num lugar só, em ordem de envio (a mais
// nova entra embaixo, onde a raiz termina). O admin libera/trava as postagens (cadeado).
export default async function MuralPage() {
  const sessao = await getSessao();
  const [aberto, inicio] = await Promise.all([getMuralAberto(), getInicioEvento()]);

  const fotos = await prisma.mural_fotos.findMany({ orderBy: { created_at: "asc" }, take: 600 });

  return (
    <Mural
      sessao={sessao}
      aberto={aberto}
      liberaEm={somaDiasISO(inicio, -2)}
      fotos={fotos.map((f) => ({
        id: Number(f.id), dia: f.dia, url: f.url, autor: f.autor, legenda: f.legenda, curtidas: f.curtidas ?? 0,
        created_at: (f.created_at ?? new Date()).toISOString(),
      }))}
    />
  );
}
