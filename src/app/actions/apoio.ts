"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { coordenaArea, podeGerirEquipes } from "@/lib/permissoes";
import { AREA_APOIO } from "@/lib/areas";
import { IDS_EQUIPES } from "@/lib/equipes";
import { notificarEquipe } from "@/lib/push";

// maximo/alto mandam pra qualquer equipe (ou "todas"); basico do Apoio só pra
// própria equipe.
export async function enviarMensagemEquipe(destino: string, texto: string) {
  const sessao = await getSessao();
  if (!coordenaArea(sessao, AREA_APOIO)) throw new Error("Sem permissão");
  const limpo = texto.trim();
  if (!limpo) return;
  const alvo = podeGerirEquipes(sessao) ? destino : sessao.equipe;
  if (!alvo || !(IDS_EQUIPES.includes(alvo) || alvo === "todas")) throw new Error("Equipe inválida");
  await prisma.mensagens_equipe.create({ data: { equipe_id: alvo, autor: sessao.nome, texto: limpo } });
  if (alvo === "todas") for (const id of IDS_EQUIPES) notificarEquipe(id, sessao.nome, limpo);
  else notificarEquipe(alvo, sessao.nome, limpo);
  revalidatePath("/apoio");
}

export async function excluirMensagemEquipe(id: number) {
  const sessao = await getSessao();
  if (!coordenaArea(sessao, AREA_APOIO)) throw new Error("Sem permissão");
  await prisma.mensagens_equipe.deleteMany({ where: { id: BigInt(id), equipe_id: { not: "midia" } } });
  revalidatePath("/apoio");
}
