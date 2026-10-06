"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { coordenaArea } from "@/lib/permissoes";
import { AREA_PROGRAMACAO } from "@/lib/areas";
import { notificarProgramacao } from "@/lib/push";

const TIPOS = ["louvor", "ministro"];

async function exigirCoordenador() {
  const sessao = await getSessao();
  if (!coordenaArea(sessao, AREA_PROGRAMACAO)) throw new Error("Sem permissão");
}

export async function salvarEscala(dia: number, turno: string, tipo: string, titulo: string, tema: string) {
  await exigirCoordenador();
  if (!TIPOS.includes(tipo) || !titulo) return;
  const cadastro = await prisma.programacao_cadastro.findFirst({ where: { tipo, nome: titulo }, select: { membros: true } });
  const dados = {
    titulo,
    membros: tipo === "louvor" ? (cadastro?.membros ?? null) : null,
    tema: tipo === "ministro" ? (tema.trim() || null) : null,
  };
  const atual = await prisma.programacao.findFirst({ where: { dia, turno, tipo }, select: { id: true } });
  if (atual) await prisma.programacao.update({ where: { id: atual.id }, data: dados });
  else await prisma.programacao.create({ data: { dia, turno, tipo, ...dados } });
  notificarProgramacao(titulo);
  revalidatePath("/programacao");
}

export async function limparEscala(dia: number, turno: string, tipo: string) {
  await exigirCoordenador();
  await prisma.programacao.deleteMany({ where: { dia, turno, tipo } });
  revalidatePath("/programacao");
}

export async function adicionarCadastro(tipo: string, nome: string, membros: string) {
  await exigirCoordenador();
  if (!TIPOS.includes(tipo)) return { erro: "Tipo inválido" };
  const nomeFinal = nome.trim() || "Equipe sem nome";
  const existentes = await prisma.programacao_cadastro.findMany({ where: { tipo }, select: { nome: true } });
  if (existentes.some((c) => c.nome.toLowerCase() === nomeFinal.toLowerCase())) return { erro: `"${nomeFinal}" já está cadastrado.` };
  await prisma.programacao_cadastro.create({
    data: { tipo, nome: nomeFinal, membros: tipo === "louvor" ? (membros.trim() || null) : null },
  });
  revalidatePath("/programacao");
  return {};
}

export async function removerCadastro(id: number) {
  await exigirCoordenador();
  await prisma.programacao_cadastro.deleteMany({ where: { id: BigInt(id) } });
  revalidatePath("/programacao");
}
