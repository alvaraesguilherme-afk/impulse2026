"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehAdmin } from "@/lib/permissoes";

export async function enviarBug(texto: string) {
  await getSessao();
  const limpo = texto.trim();
  if (!limpo) return;
  await prisma.bug_reports.create({ data: { texto: limpo.slice(0, 2000) } });
  revalidatePath("/config");
}

export async function marcarRelatoLido(id: number, lido: boolean) {
  const sessao = await getSessao();
  if (!ehAdmin(sessao)) throw new Error("Sem permissão");
  await prisma.bug_reports.updateMany({ where: { id: BigInt(id) }, data: { lido } });
  revalidatePath("/config");
}

type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };

// O mesmo aparelho pode ter sido usado por outra pessoa: a inscrição sempre
// passa a apontar pra quem está logado agora (e pra equipe dela).
export async function salvarInscricao(sub: Inscricao) {
  const sessao = await getSessao();
  const equipe = sessao.equipe && sessao.equipe !== "sem_escala" ? sessao.equipe : sessao.areas.includes("🎥 Mídia") ? "midia" : null;
  const dados = { p256dh: sub.keys.p256dh, auth: sub.keys.auth, nome: sessao.nome, equipe_id: equipe };
  const atual = await prisma.push_subscriptions.findFirst({ where: { endpoint: sub.endpoint }, select: { id: true } });
  if (atual) await prisma.push_subscriptions.update({ where: { id: atual.id }, data: dados });
  else await prisma.push_subscriptions.create({ data: { endpoint: sub.endpoint, ...dados } });
}

export async function removerInscricao(endpoint: string) {
  await getSessao();
  await prisma.push_subscriptions.deleteMany({ where: { endpoint } });
}
