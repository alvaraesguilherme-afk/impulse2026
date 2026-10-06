import { redirect } from "next/navigation";
import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { ABAS_POR_NIVEL } from "@/lib/permissoes";
import { Supervisor } from "@/components/telas/supervisor";

export default async function SupervisorPage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);
  const abas = ABAS_POR_NIVEL[sessao.nivel] ?? [];
  if (abas.length === 0) redirect("/");
  const tem = (a: string) => abas.includes(a);

  // Só busca o que as abas desse nível mostram — e senhas só pro nível máximo
  const [avisos, chamada, equipes, senhas, gestao] = await Promise.all([
    prisma.avisos.findMany({ orderBy: { created_at: "desc" } }),
    tem("chamada") || tem("faltas") ? prisma.chamada.findMany({ select: { chave: true, status: true, obs: true } }) : [],
    tem("chamada") || tem("faltas")
      ? prisma.staff.findMany({ where: { equipe_atribuida: { not: null } }, select: { nome: true, equipe_atribuida: true }, orderBy: { nome: "asc" } })
      : [],
    tem("senhas") ? prisma.staff.findMany({ select: { nome: true, pin: true, nivel: true }, orderBy: { nome: "asc" } }) : [],
    tem("aprovacoes")
      ? prisma.staff.findMany({ select: { nome: true, areas_aprovadas: true, equipe_atribuida: true, area_pendente: true }, orderBy: { nome: "asc" } })
      : [],
  ]);

  return (
    <Supervisor
      nome={sessao.nome}
      abas={abas}
      inicio={inicio}
      avisos={avisos.map((a) => ({ id: Number(a.id), texto: a.texto ?? "", hora: a.hora ?? "", created_at: a.created_at.toISOString() }))}
      chamada={chamada.filter((c) => c.chave).map((c) => ({ chave: c.chave!, status: c.status ?? "", obs: c.obs ?? "" }))}
      membrosEquipes={equipes.map((e) => ({ nome: e.nome, equipe: e.equipe_atribuida }))}
      senhas={senhas}
      gestao={gestao.map((g) => ({ nome: g.nome, areas_aprovadas: g.areas_aprovadas, equipe_atribuida: g.equipe_atribuida, area_pendente: g.area_pendente }))}
    />
  );
}
