"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehSupervisor } from "@/lib/permissoes";
import { notificarFrase } from "@/lib/push";

// Qualquer um define a frase do dia se ainda não tem; trocar ou apagar uma
// que já existe é só pra supervisor.
export async function salvarFrase(dia: number, frase: string) {
  const sessao = await getSessao();
  const texto = frase.trim();
  if (!texto) return;
  const atual = await prisma.frase_do_dia.findFirst({ where: { dia }, select: { id: true } });
  if (atual) {
    if (!ehSupervisor(sessao)) throw new Error("Sem permissão");
    await prisma.frase_do_dia.update({ where: { id: atual.id }, data: { frase: texto, autor: sessao.nome } });
  } else {
    await prisma.frase_do_dia.create({ data: { dia, frase: texto, autor: sessao.nome } });
  }
  notificarFrase(texto);
  revalidatePath("/");
}

export async function excluirFrase(dia: number) {
  const sessao = await getSessao();
  if (!ehSupervisor(sessao)) throw new Error("Sem permissão");
  await prisma.frase_do_dia.deleteMany({ where: { dia } });
  revalidatePath("/");
}
