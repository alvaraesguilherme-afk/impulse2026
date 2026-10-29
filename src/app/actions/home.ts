"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehAdmin } from "@/lib/permissoes";
import { notificarFrase } from "@/lib/push";

// Cada dia tem dois bilhetes. Qualquer um escreve num bilhete vazio, mas cada
// pessoa só escreve um por dia. Trocar um que já existe é só pro administrador
// (nível máximo); apagar, o administrador ou quem escreveu aquele.
export async function salvarFrase(dia: number, frase: string, id: number | null = null) {
  const sessao = await getSessao();
  const texto = frase.trim();
  if (!texto) return;
  if (id !== null) {
    if (!ehAdmin(sessao)) throw new Error("Sem permissão");
    await prisma.frase_do_dia.updateMany({ where: { id: BigInt(id), dia }, data: { frase: texto, autor: sessao.nome } });
  } else {
    if ((await prisma.frase_do_dia.count({ where: { dia } })) >= 2) throw new Error("Os dois bilhetes do dia já estão escritos");
    if (await prisma.frase_do_dia.count({ where: { dia, autor: sessao.nome } })) throw new Error("Você já escreveu uma frase hoje");
    await prisma.frase_do_dia.create({ data: { dia, frase: texto, autor: sessao.nome } });
  }
  notificarFrase(texto);
  revalidatePath("/");
}

export async function excluirFrase(id: number) {
  const sessao = await getSessao();
  // só apaga se for o administrador ou o autor daquele bilhete
  await prisma.frase_do_dia.deleteMany({ where: { id: BigInt(id), ...(ehAdmin(sessao) ? {} : { autor: sessao.nome }) } });
  revalidatePath("/");
}
