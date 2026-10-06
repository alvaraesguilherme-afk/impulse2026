import { getSessao } from "@/lib/dal";
import { getInicioEvento } from "@/lib/evento";
import { prisma } from "@/lib/prisma";
import { ehAdmin } from "@/lib/permissoes";
import { Programacao } from "@/components/telas/programacao";

export default async function ProgramacaoPage() {
  const [sessao, inicio] = await Promise.all([getSessao(), getInicioEvento()]);
  // Preletores só aparecem pro nível máximo (como no app antigo)
  const tipos = ehAdmin(sessao) ? ["louvor", "ministro"] : ["louvor"];

  const [dados, cadastros] = await Promise.all([
    prisma.programacao.findMany({ where: { tipo: { in: tipos } } }),
    prisma.programacao_cadastro.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <Programacao
      sessao={sessao}
      inicio={inicio}
      dados={dados.map((d) => ({ id: Number(d.id), dia: d.dia, turno: d.turno, tipo: d.tipo, titulo: d.titulo, membros: d.membros, tema: d.tema }))}
      cadastros={cadastros.map((c) => ({ id: Number(c.id), tipo: c.tipo, nome: c.nome, membros: c.membros }))}
    />
  );
}
