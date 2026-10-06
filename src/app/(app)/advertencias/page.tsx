import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehSupervisor } from "@/lib/permissoes";
import { Advertencias } from "@/components/telas/advertencias";

export default async function AdvertenciasPage() {
  const sessao = await getSessao();
  const [alunos, advertencias] = await Promise.all([
    prisma.alunos.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.advertencias.findMany({ orderBy: { created_at: "desc" } }),
  ]);
  const supervisor = ehSupervisor(sessao);
  return (
    <Advertencias
      isSupervisor={supervisor}
      alunos={alunos}
      advertencias={advertencias.map((a) => ({
        id: a.id, aluno: a.aluno, motivo: a.motivo, pago: a.pago, status: a.status,
        // Quem registrou só aparece pra supervisor
        autor: supervisor ? a.autor : null,
        created_at: (a.created_at ?? new Date()).toISOString(),
      }))}
    />
  );
}
