import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { podeGerirEquipes } from "@/lib/permissoes";
import { Apoio } from "@/components/telas/apoio";

export default async function ApoioPage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);
  const minhaEquipe = sessao.equipe && sessao.equipe !== "sem_escala" ? sessao.equipe : null;
  const veTodas = podeGerirEquipes(sessao);

  const [staff, mensagens] = await Promise.all([
    prisma.staff.findMany({ where: { equipe_atribuida: { not: null } }, select: { nome: true, equipe_atribuida: true }, orderBy: { nome: "asc" } }),
    veTodas || minhaEquipe
      ? prisma.mensagens_equipe.findMany({
          where: veTodas ? { equipe_id: { not: "midia" } } : { equipe_id: { in: [minhaEquipe!, "todas"] } },
          orderBy: { created_at: "desc" },
          take: 100,
        })
      : [],
  ]);

  return (
    <Apoio
      sessao={sessao}
      inicio={inicio}
      minhaEquipe={minhaEquipe}
      staff={staff.map((s) => ({ nome: s.nome, equipe: s.equipe_atribuida }))}
      mensagens={mensagens.map((m) => ({ id: Number(m.id), equipe_id: m.equipe_id, autor: m.autor, texto: m.texto, created_at: m.created_at.toISOString() }))}
    />
  );
}
