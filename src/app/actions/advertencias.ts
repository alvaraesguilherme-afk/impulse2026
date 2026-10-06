"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ehSupervisor } from "@/lib/permissoes";

export async function criarAluno(nome: string) {
  await getSessao();
  const limpo = nome.trim();
  if (!limpo) return;
  const existe = await prisma.alunos.findFirst({ where: { nome: { equals: limpo, mode: "insensitive" } }, select: { id: true } });
  if (!existe) await prisma.alunos.create({ data: { nome: limpo } });
  revalidatePath("/advertencias");
}

// Qualquer staff registra; fica "aguardando" até um supervisor avaliar
export async function registrarAdvertencia(aluno: string, motivo: string) {
  const sessao = await getSessao();
  if (!aluno.trim()) return;
  await prisma.advertencias.create({
    data: { aluno: aluno.trim(), motivo: motivo.trim() || null, pago: false, status: "aguardando", autor: sessao.nome },
  });
  revalidatePath("/advertencias");
}

export async function avaliarAdvertencia(id: string, status: "confirmada" | "negada") {
  const sessao = await getSessao();
  if (!ehSupervisor(sessao)) throw new Error("Sem permissão");
  if (!["confirmada", "negada"].includes(status)) return;
  await prisma.advertencias.updateMany({ where: { id }, data: { status } });
  revalidatePath("/advertencias");
}

export async function excluirAdvertencia(id: string) {
  const sessao = await getSessao();
  if (!ehSupervisor(sessao)) throw new Error("Sem permissão");
  await prisma.advertencias.deleteMany({ where: { id } });
  revalidatePath("/advertencias");
}

export async function marcarPago(id: string, pago: boolean) {
  await getSessao();
  await prisma.advertencias.updateMany({ where: { id, status: "confirmada" }, data: { pago } });
  revalidatePath("/advertencias");
}
