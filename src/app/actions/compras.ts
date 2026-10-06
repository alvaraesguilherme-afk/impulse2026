"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { acessaCompras } from "@/lib/permissoes";
import { notificarListaCompras } from "@/lib/push";

type ItemNovo = { item: string; quantidadeNum: number | null; quantidadeUnidade: string | null; categoria: string };

async function exigirAcesso() {
  const sessao = await getSessao();
  if (!acessaCompras(sessao)) throw new Error("Sem permissão");
  return sessao;
}

export async function criarLista(listaId: string, itens: ItemNovo[]) {
  const sessao = await exigirAcesso();
  const validos = itens.filter((i) => i.item?.trim() && ["comida", "limpeza"].includes(i.categoria));
  if (validos.length === 0) return;
  // listaId vem do aparelho: reenviar da fila offline não duplica a lista
  const jaExiste = await prisma.lista_compras.findFirst({ where: { lista_id: listaId }, select: { id: true } });
  if (jaExiste) return;
  await prisma.lista_compras.createMany({
    data: validos.map((i) => ({
      item: i.item.trim(),
      quantidade_num: i.quantidadeNum,
      quantidade_unidade: i.quantidadeUnidade?.trim() || null,
      categoria: i.categoria,
      comprado: false,
      criado_por: sessao.nome,
      lista_id: listaId,
    })),
  });
  await notificarListaCompras();
  revalidatePath("/compras");
}

export async function marcarComprado(id: number, comprado: boolean) {
  await exigirAcesso();
  await prisma.lista_compras.updateMany({ where: { id: BigInt(id) }, data: { comprado } });
  revalidatePath("/compras");
}

export async function excluirItem(id: number) {
  await exigirAcesso();
  await prisma.lista_compras.deleteMany({ where: { id: BigInt(id) } });
  revalidatePath("/compras");
}
