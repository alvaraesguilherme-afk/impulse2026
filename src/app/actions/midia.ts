"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { coordenaArea } from "@/lib/permissoes";
import { AREA_MIDIA } from "@/lib/areas";
import { notificarEquipe } from "@/lib/push";

const FUNCOES_PADRAO = ["Stories", "Fotografia", "Gravação de vídeo"];

async function exigirCoordenador() {
  const sessao = await getSessao();
  if (!coordenaArea(sessao, AREA_MIDIA)) throw new Error("Sem permissão");
  return sessao;
}

export async function atribuirPessoa(dia: number, turno: string, funcao: string, pessoa: string) {
  await exigirCoordenador();
  const atual = await prisma.midia_escalas.findFirst({ where: { dia, turno, funcao }, select: { id: true } });
  if (atual) await prisma.midia_escalas.update({ where: { id: atual.id }, data: { pessoa: pessoa || null } });
  else await prisma.midia_escalas.create({ data: { dia, turno, funcao, pessoa: pessoa || null, fixo: true } });
  revalidatePath("/midia");
}

export async function adicionarFuncao(dia: number, turno: string, funcao: string) {
  await exigirCoordenador();
  const nome = funcao.trim();
  if (!nome) return;
  await prisma.midia_escalas.create({ data: { dia, turno, funcao: nome, pessoa: null, fixo: FUNCOES_PADRAO.includes(nome) } });
  revalidatePath("/midia");
}

export async function removerFuncao(id: number) {
  await exigirCoordenador();
  await prisma.midia_escalas.deleteMany({ where: { id: BigInt(id) } });
  revalidatePath("/midia");
}

export async function enviarMensagemMidia(texto: string) {
  const sessao = await exigirCoordenador();
  const limpo = texto.trim();
  if (!limpo) return;
  await prisma.mensagens_equipe.create({ data: { equipe_id: "midia", autor: sessao.nome, texto: limpo } });
  notificarEquipe("midia", sessao.nome, limpo);
  revalidatePath("/midia");
}

export async function excluirMensagemMidia(id: number) {
  await exigirCoordenador();
  await prisma.mensagens_equipe.deleteMany({ where: { id: BigInt(id), equipe_id: "midia" } });
  revalidatePath("/midia");
}
