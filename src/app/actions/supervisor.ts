"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ABAS_POR_NIVEL, ehSupervisor, podeGerirEquipes } from "@/lib/permissoes";
import { AREAS, AREA_APOIO } from "@/lib/areas";
import { EQUIPES, IDS_EQUIPES } from "@/lib/equipes";
import { notificarAviso } from "@/lib/push";

async function exigirAba(aba: string) {
  const sessao = await getSessao();
  if (!(ABAS_POR_NIVEL[sessao.nivel] ?? []).includes(aba)) throw new Error("Sem permissão");
  return sessao;
}

export async function publicarAviso(texto: string) {
  const sessao = await getSessao();
  if (!ehSupervisor(sessao)) throw new Error("Sem permissão");
  const limpo = texto.trim();
  if (!limpo) return;
  const agora = new Date();
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...o }).format(agora);
  await prisma.avisos.create({
    data: { texto: limpo, data: fmt({ day: "2-digit", month: "2-digit" }), hora: fmt({ hour: "numeric", minute: "2-digit" }) },
  });
  notificarAviso(limpo);
  revalidatePath("/supervisor");
  revalidatePath("/");
}

export async function removerAviso(id: number) {
  const sessao = await getSessao();
  if (!ehSupervisor(sessao)) throw new Error("Sem permissão");
  await prisma.avisos.deleteMany({ where: { id: BigInt(id) } });
  revalidatePath("/supervisor");
  revalidatePath("/");
}

// chave = "<diaIdx>_<turno>_<nome>"; status '' desmarca
export async function marcarChamada(chave: string, status: string, obs: string) {
  await exigirAba("chamada");
  if (!["", "presente", "ausente"].includes(status)) throw new Error("Status inválido");
  const atual = await prisma.chamada.findFirst({ where: { chave }, select: { id: true } });
  if (atual) await prisma.chamada.update({ where: { id: atual.id }, data: { status, obs } });
  else await prisma.chamada.create({ data: { chave, status, obs } });
  revalidatePath("/supervisor");
}

// Equipe do Apoio com menos gente no momento (botão "Aleatório")
export async function equipeComMenosGente() {
  await exigirAba("aprovacoes");
  const linhas = await prisma.staff.groupBy({ by: ["equipe_atribuida"], _count: { _all: true } });
  const contagem = Object.fromEntries(EQUIPES.map((e) => [e.id, 0]));
  for (const l of linhas) if (l.equipe_atribuida && l.equipe_atribuida in contagem) contagem[l.equipe_atribuida] = l._count._all;
  return EQUIPES.reduce((menor, eq) => (contagem[eq.id] < contagem[menor.id] ? eq : menor), EQUIPES[0]).id;
}

export async function salvarGestao(nome: string, areas: string[], equipe: string | null) {
  const sessao = await getSessao();
  if (!podeGerirEquipes(sessao)) throw new Error("Sem permissão");
  const areasValidas = areas.filter((a) => (AREAS as readonly string[]).includes(a));
  const equipeValida = areasValidas.includes(AREA_APOIO) && equipe && (IDS_EQUIPES.includes(equipe) || equipe === "sem_escala") ? equipe : null;
  await prisma.staff.update({
    where: { nome },
    data: { areas_aprovadas: areasValidas, equipe_atribuida: equipeValida, area_pendente: null },
  });
  revalidatePath("/supervisor");
  revalidatePath("/staff");
  revalidatePath("/apoio");
}
