import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { diaMural, diffDiasISO, hojeBRT } from "@/lib/datas";
import { Mural } from "@/components/telas/mural";

// Dia 0 (chegada) até Dia 13 — o Feed fica aberto 2 dias antes e 2 depois
const TOTAL_DIAS_MURAL = 14;

export default async function MuralPage({ searchParams }: PageProps<"/mural">) {
  const [sessao, inicio, params] = await Promise.all([getSessao(), getInicioEvento(), searchParams]);
  const hoje = hojeBRT();
  const diaHoje = diaMural(inicio, hoje);
  const recapLiberado = diffDiasISO(hoje, inicio) > 12;

  const recap = params.recap === "1" && recapLiberado;
  const autor = typeof params.autor === "string" ? params.autor : "";
  const todos = params.todos === "1" && !!autor;
  const diaParam = Number(params.dia);
  const dia = Number.isInteger(diaParam) && diaParam >= 0 && diaParam < TOTAL_DIAS_MURAL ? diaParam : (diaHoje ?? 0);

  const where = recap ? {} : todos ? { autor } : { dia, ...(autor ? { autor } : {}) };
  const orderBy = recap ? { curtidas: "desc" as const } : { created_at: "desc" as const };

  const [fotos, autores] = await Promise.all([
    prisma.mural_fotos.findMany({ where, orderBy, take: recap ? 100 : 300 }),
    recap ? [] : prisma.mural_fotos.findMany({ where: { dia }, distinct: ["autor"], select: { autor: true } }),
  ]);

  return (
    <Mural
      sessao={sessao}
      inicio={inicio}
      dia={dia}
      diaHoje={diaHoje}
      recap={recap}
      recapLiberado={recapLiberado}
      filtroAutor={autor}
      todosOsDias={todos}
      autores={autores.map((a) => a.autor).filter((a): a is string => !!a)}
      fotos={fotos.map((f) => ({
        id: Number(f.id), dia: f.dia, url: f.url, autor: f.autor, legenda: f.legenda,
        curtidas: f.curtidas ?? 0, created_at: (f.created_at ?? new Date()).toISOString(),
      }))}
    />
  );
}
