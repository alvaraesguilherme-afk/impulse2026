import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { coordenaArea } from "@/lib/permissoes";
import { AREA_MIDIA } from "@/lib/areas";
import { Midia } from "@/components/telas/midia";

export default async function MidiaPage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);
  const veMensagens = coordenaArea(sessao, AREA_MIDIA) || sessao.areas.includes(AREA_MIDIA);

  const [escalas, equipe, mensagens] = await Promise.all([
    prisma.midia_escalas.findMany({ orderBy: { created_at: "asc" } }),
    prisma.staff.findMany({
      where: { areas_aprovadas: { has: AREA_MIDIA } },
      select: { nome: true, equipe_atribuida: true },
      orderBy: { nome: "asc" },
    }),
    veMensagens ? prisma.mensagens_equipe.findMany({ where: { equipe_id: "midia" }, orderBy: { created_at: "desc" }, take: 100 }) : [],
  ]);

  return (
    <Midia
      sessao={sessao}
      inicio={inicio}
      veMensagens={veMensagens}
      escalas={escalas.map((e) => ({ id: Number(e.id), dia: e.dia, turno: e.turno, funcao: e.funcao, pessoa: e.pessoa ?? "" }))}
      equipe={equipe.map((p) => ({ nome: p.nome, equipe: p.equipe_atribuida }))}
      mensagens={mensagens.map((m) => ({ id: Number(m.id), equipe_id: m.equipe_id, autor: m.autor, texto: m.texto, created_at: m.created_at.toISOString() }))}
    />
  );
}
