import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { AREA_MIDIA } from "@/lib/areas";
import { Midia } from "@/components/telas/midia";

export default async function MidiaPage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);

  const [escalas, equipe] = await Promise.all([
    prisma.midia_escalas.findMany({ orderBy: { created_at: "asc" } }),
    prisma.staff.findMany({
      where: { areas_aprovadas: { has: AREA_MIDIA } },
      select: { nome: true, equipe_atribuida: true, avatar_url: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <Midia
      sessao={sessao}
      inicio={inicio}
      escalas={escalas.map((e) => ({ id: Number(e.id), dia: e.dia, turno: e.turno, funcao: e.funcao, pessoa: e.pessoa ?? "" }))}
      equipe={equipe.map((p) => ({ nome: p.nome, equipe: p.equipe_atribuida, avatar: p.avatar_url }))}
    />
  );
}
